import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Brain, Sparkles, ThumbsUp, ThumbsDown, Check, Send, Mic, MicOff, BookOpen } from 'lucide-react';

/**
 * ConversationPanel — Floating glass panel for live text chat and voice transcript.
 * 
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - transcript: array of message objects
 *  - guestText: string — current interim text while listening
 *  - stageStatus: string
 *  - onFeedback: (turnId, rating, tags, comment) => void
 *  - onSendMessage: (text: string) => void
 *  - onToggleMic: () => void
 */
export function ConversationPanel({
  isOpen,
  onClose,
  transcript = [],
  guestText = '',
  stageStatus = 'idle',
  onFeedback,
  onSendMessage,
  onToggleMic
}) {
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const [inputText, setInputText] = useState('');
  const [expandedReasoning, setExpandedReasoning] = useState({});
  const [feedbackGiven, setFeedbackGiven] = useState({});
  const [selectedNegTag, setSelectedNegTag] = useState({});

  const isListening = stageStatus === 'listening_guest';
  const isThinking = stageStatus === 'thinking';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, guestText, isThinking]);

  const toggleReasoning = (msgId) => {
    setExpandedReasoning(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const handleRate = (msg, rating) => {
    const turnId = msg.id || `turn_${msg.time}`;
    setFeedbackGiven(prev => ({
      ...prev,
      [turnId]: { rating, status: rating === 1 ? 'logged' : 'selecting_tag' }
    }));

    if (rating === 1 && onFeedback) {
      onFeedback(turnId, 1, ['great_flow', 'conversational'], 'Human-rated as natural and engaging');
    }
  };

  const handleSelectNegativeTag = (msg, tag) => {
    const turnId = msg.id || `turn_${msg.time}`;
    setSelectedNegTag(prev => ({ ...prev, [turnId]: tag }));
    setFeedbackGiven(prev => ({
      ...prev,
      [turnId]: { rating: -1, status: 'logged', tag }
    }));

    if (onFeedback) {
      onFeedback(
        turnId,
        -1,
        [tag],
        tag === 'too_long' ? 'Answer was too long/verbose' :
          tag === 'felt_like_qa' ? 'Felt like an exam Q&A, not a podcast' :
            tag === 'lecture_tone' ? 'Sounded like a lecture/chatbot' : 'Off-topic'
      );
    }
  };

  const handleSubmitText = (e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || isThinking) return;
    if (onSendMessage) {
      onSendMessage(text);
    }
    setInputText('');
  };

  const handleSuggestionClick = (suggestionText) => {
    if (isThinking) return;
    if (onSendMessage) {
      onSendMessage(suggestionText);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="floating-panel floating-panel--left glass-card"
          initial={{ x: -420, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -420, opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          style={{
            width: '440px',
            maxWidth: '94vw',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'calc(100vh - 120px)'
          }}
        >
          {/* Header */}
          <div className="floating-panel__header" style={{ flexShrink: 0 }}>
            <div className="floating-panel__title">
              <MessageSquare size={15} />
              <span>Next Wave Chat & Transcript</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {transcript.length} turns
              </span>
              <button className="floating-panel__close" onClick={onClose} aria-label="Close conversation panel">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Transcript Body */}
          <div
            className="floating-panel__body"
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {transcript.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '30px 12px 16px',
                color: 'var(--text-dim)',
                fontSize: '0.85rem',
                lineHeight: 1.6
              }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🌊</div>
                Welcome to <strong>Next Wave Summit</strong>!<br />
                Ask <strong>Joy</strong> anything about sessions, speakers, schedule, or sustainable tech.
              </div>
            )}

            {transcript.map((msg, index) => {
              const msgId = msg.id || `turn_${index}`;
              const isReasoningOpen = !!expandedReasoning[msgId];
              const fb = feedbackGiven[msgId];

              return (
                <div key={msgId} className="conv-message" style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: msg.sender === 'host' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.04)',
                  border: `1px solid ${msg.sender === 'host' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.07)'}`
                }}>
                  <div className="conv-message__header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className={`conv-message__avatar ${msg.sender === 'host' ? 'conv-message__avatar--host' : 'conv-message__avatar--guest'}`} style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        background: msg.sender === 'host' ? 'linear-gradient(135deg, #10b981, #06b6d4)' : 'rgba(255, 255, 255, 0.15)'
                      }}>
                        {msg.sender === 'host' ? '✨' : '👤'}
                      </div>
                      <span className="conv-message__name" style={{
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        color: msg.sender === 'host' ? '#34d399' : '#f1f5f9'
                      }}>
                        {msg.name || (msg.sender === 'host' ? 'Joy (AI Assistant)' : 'You')}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{msg.time}</span>
                  </div>

                  <p className="conv-message__text" style={{
                    margin: 0,
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    color: '#e2e8f0',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {msg.text}
                  </p>

                  {/* RAG Citations */}
                  {msg.sender === 'host' && msg.citations && msg.citations.length > 0 && (
                    <div style={{
                      marginTop: '8px',
                      padding: '6px 10px',
                      background: 'rgba(6, 182, 212, 0.08)',
                      border: '1px solid rgba(6, 182, 212, 0.2)',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      color: '#67e8f9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      flexWrap: 'wrap'
                    }}>
                      <BookOpen size={12} />
                      <span style={{ fontWeight: 600 }}>Sources:</span>
                      {msg.citations.map((c, cIdx) => (
                        <span key={cIdx} style={{
                          background: 'rgba(6, 182, 212, 0.15)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid rgba(6, 182, 212, 0.3)'
                        }}>
                          {c.source || c.title || `Doc #${c.doc_id || cIdx + 1}`}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Host Actions: Chain-of-Thought & Feedback */}
                  {msg.sender === 'host' && (
                    <div style={{
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: '1px dashed rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '6px'
                    }}>
                      <button
                        onClick={() => toggleReasoning(msgId)}
                        style={{
                          background: isReasoningOpen ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          color: '#34d399',
                          borderRadius: '4px',
                          padding: '3px 8px',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Brain size={11} />
                        <span>{isReasoningOpen ? 'Hide CoT' : 'View CoT Reasoning'}</span>
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Rate:</span>
                        <button
                          onClick={() => handleRate(msg, 1)}
                          style={{
                            background: fb?.rating === 1 ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                            border: `1px solid ${fb?.rating === 1 ? '#10b981' : 'rgba(255, 255, 255, 0.08)'}`,
                            color: fb?.rating === 1 ? '#10b981' : 'var(--text-dim)',
                            borderRadius: '4px',
                            padding: '3px 6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: '0.7rem'
                          }}
                          title="Human-like & conversational"
                        >
                          <ThumbsUp size={11} />
                        </button>
                        <button
                          onClick={() => handleRate(msg, -1)}
                          style={{
                            background: fb?.rating === -1 ? 'rgba(239, 68, 68, 0.25)' : 'transparent',
                            border: `1px solid ${fb?.rating === -1 ? '#ef4444' : 'rgba(255, 255, 255, 0.08)'}`,
                            color: fb?.rating === -1 ? '#ef4444' : 'var(--text-dim)',
                            borderRadius: '4px',
                            padding: '3px 6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: '0.7rem'
                          }}
                          title="Too long, robotic or incorrect"
                        >
                          <ThumbsDown size={11} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Negative feedback tag prompt */}
                  {msg.sender === 'host' && fb?.status === 'selecting_tag' && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: '8px',
                      fontSize: '0.72rem'
                    }}>
                      <div style={{ color: '#fca5a5', marginBottom: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Sparkles size={12} />
                        <span>Critique Tag (Improves AI Model):</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {[
                          { id: 'off_track', label: '🔴 Robotic / Off-track' },
                          { id: 'too_lengthy', label: '🟡 Too long' },
                          { id: 'needs_sustainability_grounding', label: '🔵 Missing event context' }
                        ].map(t => (
                          <button
                            key={t.id}
                            onClick={() => handleSelectNegativeTag(msg, t.id)}
                            style={{
                              background: 'rgba(15, 23, 42, 0.7)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#f87171',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '0.7rem',
                              cursor: 'pointer'
                            }}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Logged feedback confirmation */}
                  {msg.sender === 'host' && fb?.status === 'logged' && (
                    <div style={{
                      marginTop: '6px',
                      fontSize: '0.7rem',
                      color: '#34d399',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Check size={11} />
                      <span>Feedback stored in Feedback Loop.</span>
                    </div>
                  )}

                  {/* Expandable Reasoning Drawer */}
                  {msg.sender === 'host' && isReasoningOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{
                        marginTop: '8px',
                        padding: '10px',
                        background: 'rgba(15, 23, 42, 0.85)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: '8px'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: '#34d399',
                        marginBottom: '6px',
                        textTransform: 'uppercase'
                      }}>
                        <Sparkles size={12} />
                        <span>Chain-of-Thought Reasoning</span>
                      </div>
                      <pre style={{
                        margin: 0,
                        fontFamily: 'monospace',
                        fontSize: '0.72rem',
                        lineHeight: 1.45,
                        color: '#cbd5e1',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        background: 'rgba(0,0,0,0.3)',
                        padding: '8px',
                        borderRadius: '4px'
                      }}>
                        {msg.thinking || "1. Analyzed query.\n2. Retrieved Next Wave Summit context.\n3. Generated punchy response."}
                      </pre>
                    </motion.div>
                  )}
                </div>
              );
            })}

            {/* Interim voice transcript or Thinking state */}
            {isThinking && (
              <div className="conv-message" style={{
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px dashed rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#34d399',
                fontSize: '0.8rem'
              }}>
                <div className="status-dot status-dot--thinking" />
                <span>Joy is thinking & consulting Next Wave knowledge base...</span>
              </div>
            )}

            {isListening && guestText && (
              <div className="conv-message" style={{
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'rgba(6, 182, 212, 0.08)',
                border: '1px dashed rgba(6, 182, 212, 0.3)',
                color: '#67e8f9',
                fontSize: '0.82rem',
                fontStyle: 'italic'
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '4px' }}>
                  🎙️ Listening to microphone...
                </div>
                "{guestText}"
              </div>
            )}
          </div>

          {/* Quick Suggestion Chips */}
          {transcript.length <= 2 && (
            <div style={{
              padding: '8px 16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>
              {[
                "What is Next Wave Summit?",
                "Who are the keynote speakers?",
                "Tell me about sustainable AI"
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(chip)}
                  disabled={isThinking}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#94a3b8',
                    borderRadius: '14px',
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s'
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <form
            onSubmit={handleSubmitText}
            style={{
              padding: '12px 16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(15, 23, 42, 0.7)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0
            }}
          >
            <button
              type="button"
              onClick={onToggleMic}
              style={{
                background: isListening ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.15)',
                border: `1px solid ${isListening ? '#ef4444' : 'rgba(16, 185, 129, 0.35)'}`,
                color: isListening ? '#f87171' : '#34d399',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.2s'
              }}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Ask Joy about Next Wave Summit..."
              disabled={isThinking}
              style={{
                flex: 1,
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#fff',
                fontSize: '0.82rem',
                outline: 'none'
              }}
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isThinking}
              style={{
                background: inputText.trim() && !isThinking ? 'linear-gradient(135deg, #10b981, #06b6d4)' : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: inputText.trim() && !isThinking ? '#000' : 'rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: inputText.trim() && !isThinking ? 'pointer' : 'not-allowed',
                fontWeight: 700,
                flexShrink: 0,
                transition: 'all 0.2s'
              }}
              title="Send message"
            >
              <Send size={15} />
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
