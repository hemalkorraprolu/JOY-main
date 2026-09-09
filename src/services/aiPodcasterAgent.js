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
Topic: ${this.topic}

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
6. SUSTAINABILITY GROUNDING: Ground the dialogue in datacenter energy efficiency, clean power matching, carbon-aware scheduling, circular hardware, and green AI models.

FORMAT REQUIRED:
<think>
1. Speaker Intent & Core Claim: [What did the speaker/student assert or ask?]
2. Sustainability Hook: [What specific energy/carbon/compute angle connects here?]
3. Conversational Volley: [Why this brief reflection and open follow-up?]
4. Cadence Check: [Verify response is 1-2 punchy spoken sentences, under 45 words]
</think>
[JOY's spoken podcast response]`;
  }

  async generateOpening() {
    const prompt = `Welcome everyone to ${this.conferenceName}!
Generate an engaging, warm event welcome (2 sentences max, ~35 words).
Introduce Next Wave, state that today we are exploring how AI and sustainability intersect across energy, compute, and student innovations, and announce that the floor is now open for our speakers and students to ask questions or share their projects. Do NOT ask a specific question to any hardcoded guest name yet—wait for the speaker to speak first. Include <think>...</think> reasoning steps.`;

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
    if (this.engine === "groq" && this.groqApiKey) {
      try { return await this._callGroqAPI(messages); } catch (err) { console.warn("Groq failed:", err); }
    } else if (this.engine === "ollama") {
      try { return await this._callOllamaAPI(messages); } catch (err) { console.warn("Ollama failed:", err); }
    }

    return this._dynamicFallbackGenerator(messages);
  }

  async _callGroqAPI(messages) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
    const res = await fetch(`${backendUrl}/api/proxy-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: this.groqApiKey, model: "openai/gpt-oss-120b", messages, temperature: 0.75, max_tokens: 800 })
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
    const persona = this._getPersona();

    // Extract guest name from message format "[Name]: message"
    const nameMatch = lastUserMessage.match(/^\[(.*?)\]:/);
    const speakerName = nameMatch ? nameMatch[1] : 'our guest';

    let thinking = "";
    let spokenResponse = "";

    // 1. Self-introduction
    if (lower.includes("about yourself") || lower.includes("who are you") || lower.includes("tell me about you") || lower.includes("what is your name") || lower.includes("who is joy") || lower.includes("what can you do")) {
      thinking = `1. Intent: Asked for host & event intro.\n2. Sustainability Focus: Ground JOY in Next Wave's green computing mission.\n3. Volley: Keep it under 35 words and welcome speakers/students to share.\n4. Cadence: Punchy human podcast host.`;
      spokenResponse = `Welcome to Next Wave! I'm JOY, your AI co-host exploring where AI innovations and sustainability intersect. Whether you're a guest speaker or a student, what topic or project are you diving into today?`;
    }
    // 2. Mic / Audio check
    else if (lower.includes("understand") || lower.includes("hear me") || lower.includes("testing") || lower.includes("hello hello") || lower.includes("can you hear")) {
      thinking = `1. Intent: Audio verification.\n2. Action: Casual, conversational podcast confirmation.\n3. Volley: Direct pivot to clean energy compute at Next Wave.`;
      spokenResponse = `Loud and clear! Audio levels are spot-on here at Next Wave. What sustainability question or idea would you like to explore first?`;
    }
    // 3. Greeting
    else if (lower === "hello" || lower === "hi" || lower.includes("happy to be here") || lower.includes("thanks for having me")) {
      thinking = `1. Intent: Friendly greeting.\n2. Action: Warm host welcome.\n3. Volley: Ask what brought them to Next Wave.`;
      spokenResponse = `Welcome to the mic at Next Wave! Great to have you with us today. What brings you to our AI & Sustainability summit?`;
    }
    // 4. Technical / substantive response
    else {
      thinking = `1. Intent Analysis: ${speakerName} touched on "${cleanMessage.substring(0, 45)}...".\n2. Sustainability Hook: ${ragSnippet ? `Anchored to ${ragSnippet.source}` : 'Focusing on energy intensity & grid capacity'}.\n3. Conversational Volley: React directly to their point, then pass the mic with a focused "how" or "why" question.\n4. Cadence Check: Strict 1-2 sentences, conversational tone, zero lecture.`;

      const questionSets = {
        alex: [
          `That energy metric is fascinating. When you measured the power draw under peak cluster load, where did you see the biggest thermal spike?`,
          `I love that approach to efficiency. But when scaling that across thousands of GPUs, what's the toughest infrastructure bottleneck you ran into?`,
          `That's a huge trade-off. How does that compute savings translate to actual kilowatt-hours saved on the grid?`,
          `Very sharp point. If you had to cut another 30% of energy consumption from that pipeline tomorrow, where would you start?`
        ],
        elena: [
          `That's a massive shift in how we think about green compute. How do you see that reshaping datacenter design over the next five years?`,
          `I love the vision behind that. If clean-energy AI becomes the industry standard, what unexpected application gets unlocked first?`,
          `That connects right to the heart of net-zero AI. What would it take for every cloud provider to adopt that tomorrow?`,
          `Inspiring perspective! Fast-forward to 2030—does this fundamentally solve AI's power hunger, or just buy us time?`
        ],
        marcus: [
          `Wait, let me push back on that. When renewable generation drops on a cloudy day, how does your workload gracefully throttle without wrecking latency?`,
          `That sounds great on paper, but aren't we just shifting the carbon burden somewhere else in the supply chain?`,
          `Bold claim! What's the hidden cost or hardware wear-and-tear that advocates for this approach usually overlook?`,
          `I'm skeptical that cloud giants will adopt this if it costs even 2% in throughput. What's the real economic incentive here?`
        ]
      };

      const questions = questionSets[this.hostPersonaId] || questionSets.alex;

      let idx = Math.floor(Math.random() * questions.length);
      while (this.usedTemplates.has(`${this.hostPersonaId}_${idx}`) && this.usedTemplates.size < questions.length * 3) {
        idx = (idx + 1) % questions.length;
      }
      this.usedTemplates.add(`${this.hostPersonaId}_${idx}`);

      spokenResponse = ragSnippet
        ? `That links directly to your findings in ${ragSnippet.source}. ${questions[idx]}`
        : `${questions[idx]}`;
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
