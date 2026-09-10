"""RAG Engine for Next Wave Summit Joy Assistant.
Performs semantic & keyword retrieval over published public knowledge, formats citations,
deduplicates results, and enforces strict zero-hallucination policy.
"""

import re
from typing import Any, Dict, List, Tuple
from database import get_published_public_chunks, list_speakers

MISSING_KNOWLEDGE_RESPONSE = "I don't have confirmed information for that yet. Please check with the Next Wave Summit organising team."

STOPWORDS = {
    "a", "an", "the", "in", "on", "at", "to", "for", "of", "and", "or", "is", "are", "was",
    "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "what", "where",
    "when", "who", "whom", "which", "why", "how", "can", "could", "would", "should", "tell",
    "me", "about", "please", "joy", "next", "wave", "summit"
}


def _tokenize(text: str) -> List[str]:
    words = re.findall(r'\w+', text.lower())
    return [w for w in words if w not in STOPWORDS and len(w) > 1]


def search_knowledge_base(query: str, top_k: int = 4, target_mode: str = "all") -> List[Dict[str, Any]]:
    """Searches published public document chunks and speaker profiles for query relevance.
    Deduplicates results by text content to prevent repeated chunks from inflating context.
    """
    query_tokens = _tokenize(query)
    if not query_tokens:
        return []

    results = []
    seen_texts = set()  # Deduplicate by normalized text content

    # 1. Search document chunks
    chunks = get_published_public_chunks()
    for chunk in chunks:
        # If target mode is 'speakers', prioritize speaker chunks or category 'speakers'
        if target_mode == "speakers" and chunk.get("category") != "speakers" and not chunk.get("speaker_id"):
            continue

        # Deduplicate by text fingerprint
        text_key = chunk["text"].strip()[:120]
        if text_key in seen_texts:
            continue

        chunk_tokens = _tokenize(chunk["text"])
        title_tokens = _tokenize(chunk["title"])
        category_tokens = _tokenize(chunk["category"])

        score = 0
        for qt in query_tokens:
            score += chunk_tokens.count(qt) * 1.5
            if qt in title_tokens:
                score += 3.0
            if qt in category_tokens:
                score += 2.0
            if any(qt in ct for ct in chunk_tokens):
                score += 0.5

        if score > 0:
            seen_texts.add(text_key)
            results.append({
                "type": "document_chunk",
                "id": chunk["id"],
                "title": chunk["title"],
                "category": chunk["category"],
                "source": chunk["source"],
                "date": chunk.get("date", ""),
                "text": chunk["text"],
                "score": score
            })

    # 2. Search speaker profiles (deduplicated per speaker ID)
    speakers = list_speakers(public_only=True)
    seen_speaker_ids = set()
    for spk in speakers:
        if spk["id"] in seen_speaker_ids:
            continue

        spk_text = f"{spk['full_name']} {spk['role']} {spk['organization']} {spk['short_bio']} {spk['long_background']} {spk['topics']}"
        spk_tokens = _tokenize(spk_text)
        name_tokens = _tokenize(spk["full_name"])

        score = 0
        for qt in query_tokens:
            if qt in name_tokens:
                score += 5.0
            score += spk_tokens.count(qt) * 1.2

        if score > 0:
            seen_speaker_ids.add(spk["id"])
            bio = spk['short_bio'] or spk['long_background'] or "Confirmed speaker at Next Wave Summit."
            formatted_text = f"Speaker Profile: {spk['full_name']} ({spk['role']}, {spk['organization']}). Bio: {bio}. Topics: {spk['topics']}"
            results.append({
                "type": "speaker_profile",
                "id": spk["id"],
                "title": f"Speaker: {spk['full_name']}",
                "category": "speakers",
                "source": "Speaker Library",
                "date": "",
                "text": formatted_text,
                "score": score
            })

    # Sort by score descending, return top_k unique results
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]


def build_rag_context_and_citations(query: str, target_mode: str = "all") -> Tuple[str, List[str], bool]:
    """Builds LLM context string, list of citations, and returns whether valid knowledge was retrieved."""
    matches = search_knowledge_base(query, top_k=4, target_mode=target_mode)

    if not matches:
        return "", [], False

    # Check top match score threshold
    top_score = matches[0]["score"]
    if top_score < 1.0:
        return "", [], False

    context_parts = []
    citations = []
    seen_sources = set()

    for idx, match in enumerate(matches, 1):
        context_parts.append(f"[{idx}] {match['title']} ({match['category']}):\n{match['text']}")

        src = match.get("source") or match.get("title")
        date_str = f", updated {match['date']}" if match.get("date") else ""
        citation_str = f"Source: {src}{date_str}"

        if citation_str not in seen_sources:
            citations.append(citation_str)
            seen_sources.add(citation_str)

    combined_context = "\n\n".join(context_parts)
    return combined_context, citations, True
