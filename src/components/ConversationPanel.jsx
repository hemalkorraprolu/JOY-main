import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Brain, Sparkles, ThumbsUp, ThumbsDown, Check } from 'lucide-react';

/**
 * ConversationPanel — Left floating glass panel for conversation timeline.
 * 
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - transcript: array of message objects
 *  - guestText: string — current interim text while listening
 *  - stageStatus: string
 *  - onFeedback: (turnId, rating, tags, comment) => void
 */
export function ConversationPanel({
  isOpen,
  onClose,
  transcript,
  guestText,
  stageStatus,
  onFeedback
}) {
  const scrollRef = useRef(null);
  const [expandedReasoning, setExpandedReasoning] = useState({});
  const [feedbackGiven, setFeedbackGiven] = useState({});
  const [selectedNegTag, setSelectedNegTag] = useState({});

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="floating-panel floating-panel--left glass-card"
          initial={{ x: -400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -400, opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          style={{ width: '420px', maxWidth: '92vw' }}
        >
          <div className="floating-panel__header">
            <div className="floating-panel__title">
              <MessageSquare size={15} />
              <span>Podcast Conversation</span>
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

          <div className="floating-panel__body" ref={scrollRef}>
            {transcript.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '40px 16px',
                color: 'var(--text-dim)',
                fontSize: '0.85rem',
                lineHeight: 1.6
              }}>
                🎙️ Ready for the <strong>AI & Sustainability</strong> podcast.<br />
                Press <strong>Start Podcast</strong> or speak into the microphone.
              </div>
            )}

            {transcript.map((msg, index) => {
              const msgId = msg.id || `turn_${index}`;
              const isReasoningOpen = !!expandedReasoning[msgId];
              const fb = feedbackGiven[msgId];

              return (
                <div key={msgId} className="conv-message">
                  <div className="conv-message__header">
                    <div className={`conv-message__avatar ${msg.sender === 'host' ? 'conv-message__avatar--host' : 'conv-message__avatar--guest'}`}>
                      {msg.sender === 'host' ? '🎙️' : '👤'}
                    </div>
                    <span className={`conv-message__name ${msg.sender === 'host' ? 'conv-message__name--host' : 'conv-message__name--guest'}`}>
                      {msg.name}
                    </span>
                    <span className="conv-message__time">{msg.time}</span>
                  </div>

                  <p className="conv-message__text" style={{ fontSize: '0.88rem', lineHeight: '1.55' }}>
                    {msg.text}
                  </p>

                  {/* Host Reasoning & Feedback Action Bar */}
                  {msg.sender === 'host' && (
                    <div className="conv-message__actions" style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '8px',
                      paddingTop: '6px',
                      borderTop: '1px dashed rgba(255, 255, 255, 0.07)'
                    }}>
                      <button
                        onClick={() => toggleReasoning(msgId)}
                        style={{
                          background: isReasoningOpen ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${isReasoningOpen ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                          color: isReasoningOpen ? '#34d399' : 'var(--text-muted)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.2s'
                        }}
                        title="Inspect how JOY arrived at this answer"
                      >
                        <Brain size={12} />
                        <span>{isReasoningOpen ? 'Hide Reasoning' : 'View Reasoning'}</span>
                      </button>

                      {/* Feedback Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Rate:</span>
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
                          title="Too long, robotic or Q&A"
                        >
                          <ThumbsDown size={11} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Negative feedback tag prompt / Training options */}
                  {msg.sender === 'host' && fb?.status === 'selecting_tag' && (
                    <div style={{
                      marginTop: '8px',
                      padding: '10px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: '8px',
                      fontSize: '0.74rem'
                    }}>
                      <div style={{ color: '#fca5a5', marginBottom: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Sparkles size={12} />
                        <span>Train Next Wave AI Model (Select Critique Tag):</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {[
                          { id: 'off_track', label: '🔴 Off-track or robotic response', desc: 'Off-track or unnatural response' },
                          { id: 'too_lengthy', label: '🟡 Feels too lengthy', desc: 'Too verbose or long-winded' },
                          { id: 'needs_sustainability_grounding', label: '🔵 Needs Sustainability Grounding', desc: 'Missing AI & energy focus' },
                          { id: 'felt_like_qa', label: '📝 Sounded like exam Q&A', desc: 'Textbook definition rather than volley' }
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
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              fontWeight: 500,
                              transition: 'all 0.15s'
                            }}
                            title={t.desc}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Logged confirmation */}
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
                      <span>Feedback stored in Feedback Loop. Model adapts autonomously.</span>
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
                        padding: '10px 12px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: '#34d399',
                        marginBottom: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        <Sparkles size={12} />
                        <span>Chain-of-Thought & Conversational Intent</span>
                      </div>
                      <pre style={{
                        margin: 0,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '0.75rem',
                        lineHeight: 1.45,
                        color: '#cbd5e1',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        background: 'rgba(0,0,0,0.25)',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        {msg.thinking || "1. Analyzed guest statement.\n2. Grounded in AI & Sustainability knowledge.\n3. Formulated conversational follow-up."}
                      </pre>
                    </motion.div>
                  )}
                </div>
              );
            })}

            {/* Live interim text */}
            {stageStatus === 'listening_guest' && guestText && (
              <div className="conv-message" style={{ opacity: 0.7 }}>
                <div className="conv-message__header">
                  <div className="conv-message__avatar conv-message__avatar--guest">👤</div>
                  <span className="conv-message__name conv-message__name--guest" style={{ fontStyle: 'italic' }}>
                    Speaking into microphone...
                  </span>
                </div>
                <p className="conv-message__text" style={{ fontStyle: 'italic' }}>{guestText}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
