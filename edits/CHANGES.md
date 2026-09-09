# Project Modifications & Edits Record

This document tracks all changes made to the codebase to configure, fix, and run the JOY AI Voice Podcaster project.

---

## 1. `.env`
- **File**: `/.env`
- **Purpose**: Synchronize frontend Vite environment variable with the backend Groq API key.
- **Diff**:
```diff
--- .env (original)
+++ .env (updated)
@@ -4,3 +4,3 @@
 GROQ_API_KEY=gsk_your_api_key_here
-VITE_GROQ_API_KEY=gsk_your_api_key_here
+VITE_GROQ_API_KEY=gsk_your_api_key_here
```

---

## 2. `backend/requirements.txt`
- **File**: `/backend/requirements.txt`
- **Purpose**: Added `python-dotenv` dependency so backend can load `.env` from the project root.
- **Diff**:
```diff
--- backend/requirements.txt (original)
+++ backend/requirements.txt (updated)
@@ -7,1 +7,2 @@
 groq
+python-dotenv
```

---

## 3. `backend/main.py`
- **File**: `/backend/main.py`
- **Purpose**: Resolved all 26 linting/typing/formatting issues (removed unused imports `asyncio`/`UploadFile`/`File`, added missing class/function docstrings, wrapped lines to PEP 8 limits, converted types to Python 3.10 `str | None` and `list[DocumentChunk]`, lifted `traceback` import to top-level, wrapped `tempfile` in context manager, and enabled `.env` loading with environment fallback for `GROQ_API_KEY`).
- **Diff**:
```diff
--- backend/main.py (original)
+++ backend/main.py (updated)
@@ -1,7 +1,7 @@
-"""
-Backend for JOY - RAG-Powered AI Podcaster Voice Agent
+"""Backend for JOY - RAG-Powered AI Podcaster Voice Agent.
+
 Stack:
- - RAG Indexer: In-Memory Vector / TF-IDF Semantic Search over uploaded Guest Documents
+ - RAG Indexer: In-Memory Vector / TF-IDF Semantic Search over Guest Documents
  - Speech-to-Text: Faster-Whisper (Run locally on CPU/GPU)
  - Reasoning & LLM: Ollama (Llama 3.2 / DeepSeek R1)
  - Text-to-Speech: Edge-TTS (Microsoft Neural Voice - hyper-realistic & free)
@@ -9,15 +9,16 @@
 import os
 import re
 import tempfile
-import asyncio
-from typing import List, Optional
-from fastapi import FastAPI, UploadFile, File, Form, HTTPException
+import traceback
+
+import edge_tts
+from dotenv import load_dotenv
+from fastapi import FastAPI, Form, HTTPException
 from fastapi.middleware.cors import CORSMiddleware
 from fastapi.responses import FileResponse
-from pydantic import BaseModel
-import edge_tts
 from groq import Groq
+from pydantic import BaseModel
 
+load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
+
 app = FastAPI(title="JOY - RAG AI Podcaster Agent Backend")
@@ -30,8 +31,11 @@
     allow_headers=["*"],
 )
 
+
 # RAG Knowledge Storage
 class DocumentChunk(BaseModel):
+    """Represents a chunk of indexed text from a guest document."""
+
     id: str
     title: str
     text: str
@@ -41,1 +45,1 @@
-knowledge_base: List[DocumentChunk] = []
+knowledge_base: list[DocumentChunk] = []
@@ -58,2 +66,8 @@
 class KnowledgeUploadRequest(BaseModel):
+    """Payload for uploading guest knowledge base content."""
+
     title: str
     content: str
 
 class ChatRequest(BaseModel):
+    """Payload for podcast chat inquiries."""
+
     guest_statement: str
@@ -69,1 +83,2 @@
 def read_root():
+    """Health check and status endpoint."""
@@ -86,1 +101,2 @@
-def search_rag(query: str, top_k: int = 2) -> List[DocumentChunk]:
+def search_rag(query: str, top_k: int = 2) -> list[DocumentChunk]:
+    """Search the in-memory RAG knowledge base using word matching."""
@@ -104,2 +120,4 @@
 class ProxyChatRequest(BaseModel):
+    """Request structure for proxying chat calls to Groq."""
+
     messages: list
-    api_key: str
+    api_key: str | None = None
     model: str = "openai/gpt-oss-120b"
@@ -111,4 +129,4 @@
 async def proxy_chat(req: ProxyChatRequest):
-    """Proxies chat requests to Groq to bypass browser CORS limitations."""
-    if not req.api_key:
-        raise HTTPException(status_code=400, detail="Groq API key is required. Set it in Settings > Engine & Voice.")
+    """Proxy chat requests to Groq to bypass browser CORS limitations."""
+    active_key = req.api_key or os.environ.get("GROQ_API_KEY")
+    if not active_key:
+        raise HTTPException(status_code=400, detail="Groq API key is required. Set it in Settings > Engine & Voice or in .env.")
     try:
-        client = Groq(api_key=req.api_key)
+        client = Groq(api_key=active_key)
@@ -134,4 +152,4 @@
     except Exception as e:
-        import traceback
         traceback.print_exc()
-        raise HTTPException(status_code=500, detail=f"Groq execution error: {str(e)}")
+        raise HTTPException(status_code=500, detail=f"Groq execution error: {e!s}") from e
@@ -140,17 +158,16 @@
 async def synthesize_speech(text: str = Form(...), voice: str = Form("en-US-AvaNeural")):
-    """Generates hyper-realistic neural audio for JOY using Edge-TTS."""
+    """Generate hyper-realistic neural audio for JOY using Edge-TTS."""
     try:
-        clean_text = re.sub(r"<think>[\s\S]*?</think>", "", text, flags=re.IGNORECASE).strip()
-        
-        output_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
-        output_path = output_file.name
-        output_file.close()
+        clean_text = re.sub(r"<think>[\s\S]*?</think>", "", text, flags=re.IGNORECASE).strip()
+        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
+            output_path = tmp.name
         communicate = edge_tts.Communicate(clean_text, voice)
         await communicate.save(output_path)
         return FileResponse(output_path, media_type="audio/mpeg", filename="joy_voice.mp3")
     except Exception as e:
-        import traceback
         traceback.print_exc()
-        raise HTTPException(status_code=500, detail=f"TTS synthesis error: {str(e)}")
+        raise HTTPException(status_code=500, detail=f"TTS synthesis error: {e!s}") from e
```

---

## 4. `src/components/AIInterface.jsx`
- **File**: `/src/components/AIInterface.jsx`
- **Purpose**: Auto-initialize the Groq engine and API key from `VITE_GROQ_API_KEY` so users don't have to manually configure settings.
- **Diff**:
```diff
--- src/components/AIInterface.jsx (original)
+++ src/components/AIInterface.jsx (updated)
@@ -58,2 +58,2 @@
-    engine: 'browser',
-    groqApiKey: '',
+    engine: (import.meta.env.VITE_GROQ_API_KEY && !import.meta.env.VITE_GROQ_API_KEY.includes('your_api_key')) ? 'groq' : 'browser',
+    groqApiKey: (import.meta.env.VITE_GROQ_API_KEY && !import.meta.env.VITE_GROQ_API_KEY.includes('your_api_key')) ? import.meta.env.VITE_GROQ_API_KEY : '',
```

---

## 5. `src/components/PodcastStudio.jsx`
- **File**: `/src/components/PodcastStudio.jsx`
- **Purpose**: Ensure default configuration also pulls `VITE_GROQ_API_KEY` and activates `groq` engine when present.
- **Diff**:
```diff
--- src/components/PodcastStudio.jsx (original)
+++ src/components/PodcastStudio.jsx (updated)
@@ -60,2 +60,2 @@
-    engine: 'browser',
-    groqApiKey: '',
+    engine: (import.meta.env.VITE_GROQ_API_KEY && !import.meta.env.VITE_GROQ_API_KEY.includes('your_api_key')) ? 'groq' : 'browser',
+    groqApiKey: (import.meta.env.VITE_GROQ_API_KEY && !import.meta.env.VITE_GROQ_API_KEY.includes('your_api_key')) ? import.meta.env.VITE_GROQ_API_KEY : '',
```

---

## 6. `.vscode/settings.json`
- **File**: `/.vscode/settings.json`
- **Purpose**: Configured VS Code / IDE Python interpreter and analysis paths to point to `backend/venv`, resolving import resolution warnings.
- **Diff**:
```diff
--- /dev/null
+++ .vscode/settings.json
@@ -0,0 +1,6 @@
+{
+  "python.defaultInterpreterPath": "${workspaceFolder}/backend/venv/bin/python",
+  "python.analysis.extraPaths": [
+    "${workspaceFolder}/backend"
+  ]
+}
```

---

## 7. `pyrightconfig.json`
- **File**: `/pyrightconfig.json`
- **Purpose**: Configured Pyright / Pylance type checker to use `backend/venv` and include `backend/` in extraPaths.
- **Diff**:
```diff
--- /dev/null
+++ pyrightconfig.json
@@ -0,0 +1,5 @@
+{
+  "venvPath": "backend",
+  "venv": "venv",
+  "extraPaths": ["backend"]
+}
```

---

## 8. Environment & Runtime Additions
- **`backend/venv/`**: Created Python 3.10 virtual environment and installed backend dependencies (`fastapi`, `uvicorn`, `edge-tts`, `ollama`, `pydantic`, `groq`, `python-dotenv`).
- **`node_modules/`**: Executed `npm install` to install React, Three.js, Lucide, and Vite build tooling.
- **Running Processes**:
  - FastAPI backend running on port 8000.
  - Vite dev server running on port 3000.

---

## 9. `src/services/aiPodcasterAgent.js` — Conversational Podcast Prompt Overhaul
- **File**: `/src/services/aiPodcasterAgent.js`
- **Purpose**: Transformed the system prompt from a generic chatbot template into a strict human-like podcast co-host with enforced brevity, active listening, conversational volleys, and zero chatbot tropes. Ensures each AI turn stays under 55 words.
- **Key Changes**:
  - `_buildSystemPrompt()`: Rewrote to include 5 core podcast rules (brevity 25-55 words, active listening & mirroring, conversational volley, no chatbot tropes, sustainability grounding).
  - Added `<think>` block format requiring: Guest Intent → Sustainability Hook → Conversational Volley → Cadence Check.
  - `_dynamicFallbackGenerator()`: Restructured offline fallback responses to follow podcast cadence (punchy 1-2 sentence reactions + open follow-up question), organized by persona (alex/elena/marcus).
  - `submitFeedback()`, `getFeedbackSummary()`, `getFeedbackList()`: Added methods to send feedback to the backend and retrieve metrics.
- **One-line**: Overhauled AI prompts to enforce podcast-style brevity (25-55 words), active listening, and conversational volleys instead of essay-like Q&A responses.

---

## 10. `src/components/ConversationPanel.jsx` — Reasoning Viewer & Inline Feedback
- **File**: `/src/components/ConversationPanel.jsx`
- **Purpose**: Added a 🧠 "View Reasoning" icon button on every host message to inspect the AI's chain-of-thought, plus thumbs-up/thumbs-down feedback buttons that feed the autonomous learning loop.
- **Key Changes**:
  - Added `Brain`, `Sparkles`, `ThumbsUp`, `ThumbsDown`, `Check` imports from `lucide-react`.
  - `toggleReasoning(msgId)`: Expands/collapses glassmorphism reasoning card showing `<think>` steps.
  - `handleRate(msg, rating)`: Positive rating logs instantly; negative opens a tag selector (Too Long, Felt like Q&A, Robotic, Off-Topic).
  - `handleSelectNegativeTag(msg, tag)`: Submits negative feedback with specific critique tag to backend.
  - Expandable reasoning drawer: Dark glassmorphism card with "Chain-of-Thought & Conversational Intent" header and monospace `<pre>` display.
  - Feedback confirmation: Green "Feedback stored in Feedback Loop. Model adapts autonomously." message after submission.
- **One-line**: Added reasoning inspection icon and thumbs up/down feedback buttons on every host message to let users see AI thinking and train the model.

---

## 11. `src/components/SettingsModal.jsx` — Feedback Loop Engineering Tab
- **File**: `/src/components/SettingsModal.jsx`
- **Purpose**: Added a new ✨ "Feedback Loop Engineering" tab in Studio Settings with autonomous metrics, reasoning audit log, and manual feedback submission form.
- **Key Changes**:
  - New tab: `{ id: 'feedback', label: 'Feedback Loop Engineering', icon: <Sparkles /> }`.
  - **Autonomous Guidance Card**: Shows active AI directives generated from feedback analysis (purple card with Brain icon).
  - **4 Performance Metric Cards**: Podcast Flow Score, Avg Spoken Length (target 25-45 words), Approval Ratio, Total Feedback Items.
  - **Dialogue Turns & Reasoning Audit Stream**: Scrollable list of all feedback items with expandable "View AI Reasoning Behind Answer" cards.
  - **Manual Feedback Submission Form**: Guest statement input, JOY response textarea, rating buttons (Natural Podcast Volley / Needs Improvement), critique tag dropdown, feedback notes field, and submit button.
  - `fetchFeedbackData()`: Fetches `/api/feedback/summary` and `/api/feedback` from backend.
  - `handleManualFeedbackSubmit()`: Posts new feedback to backend API.
- **One-line**: Added Feedback Loop Engineering settings tab with live metrics, reasoning audit viewer, and manual feedback submission to steer autonomous AI improvement.

---

## 12. `backend/main.py` — Feedback API Endpoints & Autonomous Guidance Engine
- **File**: `/backend/main.py`
- **Purpose**: Built the full feedback loop backend: endpoints to log, retrieve, and summarize feedback, plus an autonomous guidance engine that injects reinforcement directives into the LLM system prompt based on feedback patterns.
- **Key Changes**:
  - `FeedbackItem` model: Pydantic model for feedback entries (id, timestamp, guest_query, host_response, thinking, rating, tags, comment, topic).
  - `load_feedback_log()` / `save_feedback_log()`: Read/write feedback to `backend/feedback_log.json`. Seeds 3 example items on first run.
  - `generate_autonomous_guidance()`: Analyzes negative feedback tags (too_long, felt_like_qa, lecture_tone, off_topic) and generates reinforcement directives.
  - `GET /api/feedback`: Returns all logged feedback items.
  - `POST /api/feedback`: Logs new feedback and returns updated autonomous guidance.
  - `GET /api/feedback/summary`: Computes conversational score, avg word count, positive ratio, common tags, and active guidance.
  - `POST /api/feedback/clear`: Resets feedback log.
  - **Autonomous prompt injection in `/api/proxy-chat`**: Before each Groq API call, reads feedback log and injects `[AUTONOMOUS LEARNING DIRECTIVE FROM FEEDBACK LOOP]` into the system message.
  - `JOY_SYSTEM_PROMPT`: Rewrote with podcast conversation rules (brevity, active listening, conversational volley, no chatbot tropes, sustainability grounding) and `<think>` format.
- **One-line**: Built feedback API endpoints and autonomous guidance engine that analyzes user ratings to continuously reinforce podcast-style brevity and prevent robotic Q&A.

---

## 13. `backend/feedback_log.json` — Seed Feedback Data
- **File**: `/backend/feedback_log.json`
- **Purpose**: Pre-seeded feedback log with 3 example entries (2 positive, 1 negative) to demonstrate the feedback loop system and provide initial autonomous guidance.
- **One-line**: Seeded 3 example feedback items showing good podcast flow vs. bad lecture-style responses for the autonomous engine to learn from.

---

## 14. `src/components/AIInterface.jsx` — AI & Sustainability Defaults & Feedback Integration
- **File**: `/src/components/AIInterface.jsx`
- **Purpose**: Updated conference name, topic, guest defaults, and indexed documents to focus on AI & Sustainability. Added `handleFeedbackSubmit()` and wired it to ConversationPanel and SettingsModal.
- **Key Changes**:
  - `DEFAULT_GUESTS`: Dr. Sarah Lin (Carbon-Aware Neural Reasoning) and Prof. Marcus Vance (Clean Energy & Compute Systems).
  - `config.conferenceName`: "Global AI & Sustainability Summit 2026".
  - `config.topic`: "Decarbonizing AI: Clean Grids, Efficient Silicon & Sustainable Computing".
  - `handleFeedbackSubmit()`: Sends feedback to backend via `agentRef.current.submitFeedback()`.
  - Passes `onFeedback`, `transcript`, and `agentRef` props to `ConversationPanel` and `SettingsModal`.
- **One-line**: Aligned all defaults to AI & Sustainability domain and integrated feedback submission into both conversation panel and settings.

---

## 15. `src/components/PodcastStudio.jsx` — Sustainability Defaults & Auto Engine Config
- **File**: `/src/components/PodcastStudio.jsx`
- **Purpose**: Mirrored the same auto-detection of `VITE_GROQ_API_KEY` and sustainability-focused defaults as AIInterface.
- **One-line**: Ensured PodcastStudio also auto-configures Groq engine and sustainability topic defaults from env---

## 17. `backend/main.py` — Next Wave Event Prompt & Speaker-First Logic
- **File**: `/backend/main.py` (lines 51-189)
- **Purpose**: Updated backend system prompt and autonomous guidance engine for **Next Wave: AI & Sustainability**. Configured prompt to support flexible speakers (guests, students, event attendees) and added training critique tags (`off_track`, `too_lengthy`, `needs_sustainability_grounding`, `natural_volley`).
- **One-line**: Configured backend for Next Wave event welcome, flexible student/speaker support, and targeted training verification tags.

---

## 18. `src/services/aiPodcasterAgent.js` — Speaker-First Welcome Flow & Fallback Prompts
- **File**: `/src/services/aiPodcasterAgent.js` (lines 181-330)
- **Purpose**: Rewrote `generateOpening()` to deliver a brief event welcome introducing Next Wave and state that the floor is open for speakers/students to talk first (without assuming a specific hardcoded guest).
- **One-line**: Updated agent opening to give a warm Next Wave event welcome and wait for speakers or students to speak first.

---

## 19. `src/components/ConversationPanel.jsx` — Training Verification Buttons
- **File**: `/src/components/ConversationPanel.jsx` (lines 204-245)
- **Purpose**: Added explicit training critique buttons to every AI turn: "🔴 Off-track or robotic response", "🟡 Feels too lengthy", "🟢 Natural Podcast Volley (Verified)", and "🔵 Needs Sustainability Grounding".
- **One-line**: Added explicit training verification buttons on host messages so model responses can be trained and verified before live deployment.

---

## 20. `src/components/SettingsModal.jsx` & `PersonaBadge.jsx` — Pre-Event Training Suite
- **File**: `/src/components/SettingsModal.jsx` (lines 546-875) & `/src/components/PersonaBadge.jsx` (lines 11-54)
- **Purpose**: Upgraded Feedback Loop Engineering tab to "Next Wave Pre-Event Model Training & Verification Suite" with training controls, active guidance display, and multi-criteria feedback select dropdown.
- **One-line**: Upgraded settings tab into a pre-event model training suite for Next Wave live verification.

---

## 21. `src/components/AIInterface.jsx`, `TopBar.jsx` & `src/index.css` — High-Tech Studio UI Redesign
- **File**: `/src/components/AIInterface.jsx`, `/src/components/TopBar.jsx`, `/src/index.css`
- **Purpose**: Redesigned studio aesthetics with a Cyber Emerald & Obsidian glassmorphism theme, Next Wave event badge, auto-mic start after welcome, and glowing status indicators.
- **One-line**: Redesigned UI with futuristic Next Wave Cyber Emerald aesthetics, glowing visualizers, and auto-mic opening for speakers.umented in edits/ folder with one-line explanations | ✅ Done |
