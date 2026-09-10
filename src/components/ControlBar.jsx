import React from 'react';
import { Mic, MicOff, Square, Settings, Play, Shield, MessageSquare, Brain } from 'lucide-react';

/**
 * ControlBar — Bottom floating controls matching joy-khaki.vercel.app reference.
 * 
 * Props:
 *  - stageStatus: string
 *  - hasStarted: boolean
 *  - onStart: () => void
 *  - onToggleMic: () => void
 *  - onStop: () => void
 *  - onOpenSettings: () => void
 *  - onOpenKnowledgeStudio: () => void
 *  - onToggleLeftPanel: () => void
 *  - onToggleRightPanel: () => void
 *  - leftPanelOpen: boolean
 *  - rightPanelOpen: boolean
 */
export function ControlBar({
  stageStatus = 'idle',
  hasStarted = false,
  onStart,
  onToggleMic,
  onStop,
  onOpenSettings,
  onOpenKnowledgeStudio,
  onToggleLeftPanel,
  onToggleRightPanel,
  leftPanelOpen,
  rightPanelOpen
}) {
  const isListening = stageStatus === 'listening_guest';

  return (
    <div className="control-bar" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      padding: '8px 16px',
      borderRadius: '30px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
    }}>
      {/* Toggle Left Panel (Chat & Transcript) */}
      <button
        className={`control-btn ${leftPanelOpen ? 'control-btn--active' : ''}`}
        onClick={onToggleLeftPanel}
        title="Toggle Chat & Transcript Panel"
        aria-label="Toggle Chat & Transcript Panel"
        style={{
          background: leftPanelOpen ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
          border: `1px solid ${leftPanelOpen ? '#10b981' : 'rgba(255, 255, 255, 0.1)'}`,
          color: leftPanelOpen ? '#34d399' : '#94a3b8',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        <MessageSquare size={18} />
      </button>

      {/* Start Session / Mic Toggle */}
      {!hasStarted ? (
        <button
          className="control-btn control-btn--mic"
          onClick={onStart}
          title="Start Next Wave AI Session"
          aria-label="Start Next Wave AI Session"
          style={{
            background: 'linear-gradient(135deg, #10b981, #06b6d4)',
            border: 'none',
            color: '#000',
            padding: '10px 20px',
            borderRadius: '24px',
            fontWeight: 700,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)'
          }}
        >
          <Play size={18} />
          <span>Start Session</span>
        </button>
      ) : (
        <button
          className={`control-btn ${isListening ? 'control-btn--mic-active' : ''}`}
          onClick={onToggleMic}
          title={isListening ? 'Stop listening' : 'Start speaking'}
          aria-label={isListening ? 'Stop listening' : 'Start speaking'}
          style={{
            background: isListening ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'rgba(16, 185, 129, 0.2)',
            border: `1px solid ${isListening ? '#ef4444' : 'rgba(16, 185, 129, 0.4)'}`,
            color: isListening ? '#fff' : '#34d399',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: isListening ? '0 0 20px rgba(239, 68, 68, 0.6)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          {isListening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
      )}

      {/* Stop Session */}
      {hasStarted && (
        <button
          className="control-btn control-btn--stop"
          onClick={onStop}
          title="Stop session"
          aria-label="Stop session"
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <Square size={16} />
        </button>
      )}

      {/* Knowledge Studio Organiser Shield */}
      {onOpenKnowledgeStudio && (
        <button
          className="control-btn"
          onClick={onOpenKnowledgeStudio}
          title="Organiser Knowledge Studio"
          aria-label="Organiser Knowledge Studio"
          style={{
            background: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            color: '#67e8f9',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Shield size={18} />
        </button>
      )}

      {/* Settings */}
      <button
        className="control-btn control-btn--settings"
        onClick={onOpenSettings}
        title="Settings"
        aria-label="Open settings"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#cbd5e1',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}
      >
        <Settings size={18} />
      </button>

      {/* Toggle Right Panel (Memory & Context) */}
      <button
        className={`control-btn ${rightPanelOpen ? 'control-btn--active' : ''}`}
        onClick={onToggleRightPanel}
        title="Toggle Context & Memory Panel"
        aria-label="Toggle Context & Memory Panel"
        style={{
          background: rightPanelOpen ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
          border: `1px solid ${rightPanelOpen ? '#06b6d4' : 'rgba(255, 255, 255, 0.1)'}`,
          color: rightPanelOpen ? '#67e8f9' : '#94a3b8',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        <Brain size={18} />
      </button>
    </div>
  );
}
