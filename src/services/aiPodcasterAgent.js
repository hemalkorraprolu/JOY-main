/**
 * AI Voice Podcaster Agent Service - JOY (RAG Powered, Next Wave Summit AI Assistant)
 *
 * Features:
 *  - RAG Knowledge Base indexing with per-guest document tagging
 *  - Multi-guest context tracking and active speaker identification
 *  - Multi-persona host system prompts (Alex, Elena, Marcus)
 *  - Direct integration with backend /api/chat RAG & Groq fallback chain
 */

import { HOST_PERSONAS } from '../components/PersonaBadge';
import { getApiUrl } from './apiClient';

export class RAGKnowledgeBase {
  constructor() {
    this.chunks = [];
  }

  addDocument(title, content, { isSpokenTurn = false, guestId = null } = {}) {
    if (!content || !content.trim()) return;

    const rawParagraphs = content.split(/\n\s*\n|\.\s+/);
    let chunkId = 0;

    rawParagraphs.forEach(p => {
      const trimmed = p.trim();
      if (trimmed.length > 15) {
        this.chunks.push({
          id: `${title}_${chunkId++}`,
          source: title,
          isSpokenTurn,
          guestId,
          text: trimmed,
          tokens: this._tokenize(trimmed)
        });
      }
    });
  }

  search(query, topK = 3) {
    if (this.chunks.length === 0 || !query || !query.trim()) return [];

    const queryTokens = this._tokenize(query);
    if (queryTokens.length === 0) return [];

    const scored = this.chunks
      .filter(chunk => !chunk.isSpokenTurn)
      .map(chunk => {
        let score = 0;
        queryTokens.forEach(qt => {
          if (chunk.tokens.includes(qt)) {
            score += 1;
          }
        });
        const normalizedScore = score / Math.sqrt(chunk.tokens.length + 1);
        return { chunk, score: normalizedScore };
      });

    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(item => item.chunk);
  }

  _tokenize(text) {
    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }
}


export class AIPodcasterAgent {
  constructor(config = {}) {
    this.conferenceName = config.conferenceName || "Next Wave Summit";
    this.topic = config.topic || "Decarbonizing AI: Clean Grids, Efficient Silicon & Sustainable Computing";

    this.guests = config.guests || [];
    this.hostPersonaId = config.hostPersonaId || 'alex';
    this.userRole = config.userRole || 'general';

    this.ragKB = new RAGKnowledgeBase();
    this.history = [];
    this.usedTemplates = new Set();

    const savedGroqKey = typeof localStorage !== 'undefined' ? localStorage.getItem('joy_groq_api_key') : null;
    const activeKey = config.groqApiKey || savedGroqKey || import.meta.env.VITE_GROQ_API_KEY || "";
    
    this.groqApiKey = (activeKey && !activeKey.includes('your_api_key')) ? activeKey : "";
    this.engine = config.engine || "groq";

    this._indexGuestBios();
  }

  _indexGuestBios() {
    this.guests.forEach(guest => {
      if (guest.bio) {
        this.ragKB.addDocument(`${guest.name} Bio`, guest.bio, { guestId: guest.id });
      }
    });
  }

  setEngineConfig({ engine, groqApiKey, topic, conferenceName, userRole }) {
    if (engine) this.engine = engine;
    if (groqApiKey !== undefined) {
      this.groqApiKey = groqApiKey;
      if (typeof localStorage !== 'undefined' && groqApiKey) {
        localStorage.setItem('joy_groq_api_key', groqApiKey);
      }
    }
    if (topic) this.topic = topic;
    if (conferenceName) this.conferenceName = conferenceName;
    if (userRole) this.userRole = userRole;
  }

  setUserRole(role) {
    this.userRole = role;
  }

  setGuests(guests) {
    const newGuests = guests.filter(g => !this.guests.find(og => og.id === g.id));
    this.guests = guests;

    newGuests.forEach(guest => {
      if (guest.bio) {
        this.ragKB.addDocument(`${guest.name} Bio`, guest.bio, { guestId: guest.id });
      }
    });
  }

  setHostPersona(personaId) {
    this.hostPersonaId = personaId;
  }

  uploadKnowledgeDocument(sourceTitle, textContent, guestId = null) {
    this.ragKB.addDocument(sourceTitle, textContent, { guestId });
  }

  _getPersona() {
    return HOST_PERSONAS[this.hostPersonaId] || HOST_PERSONAS.alex;
  }

  async generateOpening(guestId = null) {
    const activeGuest = (guestId ? this.guests.find(g => g.id === guestId) : null) || this.guests[0];
    const guestName = activeGuest ? activeGuest.name : '';

    let defaultOpeningText = `Welcome to Next Wave Summit! I'm Joy, your official AI assistant. To help me tailor our conversation, tell me: are you a Keynote Speaker, Student Researcher, Event Participant, or Visitor today?`;

    try {
      const chatUrl = getApiUrl('/api/chat');
      const res = await fetch(chatUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: guestName ? `Generate a warm 2-sentence opening for speaker ${guestName}` : `Welcome user to Next Wave Summit and ask if they are a speaker, student, participant, or visitor`,
          mode: "interview",
          user_role: this.userRole
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.response && data.response.length > 15) {
          return {
            thinking: `1. Intent: Event Opening & Role Selection Inquiry.\n2. Persona: ${this._getPersona().name}.\n3. Action: Greet user and inquire about their role.`,
            spokenResponse: data.response,
            citations: data.citations || []
          };
        }
      }
    } catch (err) {
      console.warn("Backend chat API error during intro generation:", err);
    }

    return {
      thinking: `1. Intent: Default Event Welcome.\n2. Action: Greet attendee at Next Wave Summit and ask their role.`,
      spokenResponse: defaultOpeningText,
      citations: []
    };
  }

  async respondToGuest(guestStatement, guestId = null) {
    const guest = guestId ? this.guests.find(g => g.id === guestId) : null;
    const guestName = guest ? guest.name : 'User';

    this.history.push({ role: "guest", content: guestStatement, guestName });

    const retrievedChunks = this.ragKB.search(guestStatement, 2);

    try {
      const chatUrl = getApiUrl('/api/chat');
      const res = await fetch(chatUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: guestStatement,
          mode: "interview",
          user_role: this.userRole
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.response) {
          const thinking = `1. Intent Analysis: Speaker asked about "${guestStatement.substring(0, 45)}...".\n2. Grounding: RAG context applied.\n3. Volley: Synthesized conversational follow-up.`;
          this.history.push({ role: "host", content: data.response });

          return {
            thinking,
            spokenResponse: data.response,
            citations: data.citations || [],
            retrievedChunks
          };
        }
      }
    } catch (err) {
      console.warn("Backend chat endpoint call failed, using dynamic fallback:", err);
    }

    const fallback = this._dynamicFallbackGenerator(guestStatement);
    this.history.push({ role: "host", content: fallback.spokenResponse });

    return {
      ...fallback,
      citations: [],
      retrievedChunks
    };
  }

  _dynamicFallbackGenerator(cleanMessage) {
    const lower = cleanMessage.toLowerCase();
    let thinking = "";
    let spokenResponse = "";

    if (lower.includes("about yourself") || lower.includes("who are you") || lower.includes("tell me about you") || lower.includes("who is joy") || lower.includes("what can you do")) {
      thinking = `1. Intent: Host intro.\n2. Action: Introduce Joy for Next Wave Summit.`;
      spokenResponse = `Welcome to Next Wave Summit! I'm Joy, your official AI assistant. I can guide you through confirmed speakers, schedule details, session topics, and sustainable AI research. What would you like to know?`;
    } else if (lower.includes("speaker") || lower.includes("who is speaking") || lower.includes("keynote")) {
      thinking = `1. Intent: Speaker query.\n2. Action: Provide speaker overview.`;
      spokenResponse = `Next Wave Summit features world-class leaders in AI & Sustainability, including keynotes on carbon-aware neural computing and clean energy datacenters. Which speaker or topic would you like to explore?`;
    } else if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
      thinking = `1. Intent: Friendly greeting.\n2. Action: Warm welcome.`;
      spokenResponse = `Hello! Welcome to Next Wave Summit. How can I help you with our sessions, schedule, or speakers today?`;
    } else {
      thinking = `1. Intent: General query.\n2. Action: Contextual answer for Next Wave Summit.`;
      spokenResponse = `That's a great point regarding "${cleanMessage.substring(0, 50)}"! How can I help connect that to the sessions or research at Next Wave Summit?`;
    }

    return { thinking, spokenResponse };
  }

  async submitFeedback(feedbackData) {
    try {
      const res = await fetch(getApiUrl('/api/feedback'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feedbackData)
      });
      return await res.json();
    } catch (err) {
      console.warn("Feedback submission error:", err);
      return null;
    }
  }
}
