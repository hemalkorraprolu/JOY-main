import React from 'react';
import { Shield } from 'lucide-react';
import { PersonaBadge } from './PersonaBadge';

/**
 * TopBar — Transparent top bar matching reference design (joy-khaki.vercel.app).
 * 
 * Props:
 *  - hostPersonaId: string
 *  - stageStatus: string
 *  - isListening: boolean
 *  - onOpenKnowledgeStudio: () => void
 */
export function TopBar({ hostPersonaId, stageStatus, isListening, onOpenKnowledgeStudio }) {
  return (
    <div className="top-bar">
      <div className="top-bar__left">
        <div className="top-bar__logo">
          <div className="top-bar__logo-orb" />
          <span>JOY</span>
          <span style={{
            fontSize: '0.7rem',
            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
            color: '#000',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '12px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase'
          }}>
            Next Wave Summit
          </span>
        </div>
      </div>

      <div className="top-bar__center">
        <PersonaBadge personaId={hostPersonaId} />
      </div>

      <div className="top-bar__right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {onOpenKnowledgeStudio && (
          <button
            onClick={onOpenKnowledgeStudio}
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#34d399',
              borderRadius: '20px',
              padding: '5px 12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(8px)'
            }}
            title="Open Organiser Knowledge Studio"
          >
            <Shield size={13} />
            <span>Knowledge Studio</span>
          </button>
        )}

        <div className="top-bar__indicator" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
          <div className="top-bar__indicator-dot top-bar__indicator-dot--online" />
          <span style={{ color: '#34d399', fontWeight: 600 }}>Next Wave AI</span>
        </div>

        <div className="top-bar__indicator">
          <div className={`top-bar__indicator-dot ${isListening ? 'top-bar__indicator-dot--mic-on' : 'top-bar__indicator-dot--mic-off'}`} />
          <span>{isListening ? 'Mic On (Listening)' : 'Mic Standby'}</span>
        </div>
      </div>
    </div>
  );
}
