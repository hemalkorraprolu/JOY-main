import React from 'react';
import { Lock, MessageSquare, Users, Compass, Mic } from 'lucide-react';

export function TopBar({ activeTab, onTabChange, onOpenKnowledgeStudio }) {
  const tabs = [
    { id: 'ask_joy', label: 'Ask Joy', icon: MessageSquare },
    { id: 'speakers', label: 'Speakers', icon: Users },
    { id: 'guide', label: 'Event Guide', icon: Compass },
    { id: 'interview', label: 'Interview Mode', icon: Mic }
  ];

  return (
    <div className="top-bar" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 24px',
      background: 'rgba(15, 23, 42, 0.8)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(16px)',
      zIndex: 100
    }}>
      {/* Brand Identity */}
      <div className="top-bar__left" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #0284c7, #6366f1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '800',
          color: '#fff',
          fontSize: '1.1rem',
          boxShadow: '0 0 16px rgba(56, 189, 248, 0.4)'
        }}>
          J
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.02em' }}>
              Joy
            </h1>
            <span style={{
              fontSize: '0.68rem',
              background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
              color: '#000',
              fontWeight: '700',
              padding: '2px 8px',
              borderRadius: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              Official AI Assistant
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', fontWeight: '500' }}>
            Next Wave Summit
          </p>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="top-bar__center" style={{ display: 'flex', gap: '6px', background: 'rgba(0, 0, 0, 0.3)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                padding: '7px 14px',
                background: isActive ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(99, 102, 241, 0.2))' : 'transparent',
                border: isActive ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                borderRadius: '8px',
                color: isActive ? '#38bdf8' : '#94a3b8',
                fontWeight: isActive ? '600' : '500',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Knowledge Studio Action Button */}
      <div className="top-bar__right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onOpenKnowledgeStudio}
          style={{
            padding: '7px 14px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '10px',
            color: '#e2e8f0',
            fontSize: '0.85rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#38bdf8';
            e.currentTarget.style.color = '#38bdf8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.color = '#e2e8f0';
          }}
        >
          <Lock size={14} />
          <span>Knowledge Studio</span>
        </button>
      </div>
    </div>
  );
}
