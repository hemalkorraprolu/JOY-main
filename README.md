# Next Wave Summit — Official AI Assistant "Joy" & Knowledge Studio

**Joy** is the official AI assistant for the **Next Wave Summit**, serving speakers, attendees, students, organisers, and visitors with verified event knowledge, RAG citations, open-source neural voice synthesis, and zero-hallucination answers.

---

## 🌟 Key Features

1. **Official Summit Experience**:
   - Event Name: **Next Wave Summit**
   - AI Assistant Name: **Joy**
   - Modes: **Ask Joy** (Default Event Q&A), **Speakers** (Speaker Library), **Event Guide** (Schedule, Venue, Registration, Sessions, Policies), and **Interview Mode** (Podcast style).

2. **Knowledge Studio (Organiser Admin Area)**:
   - Password-protected organiser management area.
   - **Event Knowledge Upload**: Supports TXT, MD, PDF, DOCX, PPTX, CSV, XLSX, PNG, and JPG file formats. Extracted text is split into searchable chunks with visibility controls (`public` vs `internal`) and publishing toggles (`published` vs `unpublished`).
   - **Speaker Library**: Organiser profile creator for summit speakers with per-speaker attachments and an empty state (*"No confirmed information yet"*).
   - **Voice Consent Audit Log**: Audit logger ensuring explicit consent before voice style adaptation (OpenVoice V2).
   - **Admin RAG Search Studio**: Query inspector tool for testing retrieval relevance and inspecting matched source chunks.

3. **Zero-Hallucination RAG Architecture**:
   - Queries retrieve published public event chunks before answer generation.
   - Outputs human-readable source citations (e.g. `Source: Event Schedule, updated 12 Sep`).
   - Missing knowledge fallback: *"I don't have confirmed information for that yet. Please check with the Next Wave Summit organising team."*

4. **Open-Source Modular Voice Adapters**:
   - **AI4Bharat IndicF5 Adapter**: Primary GPU TTS adapter for English, Hindi, and Hinglish.
   - **OpenVoice V2 Adapter**: Optional voice style adaptation requiring explicit consent audit logging.
   - **Neutral Edge-TTS Adapter**: Open-source neutral voice fallback (`en-IN-NeerjaNeural`, `hi-IN-SwaraNeural`).

---

## 🔑 Environment Variables Reference

Create a `.env` file in the root directory (or configure in server environment):

```env
# Groq LLM API Key (Handled strictly server-side in backend)
GROQ_API_KEY=gsk_your_groq_api_key_here

# Organiser Secret for Knowledge Studio Authentication
ORGANISER_SECRET=nextwave2026

# Optional Self-Hosted IndicF5 Voice Microservice URL
INDIC_F5_TTS_URL=http://localhost:8000

# Optional OpenVoice V2 Voice Service URL
OPENVOICE_URL=http://localhost:8001
```

---

## 🚀 Running Locally

### 1. Start Backend API Server
```bash
cd backend
python3 -m pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Start Frontend Application
```bash
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🎧 Running Self-Hosted IndicF5 Voice Microservice

To run the open-source **AI4Bharat IndicF5** GPU service locally or on a GPU server (e.g. RunPod / Modal / Docker):

```bash
git clone https://github.com/AI4Bharat/IndicF5.git
cd IndicF5
pip install -r requirements.txt
python3 app.py --port 8000
```
Set `INDIC_F5_TTS_URL=http://localhost:8000` in `.env`. If unconfigured or offline, Joy automatically falls back to the neutral open-source Edge-TTS adapter.

---

## 📚 Knowledge Studio Workflow

1. Click **Knowledge Studio** in the top navigation bar.
2. Enter your organiser secret (Default: `nextwave2026`).
3. **Upload Event Knowledge**: Drag & drop PDF, DOCX, PPTX, XLSX, or images. Set title, category, and source label, then click **Upload & Index**.
4. **Publish/Unpublish**: Toggle visibility of documents using the eye icon. Only published public documents are used by Joy for public answers.
5. **Manage Speakers**: Create empty or filled speaker profiles under the Speaker Library tab.

---

## ☁️ Deployment Instructions

### Frontend (Vercel)
- Root Directory: `./`
- Build Command: `npm run build`
- Output Directory: `dist`

### Backend (Render / Docker)
- Environment: Python 3.10+
- Start Command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
- Environment Variables: Set `GROQ_API_KEY` and `ORGANISER_SECRET`.
