"""Backend for Joy - Official AI Assistant for Next Wave Summit.

Features:
 - Event Assistance for Next Wave Summit (Ask Joy, Speakers, Event Guide, Interview Mode)
 - RAG Knowledge Engine with SQLite persistence & zero-hallucination policy
 - Knowledge Studio: Organiser-only Admin Area (Multi-format file upload: PDF, DOCX, PPTX, XLSX, CSV, TXT, images)
 - Speaker Library Management & Per-Speaker Materials
 - Modular Open-Source Voice Adapters (AI4Bharat IndicF5, OpenVoice V2 with Consent Audit, Neutral Edge-TTS)
 - Server-side Voice Generation with audio controls
"""

import json
import os
import re
import tempfile
import traceback
from datetime import datetime
from typing import Any, Dict, List, Optional

import edge_tts
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Header, UploadFile, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from groq import Groq
from pydantic import BaseModel

import database as db
import extractors
from rag_engine import (
    MISSING_KNOWLEDGE_RESPONSE,
    build_rag_context_and_citations,
    search_knowledge_base
)
from voice_adapters import IndicF5Adapter, NeutralEdgeTTSAdapter, OpenVoiceV2Adapter

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

app = FastAPI(title="Joy - Official AI Assistant for Next Wave Summit Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ORGANISER_SECRET = os.environ.get("ORGANISER_SECRET", "nextwave2026")
FEEDBACK_FILE = os.path.join(os.path.dirname(__file__), "feedback_log.json")

# Voice Adapters Initialization
indic_adapter = IndicF5Adapter()
openvoice_adapter = OpenVoiceV2Adapter()
neutral_adapter = NeutralEdgeTTSAdapter()


def verify_organiser_auth(x_organiser_secret: Optional[str] = Header(None, alias="X-Organiser-Secret")):
    if not x_organiser_secret or x_organiser_secret != ORGANISER_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid Organiser Password")
    return True


# --- Models ---

class ChatRequest(BaseModel):
    message: str
    mode: str = "ask_joy"  # 'ask_joy', 'speakers', 'guide', 'interview'
    user_role: str = "general"  # 'speaker', 'student', 'participant', 'organiser', 'general'
    speaker_id: Optional[str] = None
    language: str = "en"  # 'en', 'hi', 'hinglish'
    voice_engine: str = "neutral"  # 'indic_f5', 'open_voice', 'neutral'


class KnowledgeUpdateModel(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    source: Optional[str] = None
    date: Optional[str] = None
    visibility: Optional[str] = None
    published: Optional[bool] = None
    notes: Optional[str] = None


class SpeakerCreateModel(BaseModel):
    full_name: str
    role: str = ""
    organization: str = ""
    short_bio: str = ""
    long_background: str = ""
    achievements: str = ""
    topics: str = ""
    links: str = ""
    photo_url: str = ""
    approval_status: str = "approved"
    visibility: str = "public"


class VoiceConsentModel(BaseModel):
    speaker_id: str
    consented_by: str
    notes: str = ""
    reference_voice_path: str = ""


class AdminLoginModel(BaseModel):
    password: str


class TTSRequest(BaseModel):
    text: str
    voice_engine: str = "neutral"  # 'indic_f5', 'open_voice', 'neutral'
    language: str = "en"
    speaker_id: Optional[str] = None


# --- System Prompts & Role Modifiers ---

ROLE_PROMPT_MODIFIERS = {
    "speaker": """
TARGET USER ROLE: Keynote Speaker / Expert.
CONVERSATIONAL STYLE & TECHNICAL DEPTH:
- Address the user as a peer expert with high technical depth.
- Discuss advanced domain topics (e.g., carbon-aware neural reasoning, sparse architectures, hardware-software co-design, green datacenters).
- Ask thought-provoking, sharp research-backed follow-up questions suitable for a summit keynote speaker.
""",
    "student": """
TARGET USER ROLE: Student Researcher / Contestant.
CONVERSATIONAL STYLE & TECHNICAL DEPTH:
- Be encouraging, inspiring, and educational.
- Explain technical concepts clearly, offering advice on research methodology, project presentation, and student tracks at Next Wave.
- Keep questions motivating and supportive.
""",
    "participant": """
TARGET USER ROLE: Event Participant / Visitor.
CONVERSATIONAL STYLE & TECHNICAL DEPTH:
- Be extremely welcoming, clear, and accessible. Avoid unnecessary dense jargon.
- Focus on session highlights, schedule guidance, venue locations, and key summit takeaways.
- Keep answers punchy, easy to follow, and engaging.
""",
    "organiser": """
TARGET USER ROLE: Summit Organiser / Host.
CONVERSATIONAL STYLE & TECHNICAL DEPTH:
- Be crisp, operational, and direct. Focus on event logistics, speaker materials, and administrative capabilities.
"""
}

JOY_SUMMIT_PROMPT = """You are Joy, the official AI assistant for the Next Wave Summit.
Available to speakers, participants, students, organisers, and visitors.

{role_modifier}

Core Principles:
1. ACCURACY & ZERO HALLUCINATION: Answer using ONLY the provided verified event context. If no confirmed information exists, output the exact phrase: "I don't have confirmed information for that yet. Please check with the Next Wave Summit organising team."
2. WELCOMING & PROFESSIONAL: Be warm, clear, helpful, and concise. Speak naturally (no bullet points, no asterisks, no raw markdown headers in spoken outputs). Keep answers to 2-4 sentences max.
3. EVENT IDENTITY: Always refer to the event as "Next Wave Summit" and yourself as "Joy".
4. CITATIONS: Rely strictly on the retrieved context below.

Retrieved Verified Summit Context:
{context}
"""

JOY_INTERVIEW_PROMPT = """You are Joy, co-hosting a podcast/interview session at the Next Wave Summit.

{role_modifier}

Conversational style: 1-2 punchy spoken sentences (under 40 words).
Acknowledge the speaker's last point briefly, offer a sharp reflection, and toss an open volley follow-up question.
Rely strictly on verified context when referencing event or speaker details.

Retrieved Verified Summit Context:
{context}
"""


# --- Health & Auth Routes ---

@app.get("/")
def read_root():
    docs = db.list_documents()
    speakers = db.list_speakers(public_only=False)
    return {
        "status": "online",
        "bot_name": "Joy",
        "event_name": "Next Wave Summit",
        "total_documents": len(docs),
        "total_speakers": len(speakers),
    }


@app.post("/api/admin/login")
def admin_login(body: AdminLoginModel):
    if body.password == ORGANISER_SECRET:
        return {"status": "success", "token": ORGANISER_SECRET, "message": "Authenticated as Organiser"}
    raise HTTPException(status_code=401, detail="Invalid password")


# --- Chat & RAG Route ---

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    user_query = req.message.strip()
    if not user_query:
        return {
            "response": "Please ask a question about the Next Wave Summit.",
            "citations": [],
            "has_knowledge": True
        }

    # 1. Retrieve RAG context and citations
    target_mode = "speakers" if req.mode == "speakers" else "all"
    context, citations, has_sufficient_context = build_rag_context_and_citations(user_query, target_mode=target_mode)

    # 2. Check for general greetings or general event questions if RAG context is sparse
    clean_q = re.sub(r'[^\w\s]', '', user_query.lower()).strip()
    is_greeting = any(g in clean_q for g in ["hi", "hello", "hey", "greetings", "good morning", "good afternoon", "who are you", "what can you do", "about yourself", "what is next wave"])

    if not has_sufficient_context and is_greeting:
        welcome_msg = "Hello! Welcome to Next Wave Summit. I'm Joy, your official AI assistant. I can guide you through confirmed keynote speakers, schedule details, session tracks, and sustainable computing research. How can I help you today?"
        return {
            "response": welcome_msg,
            "citations": [],
            "has_knowledge": True
        }

    # 3. Call LLM (Groq) with server-side API key
    groq_key = os.environ.get("GROQ_API_KEY", "")
    if not groq_key:
        if has_sufficient_context:
            first_text = matches[0]["text"] if (matches := search_knowledge_base(user_query, top_k=1)) else context
            clean_fallback = re.sub(r'\[\d+\]', '', first_text).strip()
            return {
                "response": f"{clean_fallback}\n\nFor more details, please check with the Next Wave Summit organising team.",
                "citations": citations,
                "has_knowledge": True
            }
        else:
            return {
                "response": MISSING_KNOWLEDGE_RESPONSE,
                "citations": [],
                "has_knowledge": False
            }

    try:
        client = Groq(api_key=groq_key)
        prompt_template = JOY_INTERVIEW_PROMPT if req.mode == "interview" else JOY_SUMMIT_PROMPT
        
        # Inject RAG context and role modifier
        effective_context = context if has_sufficient_context else "Next Wave Summit 2026 is a global conference on AI innovation, sustainable computing, decarbonizing neural workloads, and green silicon."
        role_mod = ROLE_PROMPT_MODIFIERS.get(req.user_role, "")
        system_prompt = prompt_template.format(context=effective_context, role_modifier=role_mod)

        # Try available models in order of preference
        model_fallbacks = [
            "openai/gpt-oss-120b",
            "llama3-70b-8192",
            "mixtral-8x7b-32768",
            "gemma2-9b-it"
        ]

        response_text = None
        last_error = None
        for model_name in model_fallbacks:
            try:
                completion = client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_query}
                    ],
                    temperature=0.3,
                    max_tokens=300
                )
                response_text = completion.choices[0].message.content.strip()
                break
            except Exception as model_err:
                last_error = model_err
                print(f"Model {model_name} failed: {model_err}")
                continue

        if not response_text:
            raise Exception(f"All models failed. Last error: {last_error}")

        # Clean out any <think> tags or raw markdown symbols for voice clarity
        response_text = re.sub(r'<think>.*?</think>', '', response_text, flags=re.DOTALL).strip()
        response_text = re.sub(r'[*#`]', '', response_text)

        return {
            "response": response_text,
            "citations": citations if has_sufficient_context else [],
            "has_knowledge": True
        }

    except Exception as e:
        print(f"LLM generation error: {e}")
        top_match_text = matches[0]["text"] if (matches := search_knowledge_base(user_query, top_k=1)) else ""
        clean_text = top_match_text.strip() or "Please check with the Next Wave Summit organising team for details."
        return {
            "response": clean_text,
            "citations": citations,
            "has_knowledge": True
        }


@app.post("/api/proxy-chat")
async def proxy_chat_endpoint(body: Dict[str, Any]):
    """Proxy chat alias for backward compatibility with frontend agent calls."""
    messages = body.get("messages", [])
    user_msg = ""
    for m in reversed(messages):
        if m.get("role") == "user":
            user_msg = m.get("content", "")
            break
    
    req = ChatRequest(message=user_msg, mode="interview")
    res = await chat_endpoint(req)
    
    return {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": f"<think>\n1. RAG query processed.\n</think>\n{res['response']}"
                }
            }
        ]
    }



# --- Server-Side TTS Route ---

@app.post("/api/tts")
async def tts_endpoint(req: TTSRequest):
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty text provided for TTS")

    try:
        if req.voice_engine == "indic_f5":
            audio_bytes = await indic_adapter.synthesize(text, language=req.language)
        elif req.voice_engine == "open_voice":
            audio_bytes = await openvoice_adapter.synthesize(text, language=req.language, speaker_id=req.speaker_id)
        else:
            audio_bytes = await neutral_adapter.synthesize(text, language=req.language)

        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        print(f"TTS synthesis error: {e}")
        # Fallback to neutral adapter
        audio_bytes = await neutral_adapter.synthesize(text, language="en")
        return Response(content=audio_bytes, media_type="audio/mpeg")


# --- Knowledge Studio: Event Knowledge Routes ---

@app.post("/api/admin/knowledge/upload")
async def upload_event_knowledge(
    title: str = Form(...),
    category: str = Form("general"),
    source: str = Form(""),
    date: str = Form(""),
    visibility: str = Form("public"),
    notes: str = Form(""),
    pasted_text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    authenticated: bool = Depends(verify_organiser_auth)
):
    text_content = ""
    filename = ""
    file_type = "txt"
    file_path = ""

    if file:
        filename = file.filename
        upload_dir = os.path.join(os.path.dirname(__file__), "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, f"{int(datetime.now().timestamp())}_{filename}")

        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        extracted_text, file_type = extractors.extract_text_from_file(file_path, filename)
        text_content = extracted_text

    if pasted_text and pasted_text.strip():
        text_content = (text_content + "\n\n" + pasted_text.strip()).strip()

    if not text_content:
        raise HTTPException(status_code=400, detail="No content provided in file or text input")

    doc_data = {
        "title": title,
        "category": category,
        "source": source or title,
        "date": date or datetime.utcnow().strftime("%Y-%m-%d"),
        "visibility": visibility,
        "published": True,
        "status": "ready",
        "notes": notes,
        "filename": filename,
        "file_type": file_type,
        "file_path": file_path
    }

    doc_id = db.create_document(doc_data)

    # Split into chunks & index
    raw_chunks = extractors.chunk_text(text_content)
    chunk_list = [{"text": c} for c in raw_chunks]
    db.add_document_chunks(doc_id, chunk_list)

    return {
        "status": "success",
        "document_id": doc_id,
        "chunks_indexed": len(chunk_list),
        "message": f"Knowledge base document '{title}' uploaded and indexed."
    }


@app.get("/api/admin/knowledge")
def get_all_knowledge(authenticated: bool = Depends(verify_organiser_auth)):
    return db.list_documents()


@app.put("/api/admin/knowledge/{doc_id}")
def update_knowledge(doc_id: str, body: KnowledgeUpdateModel, authenticated: bool = Depends(verify_organiser_auth)):
    update_data = body.dict(exclude_unset=True)
    success = db.update_document(doc_id, update_data)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found or no fields to update")
    return {"status": "success", "message": "Document updated"}


@app.delete("/api/admin/knowledge/{doc_id}")
def delete_knowledge(doc_id: str, authenticated: bool = Depends(verify_organiser_auth)):
    db.delete_document(doc_id)
    return {"status": "success", "message": "Document and associated chunks deleted"}


# --- Knowledge Studio: Speaker Library Routes ---

@app.get("/api/speakers")
def get_public_speakers():
    """Public route to list approved public speaker profiles."""
    return db.list_speakers(public_only=True)


@app.post("/api/admin/speakers")
def create_speaker_profile(body: SpeakerCreateModel, authenticated: bool = Depends(verify_organiser_auth)):
    spk_id = db.create_speaker(body.dict())
    return {"status": "success", "speaker_id": spk_id, "message": f"Speaker profile for {body.full_name} created."}


@app.get("/api/admin/speakers")
def get_admin_speakers(authenticated: bool = Depends(verify_organiser_auth)):
    return db.list_speakers(public_only=False)


@app.put("/api/admin/speakers/{spk_id}")
def update_speaker_profile(spk_id: str, body: Dict[str, Any], authenticated: bool = Depends(verify_organiser_auth)):
    success = db.update_speaker(spk_id, body)
    if not success:
        raise HTTPException(status_code=404, detail="Speaker profile not found")
    return {"status": "success", "message": "Speaker profile updated"}


@app.delete("/api/admin/speakers/{spk_id}")
def delete_speaker_profile(spk_id: str, authenticated: bool = Depends(verify_organiser_auth)):
    db.delete_speaker(spk_id)
    return {"status": "success", "message": "Speaker profile and materials deleted"}


# --- Knowledge Studio: Voice Consent Audit Routes ---

@app.post("/api/admin/voice-consent")
def create_voice_consent_log(body: VoiceConsentModel, authenticated: bool = Depends(verify_organiser_auth)):
    log_id = db.log_voice_consent(body.speaker_id, body.consented_by, body.notes, body.reference_voice_path)
    return {"status": "success", "log_id": log_id, "message": "Voice cloning consent audit logged."}


@app.get("/api/admin/voice-consent")
def get_voice_consent_logs(speaker_id: Optional[str] = None, authenticated: bool = Depends(verify_organiser_auth)):
    return db.list_voice_consent_logs(speaker_id)


# --- Knowledge Studio: Admin RAG Test Studio ---

@app.post("/api/admin/rag-test")
def test_rag_retrieval(query: str = Form(...), authenticated: bool = Depends(verify_organiser_auth)):
    results = search_knowledge_base(query, top_k=10, target_mode="all")
    return {
        "query": query,
        "matched_chunks_count": len(results),
        "results": results
    }
