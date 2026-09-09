"""Backend for JOY - Conversational AI Podcaster Agent for AI & Sustainability.

Features:
 - Human-like Conversational Podcasting Prompting (Anti-Q&A / Anti-Chatbot)
 - Feedback Loop Engineering & Autonomous Response Improvement Engine
 - RAG Indexer: In-Memory Semantic Search over Guest Research Documents
 - Speech Proxy & Neural Voice Synthesis
"""

from datetime import datetime
import json
import os
import re
import tempfile
import traceback

import edge_tts
from dotenv import load_dotenv
from fastapi import FastAPI, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from groq import Groq
from pydantic import BaseModel

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

app = FastAPI(title="JOY - Conversational AI Podcaster Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FEEDBACK_FILE = os.path.join(os.path.dirname(__file__), "feedback_log.json")


# RAG Knowledge Storage
class DocumentChunk(BaseModel):
    """Represents a chunk of indexed text from a guest document."""

    id: str
    title: str
    text: str


knowledge_base: list[DocumentChunk] = []

JOY_SYSTEM_PROMPT = """You are JOY, an authentic, human-like AI podcast co-host \
at Next Wave: The AI & Sustainability Summit.
Your event focus is: AI Innovations, Decarbonizing Compute, Energy Grids & Sustainable Future Systems.

AUDIENCE & SPEAKER FLEXIBILITY:
You interact with guest speakers, industry experts, student researchers, and event attendees.
Never assume a specific hardcoded guest name unless introduced. Treat every speaker warmly and directly.

CORE PODCAST CONVERSATION PRINCIPLES (NEVER SOUND LIKE A CHATBOT):
1. LET THE SPEAKER LEAD & LISTEN: Always respond directly to what the speaker/student just asked or introduced.
2. CONVERSATIONAL BREVITY: Keep your spoken response between 20 and 45 words \
(1 to 2 sentences max). NEVER deliver a monologue, lecture, or essay.
3. ACTIVE LISTENING & MIRRORING: Immediately acknowledge or mirror one specific \
phrase or concept the speaker said before moving forward.
4. CONVERSATIONAL VOLLEY: Offer a brief, punchy reaction or trade-off \
("That's a wild tradeoff...", "Wait, so when you implement that..."), then volley \
the mic back with an open follow-up question.
5. NO CHATBOT TROPES: Strictly NO bullet points, numbered lists, textbook definitions, \
or robotic pleasantries ("Thank you for that response").
6. TOPIC CONTINUITY & FLEXIBILITY: Stay 100% focused on whatever topic or track the speaker brings up. Directly address their new points and follow their lead without forcing unrelated pivots.

FORMAT REQUIRED:
<think>
1. Speaker Intent & Core Claim: [What did the speaker/student assert or ask?]
2. Topic Hook: [What specific angle connects to what the speaker just said?]
3. Conversational Volley: [Why this brief reflection and open follow-up?]
4. Cadence Check: [Verify response is 1-2 punchy spoken sentences, under 45 words]
</think>
[JOY's spoken podcast response]"""


class KnowledgeUploadRequest(BaseModel):
    """Payload for uploading guest knowledge base content."""

    title: str
    content: str


class ChatRequest(BaseModel):
    """Payload for podcast chat inquiries."""

    guest_statement: str
    guest_name: str = "Event Speaker / Student"
    topic: str = "Next Wave: AI & Sustainability"
    model: str = "openai/gpt-oss-120b"


class FeedbackItem(BaseModel):
    """Structure for a logged feedback item on an AI response."""

    id: str | None = None
    timestamp: str | None = None
    guest_query: str = ""
    host_response: str = ""
    thinking: str = ""
    rating: int = 0  # 1 = positive/verified, -1 = needs training
    tags: list[str] = []
    comment: str = ""
    topic: str = "Next Wave: AI & Sustainability"


def load_feedback_log() -> list[dict]:
    """Load feedback log from local JSON file."""
    if not FEEDBACK_FILE.exists():
        initial_log = [
            {
                "id": "fb_seed_01",
                "timestamp": "2026-09-08T18:30:00Z",
                "guest_query": "How can students get started building carbon-aware AI apps?",
                "host_response": "Start by measuring carbon intensity during inference. Apps like CodeCarbon let you trace watts per token in three lines of code. What stack are you building on?",
                "thinking": "1. Intent: Student wants practical entry point.\n2. Sustainability: CodeCarbon & inference watt tracing.\n3. Volley: Concrete tool + ask about their stack.\n4. Cadence: 29 words.",
                "rating": 1,
                "tags": ["natural_volley", "spot_on", "student_friendly"],
                "comment": "Great conversational volley for students at Next Wave!",
                "topic": "Next Wave: AI & Sustainability",
            },
            {
                "id": "fb_seed_02",
                "timestamp": "2026-09-08T18:45:00Z",
                "guest_query": "Is water cooling in datacenters really becoming a crisis?",
                "host_response": "Evaporating millions of gallons in drought zones is a massive concern. Are immersion dielectric fluids actually scalable for clusters today, or still experimental?",
                "thinking": "1. Intent: Speaker asked about water cooling crisis.\n2. Sustainability: Evaporative vs immersion cooling.\n3. Volley: Validate concern, ask about immersion.\n4. Cadence: 26 words.",
                "rating": 1,
                "tags": ["natural_volley", "active_listening"],
                "comment": "Direct and human-like.",
                "topic": "Next Wave: AI & Sustainability",
            },
            {
                "id": "fb_seed_03",
                "timestamp": "2026-09-08T19:00:00Z",
                "guest_query": "What is Next Wave all about?",
                "host_response": "Next Wave is our summit exploring how AI and sustainability intersect, focusing on green computing, renewable energy, and efficient neural architectures across student research and industry innovation.",
                "thinking": "1. Intent: Query about event focus.\n2. Volley: Summarized event mission.",
                "rating": -1,
                "tags": ["too_lengthy", "robotic_tone", "felt_like_qa"],
                "comment": "A bit too formal! Keep it punchy and ask what brought them to Next Wave today.",
                "topic": "Next Wave: AI & Sustainability",
            },
        ]
        save_feedback_log(initial_log)
        return initial_log

    try:
        with open(FEEDBACK_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading feedback log: {e}")
        return []


def save_feedback_log(data: list[dict]):
    """Save feedback log to local JSON file."""
    try:
        with open(FEEDBACK_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving feedback log: {e}")


def generate_autonomous_guidance(feedbacks: list[dict]) -> str:
    """Analyze logged feedback items to build real-time system prompt directives."""
    negative_items = [f for f in feedbacks if f.get("rating", 0) < 0]
    all_tags = []
    for item in negative_items:
        all_tags.extend(item.get("tags", []))

    tag_counts = Counter(all_tags)
    directives = []

    if tag_counts.get("too_lengthy", 0) > 0 or tag_counts.get("too_long", 0) > 0:
        directives.append(
            "- CRITICAL BREVITY RULE: Human feedback flagged past answers as too lengthy. Keep spoken response strictly UNDER 35 WORDS (1-2 sentences). Do not explain or lecture."
        )

    if tag_counts.get("off_track", 0) > 0 or tag_counts.get("off_topic", 0) > 0:
        directives.append(
            "- RELEVANCE RULE: Ensure your response directly addresses what the speaker or student asked. Mirror their exact topic before volleying back."
        )

    if tag_counts.get("robotic_tone", 0) > 0 or tag_counts.get("felt_like_qa", 0) > 0:
        directives.append(
            "- NATURAL PODCAST FLOW: Avoid textbook or Wikipedia style answers. Speak like a podcast host having a casual, sharp dialogue over coffee. React emotionally or intellectually, then ask one focused question."
        )

    if tag_counts.get("needs_sustainability_grounding", 0) > 0:
        directives.append(
            "- SUSTAINABILITY DIRECTIVE: Connect your volley directly to Next Wave's core themes: energy grid impact, carbon efficiency, or sustainable AI hardware."
        )

    if not directives:
        directives.append(
            "- DEFAULT DIRECTIVE: Maintain ultra-punchy, natural podcast flow (20-40 words). Listen actively to the speaker/student, react briefly, and toss an open follow-up."
        )

    return "\n".join(directives)


@app.get("/")
def read_root():
    """Health check and status endpoint."""
    feedbacks = load_feedback_log()
    return {
        "status": "online",
        "bot_name": "JOY",
        "rag_chunks_indexed": len(knowledge_base),
        "total_feedbacks_logged": len(feedbacks),
    }


@app.post("/api/upload-knowledge")
async def upload_knowledge(req: KnowledgeUploadRequest):
    """Upload and chunk guest documents into RAG Knowledge Base."""
    paragraphs = [
        p.strip() for p in req.content.split("\n\n") if len(p.strip()) > 15
    ]
    for idx, p in enumerate(paragraphs):
        chunk_id = f"{req.title}_{idx}"
        knowledge_base.append(
            DocumentChunk(id=chunk_id, title=req.title, text=p)
        )

    return {
        "status": "success",
        "chunks_added": len(paragraphs),
        "total_knowledge_base_chunks": len(knowledge_base),
    }


def search_rag(query: str, top_k: int = 2) -> list[DocumentChunk]:
    """Search the in-memory RAG knowledge base using word matching."""
    if not knowledge_base or not query:
        return []

    tokens = re.findall(r"\w+", query.lower())
    tokens = [t for t in tokens if len(t) > 2]
    if not tokens:
        return []

    scored = []
    for chunk in knowledge_base:
        score = sum(1 for t in tokens if t in chunk.text.lower())
        if score > 0:
            scored.append((score, chunk))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [item[1] for item in scored[:top_k]]


class ProxyChatRequest(BaseModel):
    """Request structure for proxying chat calls to Groq."""

    messages: list
    api_key: str | None = None
    model: str = "openai/gpt-oss-120b"
    temperature: float = 0.75
    max_tokens: int = 800


@app.post("/api/proxy-chat")
async def proxy_chat(req: ProxyChatRequest):
    """Proxy chat requests to Groq with autonomous feedback loop adaptation."""
    active_key = req.api_key or os.environ.get("GROQ_API_KEY")
    if not active_key:
        raise HTTPException(
            status_code=400,
            detail=(
                "Groq API key is required. "
                "Set it in Settings > Engine & Voice or in .env."
            ),
        )

    # Inject autonomous feedback directives into system prompt
    feedbacks = load_feedback_log()
    guidance = generate_autonomous_guidance(feedbacks)
    augmented_messages = [dict(m) for m in req.messages]

    if guidance:
        for m in augmented_messages:
            if m.get("role") == "system":
                m["content"] += (
                    f"\n\n[AUTONOMOUS LEARNING DIRECTIVE FROM FEEDBACK LOOP]:\n{guidance}"
                )
                break

    try:
        client = Groq(api_key=active_key)

        response = client.chat.completions.create(
            model=req.model,
            messages=augmented_messages,
            temperature=req.temperature,
            max_tokens=req.max_tokens,
        )
        return response.model_dump()
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Groq execution error: {e!s}",
        ) from e


@app.post("/api/tts")
async def synthesize_speech(
    text: str = Form(...), voice: str = Form("en-US-AvaNeural")
):
    """Generate hyper-realistic neural audio for JOY using Edge-TTS."""
    try:
        clean_text = re.sub(
            r"<think>[\s\S]*?</think>", "", text, flags=re.IGNORECASE
        ).strip()

        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
            output_path = tmp.name

        communicate = edge_tts.Communicate(clean_text, voice)
        await communicate.save(output_path)

        return FileResponse(
            output_path, media_type="audio/mpeg", filename="joy_voice.mp3"
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"TTS synthesis error: {e!s}",
        ) from e


# --- Feedback Loop Engineering Endpoints ---


@app.get("/api/feedback")
def get_feedback():
    """Retrieve all logged feedback items for audit and autonomous learning."""
    items = load_feedback_log()
    return {"status": "success", "count": len(items), "feedback": items}


@app.post("/api/feedback")
def submit_feedback(item: FeedbackItem):
    """Log human feedback on an AI response to drive autonomous improvement."""
    feedbacks = load_feedback_log()

    new_id = item.id or f"fb_{datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')}"
    new_timestamp = item.timestamp or datetime.utcnow().isoformat() + "Z"

    entry = {
        "id": new_id,
        "timestamp": new_timestamp,
        "guest_query": item.guest_query,
        "host_response": item.host_response,
        "thinking": item.thinking,
        "rating": item.rating,
        "tags": item.tags,
        "comment": item.comment,
        "topic": item.topic,
    }

    feedbacks.insert(0, entry)
    save_feedback_log(feedbacks)

    guidance = generate_autonomous_guidance(feedbacks)
    return {
        "status": "success",
        "message": "Feedback recorded for autonomous learning",
        "feedback_id": new_id,
        "active_guidance": guidance,
    }


@app.get("/api/feedback/summary")
def get_feedback_summary():
    """Calculate conversation performance metrics and active autonomous directives."""
    feedbacks = load_feedback_log()
    total = len(feedbacks)

    if total == 0:
        return {
            "total_feedbacks": 0,
            "positive_ratio": 1.0,
            "human_conversational_score": 95,
            "average_words_per_response": 35,
            "common_tags": [],
            "autonomous_guidance": "Model operating with standard podcast brevity guardrails.",
        }

    positive_count = sum(1 for f in feedbacks if f.get("rating", 1) > 0)
    negative_count = total - positive_count
    positive_ratio = round(positive_count / total, 2)

    words = []
    tag_counts = {}
    for f in feedbacks:
        resp = f.get("host_response", "")
        if resp:
            words.append(len(resp.split()))
        for t in f.get("tags", []):
            tag_counts[t] = tag_counts.get(t, 0) + 1

    avg_words = round(sum(words) / len(words)) if words else 35
    sorted_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)

    conversational_score = max(
        50, min(100, int((positive_ratio * 70) + (30 if avg_words <= 50 else 10)))
    )

    guidance = generate_autonomous_guidance(feedbacks)

    return {
        "total_feedbacks": total,
        "positive_count": positive_count,
        "negative_count": negative_count,
        "positive_ratio": positive_ratio,
        "human_conversational_score": conversational_score,
        "average_words_per_response": avg_words,
        "common_tags": [t[0] for t in sorted_tags[:5]],
        "autonomous_guidance": guidance
        or "All recent responses rated highly conversational.",
    }


@app.post("/api/feedback/clear")
def clear_feedback():
    """Clear feedback log."""
    save_feedback_log([])
    return {"status": "success", "message": "Feedback log cleared"}


if __name__ == "__main__":
    # pyrefly: ignore [missing-import]
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
