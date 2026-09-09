/**
 * AI Voice Podcaster Agent Service - JOY (RAG Powered, Multi-Guest, Multi-Persona)
 *
 * Features:
 *  - RAG Knowledge Base indexing with per-guest document tagging
 *  - Multi-guest context tracking and active speaker identification
 *  - Multi-persona host system prompts (Alex, Elena, Marcus)
 *  - Intent analysis, zero repetition, and dynamic question synthesis
 */

import { HOST_PERSONAS } from '../components/PersonaBadge';

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
    this.conferenceName = config.conferenceName || "Global AI & Sustainability Summit 2026";
    this.topic = config.topic || "Decarbonizing AI: Clean Grids, Efficient Silicon & Sustainable Computing";

    // Multi-guest support
    this.guests = config.guests || [];

    // Host persona
    this.hostPersonaId = config.hostPersonaId || 'alex';

    this.ragKB = new RAGKnowledgeBase();
    this.history = [];
    this.usedTemplates = new Set();

    this.engine = config.engine || "browser";
    this.groqApiKey = config.groqApiKey || import.meta.env.VITE_GROQ_API_KEY || "";
    this.ollamaModel = config.ollamaModel || "llama3.2";
    this.ollamaUrl = config.ollamaUrl || "http://localhost:11434";

    // Index initial guest bios
    this._indexGuestBios();
  }

  /**
   * Index all guest bios into the RAG knowledge base.
   */
  _indexGuestBios() {
    this.guests.forEach(guest => {
      if (guest.bio) {
        this.ragKB.addDocument(`${guest.name} Bio`, guest.bio, { guestId: guest.id });
      }
    });
  }

  setEngineConfig({ engine, groqApiKey, ollamaModel, ollamaUrl, topic, conferenceName }) {
    if (engine) this.engine = engine;
    if (groqApiKey !== undefined) this.groqApiKey = groqApiKey;
    if (ollamaModel) this.ollamaModel = ollamaModel;
    if (ollamaUrl) this.ollamaUrl = ollamaUrl;
    if (topic) this.topic = topic;
    if (conferenceName) this.conferenceName = conferenceName;
  }

  /**
   * Update guests list and index any new bios.
   */
  setGuests(guests) {
    const newGuests = guests.filter(g => !this.guests.find(og => og.id === g.id));
    this.guests = guests;

    // Index bios for newly added guests
    newGuests.forEach(guest => {
      if (guest.bio) {
        this.ragKB.addDocument(`${guest.name} Bio`, guest.bio, { guestId: guest.id });
      }
    });
  }

  setHostPersona(personaId) {
    this.hostPersonaId = personaId;
  }

  /**
   * Upload a knowledge document, optionally tagged to a specific guest.
   */
  uploadKnowledgeDocument(sourceTitle, textContent, guestId = null) {
    this.ragKB.addDocument(sourceTitle, textContent, { guestId });
  }

  /**
   * Get the active host persona config.
   */
  _getPersona() {
    return HOST_PERSONAS[this.hostPersonaId] || HOST_PERSONAS.alex;
  }

  /**
   * Build the guest context string for system prompts.
   */
  _buildGuestContext() {
    if (this.guests.length === 0) return "Open floor for guest speakers, student researchers, and event attendees.";

    return this.guests.map(g =>
      `- ${g.name} (${g.role})${g.bio ? ': ' + g.bio.substring(0, 120) : ''}`
    ).join('\n');
  }

  /**
   * Get guest by ID.
   */
  _getGuest(guestId) {
    return this.guests.find(g => g.id === guestId);
  }

  /**
   * Build the system prompt incorporating persona, podcast conversation rules, and guest context.
   */
  _buildSystemPrompt(additionalContext = '') {
    const persona = this._getPersona();
    const guestContext = this._buildGuestContext();

    return `You are JOY, an authentic, human-like AI podcast co-host at ${this.conferenceName}.
Topic Context: ${this.topic}

${persona.systemPromptFlavor}

EVENT AUDIENCE & PARTICIPANTS:
${guestContext}
Speakers can be guest experts, student researchers, or audience members asking questions at Next Wave.

${additionalContext ? `ADDITIONAL CONTEXT:\n${additionalContext}\n` : ''}
CORE PODCAST CONVERSATION RULES (NEVER SOUND LIKE A CHATBOT):
1. LISTEN & RESPOND TO SPEAKER FIRST: Address whatever the speaker or student just introduced.
2. CONVERSATIONAL BREVITY: Keep your spoken response strictly between 20 and 45 words (1 to 2 sentences max). NEVER deliver a monologue or lecture.
3. ACTIVE LISTENING & MIRRORING: Immediately acknowledge or mirror one specific phrase or concept the speaker said.
4. CONVERSATIONAL VOLLEY: Offer a brief reaction or trade-off, then volley the mic back with an open follow-up question.
5. NO CHATBOT TROPES: Strictly NO bullet points, numbered lists, textbook definitions, or robotic pleasantries.
6. TOPIC CONTINUITY & FLEXIBILITY: Stay 100% focused on whatever topic or track the speaker brings up. Directly address their new points and follow their lead without forcing unrelated pivots.

FORMAT REQUIRED:
<think>
1. Speaker Intent & Core Claim: [What did the speaker/student assert or ask?]
2. Topic Hook: [What specific angle connects to what the speaker just said?]
3. Conversational Volley: [Why this brief reflection and open follow-up?]
4. Cadence Check: [Verify response is 1-2 punchy spoken sentences, under 45 words]
</think>
[JOY's spoken podcast response]`;
  }

  async generateOpening() {
    const prompt = `Generate a brief, warm event welcome for Next Wave (${this.conferenceName}).
Instructions:
1. Provide a brief, engaging 1-sentence introduction to the event.
2. Warmly ask the speaker or guest to suggest a question, introduce their topic, or share any doubts they may have.
3. Keep the entire opening conversational and brief (2 sentences max, ~35 words).
4. Do NOT ask a specific pre-set question or assume a hardcoded guest topic—let the speaker suggest their question or doubt first.
5. Include <think>...</think> reasoning steps.`;

    return await this._processLLMRequest([
      { role: "system", content: this._buildSystemPrompt() },
      { role: "user", content: prompt }
    ]);
  }

  /**
   * Process a guest's spoken statement and generate JOY's response.
   *
   * @param {string} guestStatement — what the guest said
   * @param {string} guestId — ID of the speaking guest
   */
  async respondToGuest(guestStatement, guestId = null) {
    const guest = guestId ? this._getGuest(guestId) : null;
    const guestName = guest ? guest.name : 'Guest';

    this.history.push({ role: "guest", content: guestStatement, guestName });

    const retrievedChunks = this.ragKB.search(guestStatement, 2);
    this.ragKB.addDocument(`Turn_${this.history.length}`, guestStatement, {
      isSpokenTurn: true,
      guestId
    });

    const ragContext = retrievedChunks.length > 0
      ? retrievedChunks.map(c => `[${c.source}]: ${c.text}`).join('; ')
      : 'No matching documents found.';

    const response = await this._processLLMRequest([
      {
        role: "system",
        content: this._buildSystemPrompt(`RAG Retrieved Context: ${ragContext}`)
      },
      ...this.history.map(m => ({
        role: m.role === 'guest' ? 'user' : 'assistant',
        content: m.guestName
          ? `[${m.guestName}]: ${m.content}`
          : m.content
      }))
    ]);

    this.history.push({ role: "host", content: response.spokenResponse });

    return {
      ...response,
      retrievedChunks
    };
  }

  async _processLLMRequest(messages) {
    if (this.engine !== "ollama") {
      try {
        return await this._callGroqAPI(messages);
      } catch (err) {
        console.warn("Groq proxy failed, trying fallback:", err);
      }
    } else if (this.engine === "ollama") {
      try {
        return await this._callOllamaAPI(messages);
      } catch (err) {
        console.warn("Ollama failed:", err);
      }
    }

    return this._dynamicFallbackGenerator(messages);
  }

  async _callGroqAPI(messages) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
    const res = await fetch(`${backendUrl}/api/proxy-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: this.groqApiKey || undefined,
        model: "qwen/qwen3.6-27b",
        messages,
        temperature: 0.7,
        max_tokens: 800
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Proxy error: ${res.status}`);
    }
    const data = await res.json();
    return this._parseThinkingAndResponse(data.choices?.[0]?.message?.content || "");
  }

  async _callOllamaAPI(messages) {
    const res = await fetch(`${this.ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.ollamaModel, messages, stream: false })
    });
    const data = await res.json();
    return this._parseThinkingAndResponse(data.message?.content || "");
  }

  _dynamicFallbackGenerator(messages) {
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user")?.content || "";
    // Strip guest name prefix if present
    const cleanMessage = lastUserMessage.replace(/^\[.*?\]:\s*/, '');
    const lower = cleanMessage.toLowerCase().trim();
    const retrieved = this.ragKB.search(cleanMessage, 1);
    const ragSnippet = retrieved.length > 0 ? retrieved[0] : null;

    // Extract guest name from message format "[Name]: message"
    const nameMatch = lastUserMessage.match(/^\[(.*?)\]:/);
    const speakerName = nameMatch ? nameMatch[1] : 'our guest';

    let thinking = "";
    let spokenResponse = "";

    // 1. Self-introduction
    if (lower.includes("about yourself") || lower.includes("who are you") || lower.includes("tell me about you") || lower.includes("what is your name") || lower.includes("who is joy") || lower.includes("what can you do")) {
      thinking = `1. Intent: Asked for host & event intro.\n2. Action: Welcome guest to Next Wave.\n3. Volley: Invite speaker to suggest a question or state any doubts.\n4. Cadence: Punchy human host.`;
      spokenResponse = `Welcome to Next Wave! I'm JOY, your AI co-host. What questions or topics would you like to explore today, or do you have any doubts we can dive into?`;
    }
    // 2. Mic / Audio check
    else if (lower.includes("understand") || lower.includes("hear me") || lower.includes("testing") || lower.includes("hello hello") || lower.includes("can you hear")) {
      thinking = `1. Intent: Audio verification.\n2. Action: Casual confirmation.\n3. Volley: Invite question or doubt.`;
      spokenResponse = `Loud and clear! Audio levels are spot-on. What question or topic would you like to kick off with today?`;
    }
    // 3. Greeting
    else if (lower === "hello" || lower === "hi" || lower.includes("happy to be here") || lower.includes("thanks for having me")) {
      thinking = `1. Intent: Friendly greeting.\n2. Action: Warm event intro.\n3. Volley: Ask for guest's question or doubts.\n4. Cadence: Warm podcast host.`;
      spokenResponse = `Welcome to Next Wave! We're thrilled to have you at the mic. Please feel free to suggest a question or bring up any doubts you'd like to discuss.`;
    }
    // 4. Dynamic contextual response based on user's exact message
    else {
      const stopWords = new Set(["the","a","an","is","are","was","were","in","on","at","to","for","of","with","and","or","it","that","this","i","you","we","they","my","your","about","how","what","why","where","when","can","do","does","did"]);
      const words = cleanMessage.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));
      const topicKeywords = words.length > 0 ? words.slice(-3).join(' ') : cleanMessage;

      thinking = `1. Intent Analysis: ${speakerName} introduced "${cleanMessage.substring(0, 45)}...".\n2. Context Extraction: Focusing directly on ${topicKeywords}.\n3. Volley: Acknowledge their point directly and ask an open follow-up.\n4. Cadence Check: 1-2 punchy spoken sentences.`;

      spokenResponse = ragSnippet
        ? `That links directly to your findings in ${ragSnippet.source}. Regarding ${topicKeywords}, how do you see that playing out in practice?`
        : `That's an insightful point about ${topicKeywords}! What's the main challenge or trade-off you've encountered when putting that into action?`;
    }

    return { thinking, spokenResponse };
  }

  _parseThinkingAndResponse(rawText) {
    let thinking = "";
    let spokenResponse = rawText;

    const thinkMatch = rawText.match(/<think>([\s\S]*?)<\/think>/i);
    if (thinkMatch) {
      thinking = thinkMatch[1].trim();
      spokenResponse = rawText.replace(/<think>[\s\S]*?<\/think>/i, "").trim();
    } else {
      thinking = "1. Intent: Analyzing statement and active listening.\n2. Sustainability: Aligning with energy efficiency.\n3. Volley: Synthesizing conversational follow-up question.";
    }

    // Strip "JOY:" or "Joy:" from the start of the spoken response
    spokenResponse = spokenResponse.replace(/^JOY:\s*/i, "").trim();

    return { thinking, spokenResponse };
  }

  /**
   * Submit human feedback on an AI response into the Feedback Loop.
   */
  async submitFeedback(feedbackData) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
    try {
      const res = await fetch(`${backendUrl}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feedbackData)
      });
      return await res.json();
    } catch (err) {
      console.warn("Feedback submission fallback:", err);
      return null;
    }
  }

  /**
   * Fetch autonomous feedback loop summary and metrics.
   */
  async getFeedbackSummary() {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
    try {
      const res = await fetch(`${backendUrl}/api/feedback/summary`);
      return await res.json();
    } catch (err) {
      console.warn("Feedback summary fallback:", err);
      return null;
    }
  }

  /**
   * Fetch list of all logged feedback items.
   */
  async getFeedbackList() {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
    try {
      const res = await fetch(`${backendUrl}/api/feedback`);
      return await res.json();
    } catch (err) {
      console.warn("Feedback list fallback:", err);
      return null;
    }
  }
}
