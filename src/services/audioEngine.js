/**
 * Audio Engine - Speech Recognition (STT), Speech Synthesis (TTS),
 * and Web Audio API Visualizer frequency analyzer.
 */

export class AudioEngine {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.audioContext = null;
    this.analyser = null;
    this.mediaStream = null;
    this.isListening = false;
    this.isSpeaking = false;
    this.voices = [];
    this.selectedVoice = null;

    this._initSpeechRecognition();
    this._initSpeechSynthesis();
  }

  _initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
    } else {
      console.warn("Speech Recognition API is not supported natively in this browser.");
    }
  }

  _initSpeechSynthesis() {
    if (!this.synthesis) return;

    const loadVoices = () => {
      this.voices = this.synthesis.getVoices();
      // Prefer feminine english voices for JOY
      this.selectedVoice = this.voices.find(v =>
        v.lang.startsWith("en") &&
        (v.name.includes("Samantha") || v.name.includes("Karen") || v.name.includes("Zira") ||
         v.name.includes("Female") || v.name.includes("Ava") || v.name.includes("Allison") ||
         v.name.includes("Fiona") || v.name.includes("Victoria") || v.name.includes("Tessa"))
      ) || this.voices.find(v =>
        v.lang.startsWith("en") &&
        (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Enhanced"))
      ) || this.voices.find(v => v.lang.startsWith("en")) || this.voices[0];
    };

    loadVoices();
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = loadVoices;
    }
  }

  /**
   * Returns the current AnalyserNode for waveform visualization.
   * May be null if mic hasn't been activated yet.
   */
  getAnalyserNode() {
    return this.analyser;
  }

  /**
   * Ensures an AudioContext and AnalyserNode exist (reuses if already created).
   */
  _ensureAudioContext() {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioCtx();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 64;
    this.analyser.smoothingTimeConstant = 0.8;
  }

  /**
   * Start listening to guest via microphone
   */
  startListening({ onTranscript, onError, onEnd }) {
    if (!this.recognition) {
      if (onError) onError("Speech Recognition not supported in this browser. Please use Google Chrome or Edge.");
      return;
    }

    this.isListening = true;

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (onTranscript) {
        onTranscript({
          interim: interimTranscript,
          final: finalTranscript
        });
      }
    };

    this.recognition.onerror = (event) => {
      console.warn("Speech Recognition Error:", event.error);
      if (onError && event.error !== 'no-speech') {
        onError(`Mic error: ${event.error}`);
      }
    };

    this.recognition.onend = () => {
      // Auto-restart if user still wants to listen
      if (this.isListening) {
        try {
          this.recognition.start();
        } catch (e) {
          this.isListening = false;
          if (onEnd) onEnd();
        }
      } else if (onEnd) {
        onEnd();
      }
    };

    try {
      this.recognition.start();
      this.startMicVisualizer();
    } catch (e) {
      console.error("Failed to start recognition:", e);
    }
  }

  stopListening() {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    this.stopMicVisualizer();
  }

  /**
   * Unlock AudioContext and SpeechSynthesis on first user gesture.
   */
  unlockAudioContext() {
    if (this.synthesis && this.synthesis.paused) {
      try {
        this.synthesis.resume();
      } catch (e) {}
    }
    this._ensureAudioContext();
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        this.audioContext.resume();
      } catch (e) {}
    }
  }

  /**
   * Speaks podcast response out loud with Edge-TTS backend neural voice
   * or persona-aware Web Speech fallback.
   *
   * @param {string} text - Text to speak
   * @param {object} options - { pitch, rate, voiceName, onStart, onEnd, onError }
   */
  async speakText(text, { pitch = 1.0, rate = 1.0, voiceName = "en-US-AvaNeural", onStart, onEnd, onError } = {}) {
    this.unlockAudioContext();
    this.stopSpeaking();

    // Clean text of markdown/tags if any remain
    const cleanText = text
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/[*_#`~]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    // Attempt 1: Try Neural Edge-TTS via backend API
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
    try {
      const formData = new FormData();
      formData.append("text", cleanText);
      formData.append("voice", voiceName || "en-US-AvaNeural");

      const response = await fetch(`${backendUrl}/api/tts`, {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        this.currentAudio = audio;
        this.isSpeaking = true;

        audio.onplay = () => {
          if (onStart) onStart();
        };

        audio.onended = () => {
          this.isSpeaking = false;
          this.currentAudio = null;
          URL.revokeObjectURL(audioUrl);
          if (onEnd) onEnd();
        };

        audio.onerror = (err) => {
          console.warn("Edge-TTS Audio playback error, using Web Speech fallback:", err);
          this.isSpeaking = false;
          this.currentAudio = null;
          URL.revokeObjectURL(audioUrl);
          this._speakWebSpeechFallback(cleanText, { pitch, rate, onStart, onEnd, onError });
        };

        await audio.play();
        return;
      }
    } catch (err) {
      console.warn("Backend TTS endpoint unreachable, falling back to Web Speech:", err);
    }

    // Fallback: Web Speech API
    this._speakWebSpeechFallback(cleanText, { pitch, rate, onStart, onEnd, onError });
  }

  _speakWebSpeechFallback(cleanText, { pitch = 1.0, rate = 1.0, onStart, onEnd, onError }) {
    if (!this.synthesis) {
      if (onError) onError("Speech Synthesis not supported");
      if (onEnd) onEnd();
      return;
    }

    try {
      this.synthesis.cancel();
      if (this.synthesis.paused) {
        this.synthesis.resume();
      }
    } catch (e) {}

    // Ensure voice is selected if loaded late
    if (!this.selectedVoice && this.voices.length > 0) {
      this.selectedVoice = this.voices.find(v => v.lang.startsWith("en")) || this.voices[0];
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.volume = 1.0; // Ensure maximum audible volume
    utterance.pitch = pitch;
    utterance.rate = rate;

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      this.isSpeaking = false;
      console.warn("Speech Synthesis Utterance Error:", e);
      if (onError) onError(e);
      if (onEnd) onEnd();
    };

    this.synthesis.speak(utterance);
  }

  stopSpeaking() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
      this.currentAudio = null;
    }
    if (this.synthesis) {
      try {
        this.synthesis.cancel();
      } catch (e) {}
    }
    this.isSpeaking = false;
  }

  /**
   * Web Audio API Microphone Visualizer.
   * Reuses existing AudioContext if available.
   */
  async startMicVisualizer() {
    try {
      if (!this.mediaStream) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      this._ensureAudioContext();

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.analyser);
    } catch (e) {
      console.warn("Mic visualizer unavailable:", e);
    }
  }

  stopMicVisualizer() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    // Don't close AudioContext here — it can be reused
  }

  /**
   * Full cleanup — call on unmount.
   */
  destroy() {
    this.stopListening();
    this.stopSpeaking();
    this.stopMicVisualizer();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
      this.analyser = null;
    }
  }
}

