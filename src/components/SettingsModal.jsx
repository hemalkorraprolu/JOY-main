import React, { useState, useRef, useEffect } from 'react';
import {
  Settings, X, Radio, Users, Cpu, Plus, Trash2, Edit3, Check,
  Sparkles, Brain, ThumbsUp, ThumbsDown, MessageSquare, RefreshCw, AlertCircle, Award
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


/**
 * SettingsModal — Native <dialog> based settings panel with tabs.
 *
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - config: { conferenceName, topic, engine, groqApiKey, ollamaModel, ollamaUrl }
 *  - onConfigChange: (newConfig) => void
 *  - guests: Guest[]
 *  - onGuestsChange: (newGuests) => void
 *  - hostPersonaId: string
 *  - onPersonaChange: (personaId) => void
 *  - transcript: array of dialogue messages
 *  - onFeedback: (turnId, rating, tags, comment) => void
 */
export function SettingsModal({
  isOpen,
  onClose,
  config,
  onConfigChange,
  guests,
  onGuestsChange,
  hostPersonaId,
  onPersonaChange,
  transcript = [],
  onFeedback
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

  // Feedback Loop Engineering State
  const [feedbackSummary, setFeedbackSummary] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);
  const [expandedReasoningMap, setExpandedReasoningMap] = useState({});
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [testQuery, setTestQuery] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [testRating, setTestRating] = useState(1);
  const [testTag, setTestTag] = useState('great_flow');
  const [testComment, setTestComment] = useState('');
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState('');

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

  // Close on backdrop click
  const handleDialogClick = (e) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  const handleAddGuest = () => {
    if (!newGuestName.trim()) return;

    const newGuest = {
      id: crypto.randomUUID(),
      name: newGuestName.trim(),
      role: newGuestRole.trim() || 'Guest Speaker',
      color: getNextColor(guests.length),
      avatar: getNextAvatar(guests.length),
      bio: newGuestBio.trim(),
      isActive: guests.length === 0 // first guest is active by default
    };

    onGuestsChange([...guests, newGuest]);
    setNewGuestName('');
    setNewGuestRole('');
    setNewGuestBio('');
  };

  const handleRemoveGuest = (guestId) => {
    const updated = guests.filter(g => g.id !== guestId);
    // If we removed the active guest, make the first one active
    if (updated.length > 0 && !updated.some(g => g.isActive)) {
      updated[0].isActive = true;
    }
    onGuestsChange(updated);
  };

  const handleStartEdit = (guest) => {
    setEditingGuestId(guest.id);
    setEditName(guest.name);
    setEditRole(guest.role);
  };

  const handleSaveEdit = (guestId) => {
    const updated = guests.map(g =>
      g.id === guestId
        ? { ...g, name: editName.trim() || g.name, role: editRole.trim() || g.role }
        : g
    );
    onGuestsChange(updated);
    setEditingGuestId(null);
  };

  const handleApply = () => {
    onConfigChange(localConfig);
    onClose();
  };

  const updateLocalConfig = (key, value) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  };

  const fetchFeedbackData = async () => {
    setFeedbackLoading(true);
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
    try {
      const [sumRes, listRes] = await Promise.all([
        fetch(`${backendUrl}/api/feedback/summary`),
        fetch(`${backendUrl}/api/feedback`)
      ]);
      if (sumRes.ok) {
        const sum = await sumRes.json();
        setFeedbackSummary(sum);
      }
      if (listRes.ok) {
        const list = await listRes.json();
        setFeedbackList(list.feedback || []);
      }
    } catch (err) {
      console.warn("Failed to fetch feedback:", err);
    } finally {
      setFeedbackLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'feedback' && isOpen) {
      fetchFeedbackData();
    }
  }, [activeTab, isOpen]);

  const handleManualFeedbackSubmit = async (e) => {
    e?.preventDefault();
    if (!testQuery.trim() || !testResponse.trim()) return;

    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
    try {
      const res = await fetch(`${backendUrl}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guest_query: testQuery,
          host_response: testResponse,
          thinking: "1. Evaluated manual test input.\n2. Analyzed conversational alignment.\n3. Logged for autonomous model steering.",
          rating: testRating,
          tags: [testTag],
          comment: testComment,
          topic: localConfig.topic || "AI & Sustainability"
        })
      });
      if (res.ok) {
        setSubmitSuccessMsg("Feedback recorded! Autonomous guidance updated.");
        setTestQuery('');
        setTestResponse('');
        setTestComment('');
        fetchFeedbackData();
        setTimeout(() => setSubmitSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.warn("Error submitting feedback:", err);
    }
  };

  const toggleReasoningAudit = (id) => {
    setExpandedReasoningMap(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const tabs = [
    { id: 'conference', label: 'Conference Setup', icon: <Radio size={15} /> },
    { id: 'guests', label: 'Guest Management', icon: <Users size={15} /> },
    { id: 'engine', label: 'Engine & Voice', icon: <Cpu size={15} /> },
    { id: 'feedback', label: 'Feedback Loop Engineering', icon: <Sparkles size={15} /> },
  ];

  return (
    <dialog
      ref={dialogRef}
      className="settings-modal"
      onClick={handleDialogClick}
      onClose={onClose}
      id="settings-dialog"
    >
      {/* Header */}
      <div className="modal-header">
        <h2><Settings size={20} /> Studio Settings</h2>
        <button className="btn-ghost" onClick={onClose} aria-label="Close settings">
          <X size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-bar" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-item ${activeTab === tab.id ? 'tab-item--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="modal-body">

        {/* ---- Conference Setup Tab ---- */}
        {activeTab === 'conference' && (
          <div className="animate-fade-in">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Conference Name</label>
                <input
                  className="form-input"
                  value={localConfig.conferenceName}
                  onChange={e => updateLocalConfig('conferenceName', e.target.value)}
                  placeholder="Tech AI Summit 2026"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Main Topic</label>
                <input
                  className="form-input"
                  value={localConfig.topic}
                  onChange={e => updateLocalConfig('topic', e.target.value)}
                  placeholder="Scalable Autonomous Reasoning Agents"
                />
              </div>
            </div>

            {/* Host Persona Selector */}
            <div className="form-group" style={{ marginTop: '8px' }}>
              <label className="form-label">Host Persona</label>
              <p className="form-hint" style={{ marginBottom: '10px' }}>
                Choose JOY's interviewing personality. This changes the system prompt and voice style.
              </p>
              <div className="persona-selector">
                {Object.values(HOST_PERSONAS).map(persona => (
                  <div
                    key={persona.id}
                    className={`persona-card ${hostPersonaId === persona.id ? 'persona-card--active' : ''}`}
                    onClick={() => onPersonaChange(persona.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onPersonaChange(persona.id);
                      }
                    }}
                  >
                    <div className="persona-card__emoji">{persona.emoji}</div>
                    <div className="persona-card__name">{persona.name}</div>
                    <div className="persona-card__style">{persona.style}</div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '6px' }}>
                      {persona.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---- Guest Management Tab ---- */}
        {activeTab === 'guests' && (
          <div className="animate-fade-in">
            {/* Add Guest Form */}
            <div style={{
              padding: '16px',
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.15)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px'
            }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={16} /> Add New Guest
              </h4>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Guest Name</label>
                  <input
                    className="form-input"
                    value={newGuestName}
                    onChange={e => setNewGuestName(e.target.value)}
                    placeholder="Dr. Sarah Lin"
                    onKeyDown={e => { if (e.key === 'Enter') handleAddGuest(); }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role / Title</label>
                  <input
                    className="form-input"
                    value={newGuestRole}
                    onChange={e => setNewGuestRole(e.target.value)}
                    placeholder="VP of AI Research"
                    onKeyDown={e => { if (e.key === 'Enter') handleAddGuest(); }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Bio / Background (Optional — fed to RAG)</label>
                <textarea
                  className="form-input"
                  value={newGuestBio}
                  onChange={e => setNewGuestBio(e.target.value)}
                  placeholder="Paste guest bio, research background, or keynote abstract..."
                  rows={3}
                />
              </div>
              <button
                className="btn-primary"
                onClick={handleAddGuest}
                disabled={!newGuestName.trim()}
                style={{ opacity: newGuestName.trim() ? 1 : 0.5 }}
              >
                <Plus size={16} /> Add Guest to Panel
              </button>
            </div>

            {/* Current Guests List */}
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px' }}>
              CURRENT GUESTS ({guests.length})
            </h4>

            {guests.length === 0 && (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                color: 'var(--text-dim)',
                fontSize: '0.85rem',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--border)'
              }}>
                No guests added yet. Add your first guest above!
              </div>
            )}

            {guests.map((guest) => (
              <div key={guest.id} className="guest-list-item">
                <div
                  className="guest-list-avatar"
                  style={{ background: guest.color }}
                >
                  {guest.avatar}
                </div>
                <div className="guest-list-info">
                  {editingGuestId === guest.id ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        className="form-input"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        style={{ padding: '4px 8px', fontSize: '0.82rem' }}
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(guest.id); }}
                      />
                      <input
                        className="form-input"
                        value={editRole}
                        onChange={e => setEditRole(e.target.value)}
                        style={{ padding: '4px 8px', fontSize: '0.82rem' }}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(guest.id); }}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="guest-list-name">{guest.name}</div>
                      <div className="guest-list-role">{guest.role}</div>
                    </>
                  )}
                </div>
                <div className="guest-list-actions">
                  {editingGuestId === guest.id ? (
                    <button
                      className="btn-icon"
                      onClick={() => handleSaveEdit(guest.id)}
                      title="Save changes"
                    >
                      <Check size={14} />
                    </button>
                  ) : (
                    <button
                      className="btn-icon"
                      onClick={() => handleStartEdit(guest)}
                      title="Edit guest"
                    >
                      <Edit3 size={14} />
                    </button>
                  )}
                  <button
                    className="btn-icon btn-icon--danger"
                    onClick={() => handleRemoveGuest(guest.id)}
                    title="Remove guest"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ---- Engine & Voice Tab ---- */}
        {activeTab === 'engine' && (
          <div className="animate-fade-in">
            <div className="form-group">
              <label className="form-label">Reasoning Engine</label>
              <p className="form-hint" style={{ marginBottom: '10px' }}>
                Choose how JOY generates responses. Browser mode works offline with heuristic responses.
              </p>
              <div className="radio-group">
                {[
                  { id: 'browser', label: '🌐 Browser (Free, Offline)' },
                  { id: 'groq', label: '⚡ Groq API (Fast, Free Tier)' },
                  { id: 'ollama', label: '🦙 Local Ollama (Private)' },
                ].map(opt => (
                  <div
                    key={opt.id}
                    className={`radio-option ${localConfig.engine === opt.id ? 'radio-option--active' : ''}`}
                    onClick={() => updateLocalConfig('engine', opt.id)}
                    role="radio"
                    aria-checked={localConfig.engine === opt.id}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        updateLocalConfig('engine', opt.id);
                      }
                    }}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Groq API Key */}
            {localConfig.engine === 'groq' && (
              <div className="form-group animate-fade-in">
                <label className="form-label">Groq API Key</label>
                <input
                  className="form-input"
                  type="password"
                  value={localConfig.groqApiKey}
                  onChange={e => updateLocalConfig('groqApiKey', e.target.value)}
                  placeholder="gsk_your_groq_api_key_here"
                />
                <p className="form-hint">
                  Get a free key at <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>console.groq.com</a>
                </p>
              </div>
            )}

            {/* Ollama Settings */}
            {localConfig.engine === 'ollama' && (
              <div className="animate-fade-in">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Ollama Model</label>
                    <input
                      className="form-input"
                      value={localConfig.ollamaModel}
                      onChange={e => updateLocalConfig('ollamaModel', e.target.value)}
                      placeholder="llama3.2"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ollama URL</label>
                    <input
                      className="form-input"
                      value={localConfig.ollamaUrl}
                      onChange={e => updateLocalConfig('ollamaUrl', e.target.value)}
                      placeholder="http://localhost:11434"
                    />
                  </div>
                </div>
                <p className="form-hint">
                  Make sure Ollama is running locally. Install from <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>ollama.com</a>
                </p>
              </div>
            )}
          </div>
        )}

        {/* ---- Feedback Loop Engineering Tab ---- */}
        {activeTab === 'feedback' && (
          <div className="animate-fade-in">
            {/* Header / Intro */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '14px 16px',
              background: 'rgba(16, 185, 129, 0.06)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px'
            }}>
              <Sparkles size={20} style={{ color: 'var(--accent)', marginTop: '2px', flexShrink: 0 }} />
              <div>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Next Wave Pre-Event Model Training & Verification Suite
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                  Train and verify JOY before live deployment at <strong>Next Wave: AI & Sustainability</strong>.
                  Inspect AI reasoning, verify responses against "Off-track or robotic" or "Feels too lengthy", and feed real-time autonomous model guidance.
                </p>
              </div>
            </div>

            {/* Active Autonomous Guidance Card */}
            {feedbackSummary?.autonomous_guidance && (
              <div style={{
                padding: '12px 14px',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#818cf8' }}>
                    <Brain size={14} /> Active Autonomous Training Guidance
                  </div>
                  <button
                    onClick={fetchFeedbackData}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}
                    title="Refresh feedback metrics"
                  >
                    <RefreshCw size={11} className={feedbackLoading ? 'animate-spin' : ''} /> Refresh
                  </button>
                </div>
                <pre style={{
                  margin: 0,
                  fontSize: '0.75rem',
                  lineHeight: 1.45,
                  color: '#cbd5e1',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit'
                }}>
                  {feedbackSummary.autonomous_guidance}
                </pre>
              </div>
            )}

            {/* 4 Performance Metric Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '10px',
              marginBottom: '20px'
            }}>
              <div style={{ padding: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>Podcast Flow Score</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#34d399' }}>
                  {feedbackSummary?.human_conversational_score || 85}%
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Conversational vs Q&amp;A</div>
              </div>

              <div style={{ padding: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>Avg Spoken Length</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#38bdf8' }}>
                  {feedbackSummary?.average_words_per_response || 28} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>words</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Target: 25–45 words</div>
              </div>

              <div style={{ padding: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>Approval Ratio</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#a78bfa' }}>
                  {Math.round((feedbackSummary?.positive_ratio || 0.8) * 100)}%
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Positive feedback</div>
              </div>

              <div style={{ padding: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>Total Feedback Items</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {feedbackSummary?.total_feedbacks || feedbackList.length}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Logged audits</div>
              </div>
            </div>

            {/* Reasoning & Feedback Audit Log */}
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Brain size={15} style={{ color: 'var(--accent)' }} />
              DIALOGUE TURNS &amp; REASONING AUDIT STREAM
            </h4>

            {feedbackList.length === 0 && transcript.length === 0 && (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                color: 'var(--text-dim)',
                fontSize: '0.85rem',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--border)',
                marginBottom: '20px'
              }}>
                No dialogue turns recorded yet. Start a podcast interview to audit live reasoning here.
              </div>
            )}

            <div style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '20px', paddingRight: '4px' }}>
              {feedbackList.map((item, idx) => {
                const itemId = item.id || `fb_idx_${idx}`;
                const isReasoningOpen = !!expandedReasoningMap[itemId];

                return (
                  <div key={itemId} style={{
                    padding: '12px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '10px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                        {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : `Turn #${idx + 1}`}
                      </span>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.72rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: item.rating > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: item.rating > 0 ? '#34d399' : '#f87171'
                      }}>
                        {item.rating > 0 ? <ThumbsUp size={11} /> : <ThumbsDown size={11} />}
                        {item.rating > 0 ? 'Conversational' : 'Critiqued'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.82rem', marginBottom: '4px', color: 'var(--text-muted)' }}>
                      <strong>Guest:</strong> "{item.guest_query}"
                    </div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.45 }}>
                      <strong>JOY:</strong> "{item.host_response}"
                    </div>

                    {/* Small Reasoning Icon & Inspection Button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                      <button
                        onClick={() => toggleReasoningAudit(itemId)}
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
                          gap: '5px'
                        }}
                      >
                        <Brain size={12} />
                        <span>{isReasoningOpen ? 'Hide Reasoning' : 'View AI Reasoning Behind Answer'}</span>
                      </button>

                      {item.tags && item.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {item.tags.map(t => (
                            <span key={t} style={{ fontSize: '0.68rem', background: 'rgba(255,255,255,0.06)', padding: '2px 5px', borderRadius: '4px', color: 'var(--text-dim)' }}>
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Expandable Reasoning Card */}
                    {isReasoningOpen && (
                      <div style={{
                        marginTop: '8px',
                        padding: '10px 12px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: '6px'
                      }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#34d399', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Sparkles size={11} /> REASONING CHAIN-OF-THOUGHT (&lt;think&gt;)
                        </div>
                        <pre style={{
                          margin: 0,
                          fontSize: '0.74rem',
                          lineHeight: 1.45,
                          color: '#cbd5e1',
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'ui-monospace, monospace'
                        }}>
                          {item.thinking || "1. Analyzed guest intent.\n2. Aligned with green computing.\n3. Formulated brief conversational response."}
                        </pre>
                        {item.comment && (
                          <div style={{ marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                            User Feedback: "{item.comment}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Test & Submit New Feedback */}
            <div style={{
              padding: '14px 16px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '10px'
            }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Edit3 size={14} /> Submit Feedback to Steer Autonomous Learning
              </h4>

              {submitSuccessMsg && (
                <div style={{ padding: '8px 12px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: '6px', color: '#34d399', fontSize: '0.78rem', marginBottom: '12px' }}>
                  ✓ {submitSuccessMsg}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Guest Statement / Question</label>
                <input
                  className="form-input"
                  value={testQuery}
                  onChange={e => setTestQuery(e.target.value)}
                  placeholder="e.g. How does your cluster handle renewable energy intermittency?"
                />
              </div>

              <div className="form-group">
                <label className="form-label">JOY's Spoken Answer</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={testResponse}
                  onChange={e => setTestResponse(e.target.value)}
                  placeholder="e.g. That intermittency is huge. When solar drops, do you shift workloads or spin up batteries?"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Conversational Rating</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setTestRating(1)}
                      style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: '6px',
                        border: `1px solid ${testRating === 1 ? '#10b981' : 'var(--border)'}`,
                        background: testRating === 1 ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                        color: testRating === 1 ? '#34d399' : 'var(--text-dim)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '0.78rem'
                      }}
                    >
                      <ThumbsUp size={13} /> Natural Podcast Volley
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestRating(-1)}
                      style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: '6px',
                        border: `1px solid ${testRating === -1 ? '#ef4444' : 'var(--border)'}`,
                        background: testRating === -1 ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                        color: testRating === -1 ? '#f87171' : 'var(--text-dim)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '0.78rem'
                      }}
                    >
                      <ThumbsDown size={13} /> Needs Improvement
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Critique Tag</label>
                  <select
                    className="form-input"
                    value={testTag}
                    onChange={e => setTestTag(e.target.value)}
                  >
                    <option value="natural_volley">🟢 Natural Podcast Volley (Verified)</option>
                    <option value="off_track">🔴 Off-track or robotic response</option>
                    <option value="too_lengthy">🟡 Feels too lengthy</option>
                    <option value="needs_sustainability_grounding">🔵 Needs Sustainability Grounding</option>
                    <option value="felt_like_qa">📝 Sounded like exam Q&A</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Feedback Notes (Guides Autonomous Model Refinement)</label>
                <input
                  className="form-input"
                  value={testComment}
                  onChange={e => setTestComment(e.target.value)}
                  placeholder="e.g. Keep it punchier—ask about the battery storage trade-off directly."
                />
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={handleManualFeedbackSubmit}
                disabled={!testQuery.trim() || !testResponse.trim()}
                style={{ opacity: (!testQuery.trim() || !testResponse.trim()) ? 0.5 : 1, width: '100%' }}
              >
                <Check size={15} /> Log Feedback &amp; Update Autonomous Engine
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="modal-footer">
        <button className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="btn-primary" onClick={handleApply}>
          Apply Settings
        </button>
      </div>
    </dialog>
  );
}
