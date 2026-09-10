import React, { useState, useRef, useEffect } from 'react';
import { Send, Volume2, VolumeX, Play, Pause, Square, Mic, MicOff, RefreshCw, AlertCircle, Sparkles, BookOpen } from 'lucide-react';

export function ConversationPanel({ activeTab = 'ask_joy', initialPrompt = '' }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'joy',
      text: "Hello! Welcome to the Next Wave Summit. I'm Joy, your official AI assistant. How can I help you with our schedule, speakers, venue, or sessions today?",
      citations: [],
      hasKnowledge: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Voice Controls State
  const [voiceLanguage, setVoiceLanguage] = useState('en'); // 'en', 'hi', 'hinglish'
  const [voiceEngine, setVoiceEngine] = useState('neutral'); // 'neutral', 'indic_f5'
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [isListeningMic, setIsListeningMic] = useState(false);

  const chatScrollRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Handle external query selection (e.g. from EventGuide or SpeakerView)
  useEffect(() => {
    if (initialPrompt) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  // Send Message Handler
  const handleSendMessage = async (customQuery = null) => {
    const query = (customQuery || inputQuery).trim();
    if (!query || loading) return;

    setErrorMsg('');
    const userMsg = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customQuery) setInputQuery('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          mode: activeTab,
          language: voiceLanguage,
          voice_engine: voiceEngine
        })
      });

      if (res.ok) {
        const data = await res.json();
        const joyMsg = {
          id: `joy_${Date.now()}`,
          sender: 'joy',
          text: data.response,
          citations: data.citations || [],
          hasKnowledge: data.has_knowledge,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, joyMsg]);

        // Auto-play voice if not muted
        if (!isMuted && data.response) {
          playServerTTS(data.response);
        }
      } else {
        setErrorMsg('Failed to communicate with Joy assistant service.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error: Joy assistant service unreachable.');
    } finally {
      setLoading(false);
    }
  };

  // Play Server-Side TTS
  const playServerTTS = async (textToSynthesize) => {
    if (isMuted) return;
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
    }

    setIsPlayingAudio(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSynthesize,
          language: voiceLanguage,
          voice_engine: voiceEngine
        })
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        setCurrentAudio(audio);
        audio.play();

        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => setIsPlayingAudio(false);
      } else {
        setIsPlayingAudio(false);
      }
    } catch (err) {
      console.error('Audio playback error:', err);
      setIsPlayingAudio(false);
    }
  };

  // Stop Audio
  const handleStopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
    }
    setIsPlayingAudio(false);
  };

  // Speech Recognition (Mic Toggle)
  const handleToggleMic = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Browser Speech Recognition is not supported in this browser. Please type your message.');
      return;
    }

    if (isListeningMic) {
      setIsListeningMic(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = voiceLanguage === 'hi' ? 'hi-IN' : 'en-US';

    recognition.onstart = () => setIsListeningMic(true);
    recognition.onresult = (event) => {
      const transcriptText = event.results[0][0].transcript;
      setInputQuery(transcriptText);
      setIsListeningMic(false);
      handleSendMessage(transcriptText);
    };
    recognition.onerror = () => setIsListeningMic(false);
    recognition.onend = () => setIsListeningMic(false);

    recognition.start();
  };

  return (
    <div style={{
      maxWidth: '900px',
      margin: '0 auto',
      height: 'calc(100vh - 90px)',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px',
      color: '#f8fafc'
    }}>
      {/* Top Voice Controls Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 18px',
        background: 'rgba(15, 23, 42, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        marginBottom: '16px',
        backdropFilter: 'blur(12px)',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>Voice Language:</span>
          <select
            value={voiceLanguage}
            onChange={(e) => setVoiceLanguage(e.target.value)}
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              color: '#fff',
              padding: '4px 8px',
              fontSize: '0.82rem',
              outline: 'none'
            }}
          >
            <option value="en">English (Indian Accent)</option>
            <option value="hi">Hindi (हिंदी)</option>
            <option value="hinglish">Hinglish</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>Voice Engine:</span>
          <select
            value={voiceEngine}
            onChange={(e) => setVoiceEngine(e.target.value)}
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              color: '#fff',
              padding: '4px 8px',
              fontSize: '0.82rem',
              outline: 'none'
            }}
          >
            <option value="neutral">Neutral Open-Source Voice</option>
            <option value="indic_f5">AI4Bharat IndicF5 (GPU)</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isPlayingAudio ? (
            <button
              onClick={handleStopAudio}
              style={{
                background: 'rgba(244, 63, 94, 0.2)',
                border: '1px solid rgba(244, 63, 94, 0.4)',
                color: '#f43f5e',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: '600'
              }}
            >
              <Square size={12} /> Stop Audio
            </button>
          ) : (
            <button
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: isMuted ? '#f43f5e' : '#34d399',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              <span>{isMuted ? 'Muted' : 'Audio On'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Chat Messages Feed */}
      <div
        ref={chatScrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          paddingRight: '6px',
          marginBottom: '16px'
        }}
      >
        {messages.map((msg) => {
          const isJoy = msg.sender === 'joy';
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isJoy ? 'flex-start' : 'flex-end'
              }}
            >
              <div
                style={{
                  maxWidth: '82%',
                  background: isJoy ? 'rgba(15, 23, 42, 0.75)' : 'linear-gradient(135deg, #0284c7, #6366f1)',
                  border: isJoy ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                  borderRadius: isJoy ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                  padding: '14px 18px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', gap: '12px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: isJoy ? '#38bdf8' : '#e0f2fe' }}>
                    {isJoy ? 'Joy • Next Wave Summit' : 'You'}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: isJoy ? '#64748b' : '#93c5fd' }}>
                    {msg.time}
                  </span>
                </div>

                {/* Message Text */}
                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', color: '#f8fafc', whiteSpace: 'pre-wrap' }}>
                  {msg.text}
                </p>

                {/* Human-Readable Source Citations */}
                {isJoy && msg.citations && msg.citations.length > 0 && (
                  <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    {msg.citations.map((cite, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#34d399', marginTop: '2px' }}>
                        <BookOpen size={12} />
                        <span>{cite}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Play Sound Button for Joy Messages */}
                {isJoy && (
                  <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => playServerTTS(msg.text)}
                      title="Play Voice Response"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#38bdf8',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Volume2 size={12} /> Listen
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontSize: '0.85rem', padding: '8px 12px' }}>
            <RefreshCw size={16} className="animate-spin" />
            <span>Joy is consulting Next Wave Summit records...</span>
          </div>
        )}
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          color: '#f43f5e',
          padding: '8px 12px',
          borderRadius: '8px',
          marginBottom: '12px',
          fontSize: '0.85rem'
        }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Chat Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '14px',
          padding: '8px 12px',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        }}
      >
        <button
          type="button"
          onClick={handleToggleMic}
          title={isListeningMic ? 'Stop Listening' : 'Speak to Joy'}
          style={{
            background: isListeningMic ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${isListeningMic ? '#f43f5e' : 'rgba(255, 255, 255, 0.1)'}`,
            borderRadius: '10px',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isListeningMic ? '#f43f5e' : '#38bdf8',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          {isListeningMic ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        <input
          type="text"
          placeholder="Ask Joy about Next Wave Summit schedule, speakers, venue..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          disabled={loading}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: '#fff',
            fontSize: '0.95rem',
            outline: 'none',
            padding: '4px'
          }}
        />

        <button
          type="submit"
          disabled={!inputQuery.trim() || loading}
          style={{
            background: inputQuery.trim() && !loading ? 'linear-gradient(135deg, #0284c7, #6366f1)' : 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '10px',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            cursor: inputQuery.trim() && !loading ? 'pointer' : 'not-allowed',
            flexShrink: 0,
            transition: 'all 0.15s ease'
          }}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
