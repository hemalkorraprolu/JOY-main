import React from 'react';
import { PersonaBadge } from './PersonaBadge';

/**
 * TopBar — Ultra-thin transparent top bar.
 * 
 * Props:
 *  - hostPersonaId: string
 *  - stageStatus: string
 *  - isListening: boolean
 */
export function TopBar({ hostPersonaId, stageStatus, isListening }) {
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
            Next Wave
          </span>
        </div>
      </div>

      <div className="top-bar__center">
        <PersonaBadge personaId={hostPersonaId} />
      </div>

      <div className="top-bar__right">
        <div className="top-bar__indicator" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
          <div className="top-bar__indicator-dot top-bar__indicator-dot--online" />
          <span style={{ color: '#34d399', fontWeight: 600 }}>AI & Sustainability</span>
        </div>

        <div className="top-bar__indicator">
          <div className={`top-bar__indicator-dot ${isListening ? 'top-bar__indicator-dot--mic-on' : 'top-bar__indicator-dot--mic-off'}`} />
          <span>{isListening ? 'Mic On (Listening)' : 'Mic Standby'}</span>
        </div>
      </div>
    </div>
  );
}
