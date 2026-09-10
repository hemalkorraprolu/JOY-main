import React, { useState, useRef, useEffect } from 'react';
import {
  Settings, X, Radio, Users, Cpu, Plus, Trash2, Edit3, Check,
  Sparkles, Brain, ThumbsUp, ThumbsDown, MessageSquare, Shield, BookOpen
} from 'lucide-react';
import { HOST_PERSONAS } from './PersonaBadge';

/**
 * Guest avatar palette — auto-assigned colors and emojis.
 */
const GUEST_COLORS = [
  '#1e3a5f', '#2d1b4e', '#1a3c34', '#3d2b1f', '#1b2d4f',
  '#2b1f3d', '#1f3d2b', '#3d1f2b', '#1f2b3d', '#2b3d1f'
];

const GUEST_AVATARS = ['👤', '👩‍💼', '👨‍🔬', '👩‍🏫', '🧑‍💻', '👨‍🎓', '👩‍⚕️', '🧑‍🔧', '👨‍🎤', '👩‍🚀'];

function getNextColor(index) {
  return GUEST_COLORS[index % GUEST_COLORS.length];
}

function getNextAvatar(index) {
  return GUEST_AVATARS[index % GUEST_AVATARS.length];
}

export function SettingsModal({
  isOpen,
  onClose,
  config = {},
  onConfigChange,
  guests = [],
  onGuestsChange,
  hostPersonaId = 'alex',
  onPersonaChange,
  transcript = [],
  onFeedback,
  onOpenKnowledgeStudio
}) {
  const dialogRef = useRef(null);
  const [activeTab, setActiveTab] = useState('conference');

  // Form state for new guest
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestRole, setNewGuestRole] = useState('');
  const [newGuestBio, setNewGuestBio] = useState('');

  // Editing guest
  const [editingGuestId, setEditingGuestId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');

  // Local config copy for editing
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const handleDialogClick = (e) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  const handleAddGuest = () => {
    if (!newGuestName.trim()) return;

    const guestCount = guests.length;
    const newGuest = {
      id: `guest_${Date.now()}`,
      name: newGuestName.trim(),
      role: newGuestRole.trim() || 'Speaker / Participant',
      bio: newGuestBio.trim(),
      color: getNextColor(guestCount),
      avatar: getNextAvatar(guestCount),
      isActive: true
    };

    onGuestsChange([...guests, newGuest]);
    setNewGuestName('');
    setNewGuestRole('');
    setNewGuestBio('');
  };

  const handleDeleteGuest = (id) => {
    onGuestsChange(guests.filter(g => g.id !== id));
  };

  const handleSaveConfig = () => {
    if (onConfigChange) {
      onConfigChange(localConfig);
    }
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="settings-modal glass-card"
      onClick={handleDialogClick}
      style={{
        padding: 0,
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        background: 'rgba(15, 23, 42, 0.95)',
        color: '#fff',
        maxWidth: '650px',
        width: '92vw',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '85vh' }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.05rem', fontWeight: 700 }}>
            <Settings size={18} style={{ color: '#10b981' }} />
            <span>Next Wave Studio Settings</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '0 12px'
        }}>
          {[
            { id: 'conference', label: 'Event Setup', icon: Radio },
            { id: 'persona', label: 'Host Persona', icon: Sparkles },
            { id: 'guests', label: 'Speakers & Guests', icon: Users },
            { id: 'engine', label: 'RAG & AI Engine', icon: Cpu }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 14px',
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${isActive ? '#10b981' : 'transparent'}`,
                  color: isActive ? '#34d399' : '#94a3b8',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>

          {/* Conference Setup */}
          {activeTab === 'conference' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                  Event Name
                </label>
                <input
                  type="text"
                  value={localConfig.conferenceName || 'Next Wave Summit'}
                  onChange={e => setLocalConfig({ ...localConfig, conferenceName: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                  Main Track / Topic Focus
                </label>
                <input
                  type="text"
                  value={localConfig.topic || 'Decarbonizing AI: Clean Grids, Efficient Silicon & Sustainable Computing'}
                  onChange={e => setLocalConfig({ ...localConfig, topic: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              {/* Organiser Knowledge Studio Quick Banner */}
              {onOpenKnowledgeStudio && (
                <div style={{
                  padding: '14px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shield size={15} />
                      Organiser Knowledge Studio
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '2px' }}>
                      Upload event PDFs, manage speaker profiles, and configure voice consent.
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenKnowledgeStudio();
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                      border: 'none',
                      color: '#000',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Open Studio
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Persona Selector */}
          {activeTab === 'persona' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                Select Joy's active host style & conversational persona:
              </div>

              {Object.entries(HOST_PERSONAS).map(([key, persona]) => {
                const isSelected = hostPersonaId === key;
                return (
                  <div
                    key={key}
                    onClick={() => onPersonaChange?.(key)}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${isSelected ? '#10b981' : 'rgba(255, 255, 255, 0.08)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem', color: isSelected ? '#34d399' : '#fff' }}>
                        <span>{persona.name}</span>
                        <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.1)', color: '#cbd5e1' }}>
                          {persona.style}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                        {persona.description}
                      </div>
                    </div>

                    {isSelected && (
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
                        <Check size={14} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Speakers & Guests */}
          {activeTab === 'guests' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {guests.map(guest => (
                  <div
                    key={guest.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.2rem' }}>{guest.avatar || '👤'}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#f1f5f9' }}>{guest.name}</div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{guest.role}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteGuest(guest.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                      title="Remove guest"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Guest Form */}
              <div style={{
                padding: '14px',
                borderRadius: '10px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#34d399' }}>+ Add Speaker / Panel Guest</div>
                <input
                  type="text"
                  placeholder="Full Name (e.g. Dr. Elena Rostova)"
                  value={newGuestName}
                  onChange={e => setNewGuestName(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '8px 10px', color: '#fff', fontSize: '0.8rem' }}
                />
                <input
                  type="text"
                  placeholder="Role / Organization (e.g. Head of AI Ethics)"
                  value={newGuestRole}
                  onChange={e => setNewGuestRole(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '8px 10px', color: '#fff', fontSize: '0.8rem' }}
                />
                <button
                  onClick={handleAddGuest}
                  disabled={!newGuestName.trim()}
                  style={{
                    background: newGuestName.trim() ? 'linear-gradient(135deg, #10b981, #06b6d4)' : 'rgba(255,255,255,0.1)',
                    border: 'none',
                    color: newGuestName.trim() ? '#000' : 'rgba(255,255,255,0.3)',
                    borderRadius: '6px',
                    padding: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: newGuestName.trim() ? 'pointer' : 'not-allowed'
                  }}
                >
                  Add Speaker
                </button>
              </div>
            </div>
          )}

          {/* Engine & RAG Settings */}
          {activeTab === 'engine' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                  Groq API Key (Optional Override)
                </label>
                <input
                  type="password"
                  placeholder="gsk_..."
                  value={localConfig.groqApiKey || ''}
                  onChange={e => setLocalConfig({ ...localConfig, groqApiKey: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                />
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                  If left empty, Joy uses the secure server-side Groq key configured on Render backend.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '10px'
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveConfig}
            style={{
              background: 'linear-gradient(135deg, #10b981, #06b6d4)',
              border: 'none',
              color: '#000',
              borderRadius: '8px',
              padding: '8px 18px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </dialog>
  );
}
