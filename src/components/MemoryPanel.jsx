import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Database, FileText, Brain, Upload, Cpu, Users } from 'lucide-react';

/**
 * MemoryPanel — Floating glass panel for RAG context, indexed documents, and session stats.
 * 
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - indexedDocs: string[]
 *  - knowledgeText: string
 *  - onKnowledgeTextChange: (text) => void
 *  - onUploadKnowledge: () => void
 *  - config: object
 *  - guests: array
 *  - transcript: array
 *  - activeGuestName: string
 */
export function MemoryPanel({
  isOpen,
  onClose,
  indexedDocs = [],
  knowledgeText = '',
  onKnowledgeTextChange,
  onUploadKnowledge,
  config = {},
  guests = [],
  transcript = [],
  activeGuestName = ''
}) {
  const [uploadOpen, setUploadOpen] = useState(false);

  const turnCount = transcript.length;
  const hostTurns = transcript.filter(m => m.sender === 'host').length;
  const guestTurns = transcript.filter(m => m.sender === 'guest').length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="floating-panel floating-panel--right glass-card"
          initial={{ x: 380, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 380, opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          style={{ width: '380px', maxWidth: '92vw' }}
        >
          <div className="floating-panel__header">
            <div className="floating-panel__title">
              <Brain size={15} />
              Next Wave Memory & Context
            </div>
            <button className="floating-panel__close" onClick={onClose} aria-label="Close memory panel">
              <X size={16} />
            </button>
          </div>

          <div className="floating-panel__body" style={{ padding: '16px', overflowY: 'auto' }}>

            {/* Verified Knowledge Base */}
            <div className="memory-section" style={{ marginBottom: '16px' }}>
              <div className="memory-section__title" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#34d399',
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <FileText size={13} /> Verified Event Knowledge Base ({indexedDocs.length})
              </div>

              {indexedDocs.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '8px' }}>
                  Next Wave Summit core knowledge loaded in backend RAG database.
                </div>
              ) : (
                indexedDocs.map((doc, idx) => (
                  <div key={idx} className="memory-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    marginBottom: '6px'
                  }}>
                    <div className="memory-item__icon memory-item__icon--doc" style={{ color: '#34d399' }}>
                      <FileText size={13} />
                    </div>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#e2e8f0' }}>
                      {doc}
                    </span>
                  </div>
                ))
              )}

              {/* Upload Toggle */}
              <button
                className="knowledge-upload__btn"
                onClick={() => setUploadOpen(!uploadOpen)}
                style={{
                  marginTop: '8px',
                  width: '100%',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Upload size={14} />
                {uploadOpen ? 'Close Quick Indexer' : '+ Add Knowledge Chunk'}
              </button>

              {uploadOpen && (
                <div className="knowledge-upload" style={{ marginTop: '10px' }}>
                  <textarea
                    rows={4}
                    value={knowledgeText}
                    onChange={e => onKnowledgeTextChange?.(e.target.value)}
                    placeholder="Paste speaker bios, keynote details, or session abstracts..."
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '8px',
                      color: '#fff',
                      fontSize: '0.78rem',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                  <button
                    className="knowledge-upload__btn"
                    onClick={() => {
                      onUploadKnowledge?.();
                      setUploadOpen(false);
                    }}
                    disabled={!knowledgeText?.trim()}
                    style={{
                      marginTop: '6px',
                      width: '100%',
                      background: knowledgeText?.trim() ? 'linear-gradient(135deg, #10b981, #06b6d4)' : 'rgba(255, 255, 255, 0.08)',
                      border: 'none',
                      color: knowledgeText?.trim() ? '#000' : 'rgba(255, 255, 255, 0.3)',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: knowledgeText?.trim() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    <Database size={13} />
                    Index Knowledge to RAG Engine
                  </button>
                </div>
              )}
            </div>

            {/* Active Session Stats */}
            <div className="memory-section" style={{ marginBottom: '16px' }}>
              <div className="memory-section__title" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#67e8f9',
                marginBottom: '10px',
                textTransform: 'uppercase'
              }}>
                <Brain size={13} /> Live Session Metrics
              </div>

              <div className="memory-item" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '6px',
                fontSize: '0.78rem',
                color: '#cbd5e1'
              }}>
                <Brain size={13} style={{ color: '#67e8f9' }} />
                <span>{turnCount} total turns ({hostTurns} Joy responses, {guestTurns} user inputs)</span>
              </div>
            </div>

            {/* Engine & RAG Configuration */}
            <div className="memory-section">
              <div className="memory-section__title" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#a78bfa',
                marginBottom: '10px',
                textTransform: 'uppercase'
              }}>
                <Cpu size={13} /> Engine & RAG Status
              </div>

              <div className="memory-item" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '6px',
                fontSize: '0.78rem',
                marginBottom: '6px',
                color: '#cbd5e1'
              }}>
                <Cpu size={13} style={{ color: '#a78bfa' }} />
                <span>Backend RAG: ⚡ Groq + SQLite Vector Retrieval</span>
              </div>

              <div className="memory-item" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '6px',
                fontSize: '0.78rem',
                color: '#cbd5e1'
              }}>
                <Users size={13} style={{ color: '#a78bfa' }} />
                <span>Target Event: Next Wave Summit 2026</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
