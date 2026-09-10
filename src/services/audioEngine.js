/**
 * Audio Engine - Speech Recognition (STT), Speech Synthesis (TTS),
 * and Web Audio API Visualizer frequency analyzer.
 */

import { getApiUrl } from './apiClient';

export class AudioEngine {
  constructor() {
    this.recognition = null;
    this.synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.audioContext = null;
    this.analyser = null;
    this.mediaStream = null;
    this.isListening = false;
    this.isSpeaking = false;
    this.voices = [];
    this.selectedVoice = null;
    this.currentAudio = null;

    this._initSpeechRecognition();
    this._initSpeechSynthesis();
  }

  _initSpeechRecognition() {
    if (typeof window === 'undefined') return;
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

  getAnalyserNode() {
    return this.analyser;
  }

  _ensureAudioContext() {
    if (typeof window === 'undefined') return;
    if (this.audioContext && this.audioContext.state !== 'closed') {
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;
    }
  }

  startListening({ onTranscript, onError, onEnd }) {
    if (!this.recognition) {
      if (onError) onError("Speech Recognition not supported in this browser. Please use Chrome or Edge.");
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

  unlockAudioContext() {
    if (this.synthesis) {
      try {
        if (this.synthesis.paused) this.synthesis.resume();
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
   * Speaks text out loud using backend neural TTS or Web Speech fallback.
   */
  async speakText(text, { pitch = 1.0, rate = 1.0, voiceName = "en-US-AvaNeural", onStart, onEnd, onError } = {}) {
    this.unlockAudioContext();
    this.stopSpeaking();

    const cleanText = text
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/[*_#`~]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    // 1. Try Backend Neural TTS Endpoint
    try {
      const ttsUrl = getApiUrl('/api/tts');
      const response = await fetch(ttsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cleanText,
          voice_engine: "neutral",
          language: "en"
        })
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
          console.warn("Backend TTS playback error, trying Web Speech fallback:", err);
          this.isSpeaking = false;
          this.currentAudio = null;
          URL.revokeObjectURL(audioUrl);
          this._speakWebSpeechFallback(cleanText, { pitch, rate, onStart, onEnd, onError });
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.warn("Browser prevented autoplay, falling back to Web Speech:", err);
            this.isSpeaking = false;
            this.currentAudio = null;
            URL.revokeObjectURL(audioUrl);
            this._speakWebSpeechFallback(cleanText, { pitch, rate, onStart, onEnd, onError });
          });
        }
        return;
      }
    } catch (err) {
      console.warn("Backend TTS call failed, falling back to Web Speech:", err);
    }

    // 2. Web Speech API Fallback
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

    if (!this.selectedVoice && this.voices.length > 0) {
      this.selectedVoice = this.voices.find(v => v.lang.startsWith("en")) || this.voices[0];
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.volume = 1.0;
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

  async startMicVisualizer() {
    try {
      if (!this.mediaStream && navigator.mediaDevices) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      this._ensureAudioContext();
      if (this.audioContext && this.mediaStream) {
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        source.connect(this.analyser);
      }
    } catch (e) {
      console.warn("Mic visualizer unavailable:", e);
    }
  }

  stopMicVisualizer() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

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
