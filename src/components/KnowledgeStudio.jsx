import React, { useState, useEffect } from 'react';
import { Lock, Upload, FileText, UserPlus, ShieldCheck, Search, Trash2, Eye, EyeOff, CheckCircle, AlertTriangle, RefreshCw, Plus, Edit, X } from 'lucide-react';

export function KnowledgeStudio({ isOpen, onClose }) {
  // Auth state
  const [authenticated, setAuthenticated] = useState(() => {
    return localStorage.getItem('joy_organiser_secret') ? true : false;
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Active Tab: 'knowledge', 'speakers', 'voice_consent', 'rag_test'
  const [activeTab, setActiveTab] = useState('knowledge');

  // Event Knowledge State
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('general');
  const [uploadSource, setUploadSource] = useState('');
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploadVisibility, setUploadVisibility] = useState('public');
  const [uploadNotes, setUploadNotes] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState({ type: '', text: '' });

  // Speaker Library State
  const [speakers, setSpeakers] = useState([]);
  const [loadingSpeakers, setLoadingSpeakers] = useState(false);
  const [showSpeakerModal, setShowSpeakerModal] = useState(false);
  const [speakerForm, setSpeakerForm] = useState({
    full_name: '',
    role: '',
    organization: '',
    short_bio: '',
    long_background: '',
    achievements: '',
    topics: '',
    links: '',
    photo_url: '',
    visibility: 'public',
    approval_status: 'approved'
  });

  // Voice Consent State
  const [voiceConsentLogs, setVoiceConsentLogs] = useState([]);
  const [consentSpeakerId, setConsentSpeakerId] = useState('');
  const [consentName, setConsentName] = useState('');
  const [consentNotes, setConsentNotes] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);

  // RAG Test State
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState(null);
  const [testingRAG, setTestingRAG] = useState(false);

  const secret = localStorage.getItem('joy_organiser_secret') || '';

  // Auth Handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      });
      if (res.ok) {
        localStorage.setItem('joy_organiser_secret', passwordInput);
        setAuthenticated(true);
        setPasswordInput('');
      } else {
        setAuthError('Incorrect Organiser Password');
      }
    } catch (err) {
      setAuthError('Authentication server unreachable');
    }
  };

  // Fetch Documents
  const fetchDocuments = async () => {
    if (!authenticated) return;
    setLoadingDocs(true);
    try {
      const res = await fetch('/api/admin/knowledge', {
        headers: { 'X-Organiser-Secret': secret }
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Fetch Speakers
  const fetchSpeakers = async () => {
    if (!authenticated) return;
    setLoadingSpeakers(true);
    try {
      const res = await fetch('/api/admin/speakers', {
        headers: { 'X-Organiser-Secret': secret }
      });
      if (res.ok) {
        const data = await res.json();
        setSpeakers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSpeakers(false);
    }
  };

  // Fetch Voice Consent Logs
  const fetchVoiceConsentLogs = async () => {
    if (!authenticated) return;
    try {
      const res = await fetch('/api/admin/voice-consent', {
        headers: { 'X-Organiser-Secret': secret }
      });
      if (res.ok) {
        const data = await res.json();
        setVoiceConsentLogs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchDocuments();
      fetchSpeakers();
      fetchVoiceConsentLogs();
    }
  }, [authenticated]);

  // Upload Document Handler
  const handleUploadKnowledge = async (e) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      setUploadMsg({ type: 'error', text: 'Please enter a title for the document.' });
      return;
    }
    if (!selectedFile && !pastedText.trim()) {
      setUploadMsg({ type: 'error', text: 'Please select a file or paste text content.' });
      return;
    }

    setUploading(true);
    setUploadMsg({ type: '', text: '' });

    const formData = new FormData();
    formData.append('title', uploadTitle);
    formData.append('category', uploadCategory);
    formData.append('source', uploadSource);
    formData.append('date', uploadDate);
    formData.append('visibility', uploadVisibility);
    formData.append('notes', uploadNotes);
    if (pastedText) formData.append('pasted_text', pastedText);
    if (selectedFile) formData.append('file', selectedFile);

    try {
      const res = await fetch('/api/admin/knowledge/upload', {
        method: 'POST',
        headers: { 'X-Organiser-Secret': secret },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setUploadMsg({ type: 'success', text: `Success: ${data.message}` });
        setUploadTitle('');
        setPastedText('');
        setSelectedFile(null);
        fetchDocuments();
      } else {
        const err = await res.json();
        setUploadMsg({ type: 'error', text: err.detail || 'Upload failed' });
      }
    } catch (err) {
      setUploadMsg({ type: 'error', text: 'Server connection error' });
    } finally {
      setUploading(false);
    }
  };

  // Toggle Publish
  const handleTogglePublish = async (doc) => {
    try {
      const res = await fetch(`/api/admin/knowledge/${doc.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Organiser-Secret': secret
        },
        body: JSON.stringify({ published: !doc.published })
      });
      if (res.ok) fetchDocuments();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Document
  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Delete this knowledge document and all indexed chunks?')) return;
    try {
      const res = await fetch(`/api/admin/knowledge/${docId}`, {
        method: 'DELETE',
        headers: { 'X-Organiser-Secret': secret }
      });
      if (res.ok) fetchDocuments();
    } catch (err) {
      console.error(err);
    }
  };

  // Create Speaker Profile
  const handleSaveSpeaker = async (e) => {
    e.preventDefault();
    if (!speakerForm.full_name.trim()) return;

    try {
      const res = await fetch('/api/admin/speakers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Organiser-Secret': secret
        },
        body: JSON.stringify(speakerForm)
      });
      if (res.ok) {
        setShowSpeakerModal(false);
        setSpeakerForm({
          full_name: '',
          role: '',
          organization: '',
          short_bio: '',
          long_background: '',
          achievements: '',
          topics: '',
          links: '',
          photo_url: '',
          visibility: 'public',
          approval_status: 'approved'
        });
        fetchSpeakers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Speaker
  const handleDeleteSpeaker = async (spkId) => {
    if (!window.confirm('Delete this speaker profile?')) return;
    try {
      const res = await fetch(`/api/admin/speakers/${spkId}`, {
        method: 'DELETE',
        headers: { 'X-Organiser-Secret': secret }
      });
      if (res.ok) fetchSpeakers();
    } catch (err) {
      console.error(err);
    }
  };

  // Log Voice Consent
  const handleLogVoiceConsent = async (e) => {
    e.preventDefault();
    if (!consentSpeakerId || !consentName || !consentChecked) return;

    try {
      const res = await fetch('/api/admin/voice-consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Organiser-Secret': secret
        },
        body: JSON.stringify({
          speaker_id: consentSpeakerId,
          consented_by: consentName,
          notes: consentNotes
        })
      });
      if (res.ok) {
        setConsentSpeakerId('');
        setConsentName('');
        setConsentNotes('');
        setConsentChecked(false);
        fetchVoiceConsentLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // RAG Test Search
  const handleRunRAGTest = async (e) => {
    e.preventDefault();
    if (!testQuery.trim()) return;
    setTestingRAG(true);
    try {
      const formData = new FormData();
      formData.append('query', testQuery);
      const res = await fetch('/api/admin/rag-test', {
        method: 'POST',
        headers: { 'X-Organiser-Secret': secret },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setTestResults(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTestingRAG(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(11, 15, 25, 0.85)',
      backdropFilter: 'blur(16px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#0f172a',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '1000px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        overflow: 'hidden',
        color: '#f8fafc'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.8)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <Lock size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Knowledge Studio</h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>Organiser Admin Area • Next Wave Summit</p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px'
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Lock Screen if Not Authenticated */}
        {!authenticated ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', maxWidth: '420px', margin: '0 auto' }}>
            <Lock size={48} style={{ color: '#38bdf8', marginBottom: '16px' }} />
            <h4 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '8px' }}>Organiser Authentication</h4>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '24px' }}>
              Enter the organiser password to upload knowledge, manage speakers, and inspect RAG indexes.
            </p>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="password"
                placeholder="Organiser Password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                style={{
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />
              {authError && <p style={{ color: '#f43f5e', fontSize: '0.85rem', margin: 0 }}>{authError}</p>}

              <button
                type="submit"
                style={{
                  padding: '12px',
                  background: 'linear-gradient(135deg, #0284c7, #6366f1)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '0.95rem'
                }}
              >
                Authenticate & Unlock
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(15, 23, 42, 0.4)',
              overflowX: 'auto'
            }}>
              {[
                { id: 'knowledge', label: 'Event Knowledge', icon: FileText },
                { id: 'speakers', label: 'Speaker Library', icon: UserPlus },
                { id: 'voice_consent', label: 'Voice Consent Audit', icon: ShieldCheck },
                { id: 'rag_test', label: 'RAG Search Studio', icon: Search }
              ].map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      padding: '14px 20px',
                      background: active ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                      border: 'none',
                      borderBottom: active ? '2px solid #38bdf8' : '2px solid transparent',
                      color: active ? '#38bdf8' : '#94a3b8',
                      fontWeight: active ? '600' : '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      whiteSpace: 'nowrap',
                      fontSize: '0.9rem'
                    }}
                  >
                    <Icon size={16} /> {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>

              {/* TAB 1: Event Knowledge */}
              {activeTab === 'knowledge' && (
                <div>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: '600' }}>Upload & Index Event Material</h4>

                  <form onSubmit={handleUploadKnowledge} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '32px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Title *</label>
                        <input
                          type="text"
                          placeholder="e.g. Summit Keynote Schedule"
                          value={uploadTitle}
                          onChange={(e) => setUploadTitle(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '0.9rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Category</label>
                        <select
                          value={uploadCategory}
                          onChange={(e) => setUploadCategory(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '0.9rem' }}
                        >
                          <option value="general">General</option>
                          <option value="schedule">Schedule</option>
                          <option value="venue">Venue & Logistics</option>
                          <option value="registration">Registration</option>
                          <option value="sessions">Sessions & Panels</option>
                          <option value="announcements">Announcements</option>
                          <option value="policies">Policies & Guidelines</option>
                          <option value="faqs">FAQs</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Source Label</label>
                        <input
                          type="text"
                          placeholder="e.g. Event Schedule, updated 12 Sep"
                          value={uploadSource}
                          onChange={(e) => setUploadSource(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '0.9rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Visibility</label>
                        <select
                          value={uploadVisibility}
                          onChange={(e) => setUploadVisibility(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '0.9rem' }}
                        >
                          <option value="public">Public (Used for public chat answers)</option>
                          <option value="internal">Internal (Organisers only)</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Attach File (TXT, MD, PDF, DOCX, PPTX, CSV, XLSX, PNG, JPG)</label>
                        <input
                          type="file"
                          accept=".txt,.md,.pdf,.docx,.pptx,.csv,.xlsx,.png,.jpg,.jpeg"
                          onChange={(e) => setSelectedFile(e.target.files[0])}
                          style={{ color: '#94a3b8', fontSize: '0.85rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Or Paste Raw Text</label>
                        <textarea
                          placeholder="Paste event document text here..."
                          rows={3}
                          value={pastedText}
                          onChange={(e) => setPastedText(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem', resize: 'vertical' }}
                        />
                      </div>
                    </div>

                    {uploadMsg.text && (
                      <div style={{ padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.88rem', background: uploadMsg.type === 'success' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(244, 63, 94, 0.1)', color: uploadMsg.type === 'success' ? '#34d399' : '#f43f5e', border: `1px solid ${uploadMsg.type === 'success' ? 'rgba(52, 211, 153, 0.3)' : 'rgba(244, 63, 94, 0.3)'}` }}>
                        {uploadMsg.text}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={uploading}
                      style={{
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #0284c7, #6366f1)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <Upload size={16} /> {uploading ? 'Processing & Indexing...' : 'Upload & Index Material'}
                    </button>
                  </form>

                  <h4 style={{ margin: '0 0 14px 0', fontSize: '1.1rem', fontWeight: '600' }}>Uploaded Event Knowledge Documents</h4>
                  {loadingDocs ? (
                    <p style={{ color: '#64748b' }}>Loading documents...</p>
                  ) : documents.length === 0 ? (
                    <p style={{ color: '#64748b' }}>No documents uploaded yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {documents.map(doc => (
                        <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>{doc.title}</h5>
                              <span style={{ fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>{doc.category}</span>
                              <span style={{ fontSize: '0.72rem', background: doc.published ? 'rgba(52, 211, 153, 0.1)' : 'rgba(244, 63, 94, 0.1)', color: doc.published ? '#34d399' : '#f43f5e', padding: '2px 6px', borderRadius: '4px' }}>
                                {doc.published ? 'Published' : 'Unpublished'}
                              </span>
                            </div>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                              Source: {doc.source || 'N/A'} • Created: {doc.created_at?.slice(0, 10)} • Status: {doc.status}
                            </p>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              onClick={() => handleTogglePublish(doc)}
                              title={doc.published ? 'Unpublish' : 'Publish'}
                              style={{ background: 'transparent', border: 'none', color: doc.published ? '#34d399' : '#64748b', cursor: 'pointer' }}
                            >
                              {doc.published ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>

                            <button
                              onClick={() => handleDeleteDoc(doc.id)}
                              title="Delete"
                              style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer' }}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Speaker Library */}
              {activeTab === 'speakers' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>Speaker Library Management</h4>
                    <button
                      onClick={() => setShowSpeakerModal(true)}
                      style={{
                        padding: '8px 14px',
                        background: 'linear-gradient(135deg, #0284c7, #6366f1)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.85rem'
                      }}
                    >
                      <Plus size={16} /> Add Speaker Profile
                    </button>
                  </div>

                  {speakers.length === 0 ? (
                    <p style={{ color: '#64748b' }}>No speaker profiles created yet.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                      {speakers.map(spk => (
                        <div key={spk.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px' }}>
                          <h5 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: '700' }}>{spk.full_name}</h5>
                          <p style={{ margin: '0 0 8px 0', fontSize: '0.82rem', color: '#38bdf8' }}>{spk.role} • {spk.organization}</p>
                          <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.4' }}>{spk.short_bio || 'No bio added yet.'}</p>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                              onClick={() => handleDeleteSpeaker(spk.id)}
                              style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Speaker Modal */}
                  {showSpeakerModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                      <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', padding: '24px', maxWidth: '520px', width: '100%', color: '#fff' }}>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: '700' }}>Create Speaker Profile</h4>

                        <form onSubmit={handleSaveSpeaker} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <input type="text" placeholder="Full Name *" value={speakerForm.full_name} onChange={(e) => setSpeakerForm({...speakerForm, full_name: e.target.value})} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }} />
                          <input type="text" placeholder="Role / Title" value={speakerForm.role} onChange={(e) => setSpeakerForm({...speakerForm, role: e.target.value})} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }} />
                          <input type="text" placeholder="Organization" value={speakerForm.organization} onChange={(e) => setSpeakerForm({...speakerForm, organization: e.target.value})} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }} />
                          <textarea placeholder="Short Bio" rows={2} value={speakerForm.short_bio} onChange={(e) => setSpeakerForm({...speakerForm, short_bio: e.target.value})} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }} />
                          <input type="text" placeholder="Key Topics (comma separated)" value={speakerForm.topics} onChange={(e) => setSpeakerForm({...speakerForm, topics: e.target.value})} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }} />

                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                            <button type="button" onClick={() => setShowSpeakerModal(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}>Cancel</button>
                            <button type="submit" style={{ padding: '8px 16px', background: '#0284c7', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600' }}>Save Profile</button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Voice Consent Audit */}
              {activeTab === 'voice_consent' && (
                <div>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: '600' }}>OpenVoice V2 Consent Audit Logger</h4>

                  <form onSubmit={handleLogVoiceConsent} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Select Speaker *</label>
                        <select value={consentSpeakerId} onChange={(e) => setConsentSpeakerId(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}>
                          <option value="">-- Select Speaker --</option>
                          {speakers.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Consented By (Full Name) *</label>
                        <input type="text" placeholder="e.g. Dr. Sarah Lin" value={consentName} onChange={(e) => setConsentName(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }} />
                      </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#fbbf24', cursor: 'pointer' }}>
                        <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} />
                        I confirm that explicit consent has been granted for voice style adaptation. Never clone without permission.
                      </label>
                    </div>

                    <button type="submit" disabled={!consentChecked || !consentSpeakerId} style={{ padding: '8px 16px', background: '#34d399', border: 'none', borderRadius: '6px', color: '#000', fontWeight: '700', cursor: 'pointer' }}>
                      Log Voice Consent Audit Record
                    </button>
                  </form>

                  <h5 style={{ margin: '0 0 12px 0', fontSize: '0.95rem' }}>Audit Log History</h5>
                  {voiceConsentLogs.length === 0 ? <p style={{ color: '#64748b' }}>No consent records logged.</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {voiceConsentLogs.map(log => (
                        <div key={log.id} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '0.85rem' }}>
                          <span style={{ color: '#34d399', fontWeight: '600' }}>Consented by {log.consented_by}</span> • {log.created_at?.slice(0, 10)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: RAG Test Studio */}
              {activeTab === 'rag_test' && (
                <div>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: '600' }}>Admin RAG Search & Chunk Inspector</h4>

                  <form onSubmit={handleRunRAGTest} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                    <input
                      type="text"
                      placeholder="Enter search query to inspect matching chunks..."
                      value={testQuery}
                      onChange={(e) => setTestQuery(e.target.value)}
                      style={{ flex: 1, padding: '10px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.95rem' }}
                    />
                    <button type="submit" disabled={testingRAG} style={{ padding: '10px 20px', background: '#0284c7', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: '600', cursor: 'pointer' }}>
                      {testingRAG ? 'Searching...' : 'Run RAG Search'}
                    </button>
                  </form>

                  {testResults && (
                    <div>
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '14px' }}>
                        Found <strong style={{ color: '#38bdf8' }}>{testResults.matched_chunks_count}</strong> matching chunks for "{testResults.query}"
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {testResults.results.map((res, idx) => (
                          <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <h5 style={{ margin: 0, color: '#38bdf8', fontSize: '0.95rem' }}>{res.title} ({res.category})</h5>
                              <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: '600' }}>Relevance Score: {res.score.toFixed(1)}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.4' }}>{res.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </>
        )}
      </div>
    </div>
  );
}
