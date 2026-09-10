import React, { useState, useEffect } from 'react';
import { User, Search, ExternalLink, Calendar, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import { getApiUrl } from '../services/apiClient';

export function SpeakersView({ onAskJoyAboutSpeaker }) {
  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  const fetchSpeakers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl('/api/speakers'));
      if (res.ok) {
        const data = await res.json();
        setSpeakers(data);
      } else {
        setSpeakers([]);
      }
    } catch (err) {
      console.error('Error fetching speakers:', err);
      setSpeakers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpeakers();
  }, []);

  const filteredSpeakers = speakers.filter(s => {
    const q = searchQuery.toLowerCase();
    return (
      (s.full_name && s.full_name.toLowerCase().includes(q)) ||
      (s.role && s.role.toLowerCase().includes(q)) ||
      (s.organization && s.organization.toLowerCase().includes(q)) ||
      (s.topics && s.topics.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', margin: '0 0 4px 0', background: 'linear-gradient(135deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Confirmed Speakers
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.95rem' }}>
            Official speaker library for the Next Wave Summit.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search speakers or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          <button
            onClick={fetchSpeakers}
            title="Refresh Speakers"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <p>Loading speaker library...</p>
        </div>
      ) : filteredSpeakers.length === 0 ? (
        <div style={{
          background: 'rgba(15, 23, 42, 0.5)',
          border: '1px dashed rgba(255,255,255,0.15)',
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center',
          maxWidth: '560px',
          margin: '40px auto'
        }}>
          <AlertCircle size={40} style={{ color: '#64748b', marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#e2e8f0', marginBottom: '8px' }}>
            No confirmed information yet
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: '0 0 20px 0', lineHeight: '1.5' }}>
            No confirmed speaker profiles have been published for this view yet. Please check back later or contact the Next Wave Summit organising team.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredSpeakers.map((speaker) => (
            <div
              key={speaker.id}
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                backdropFilter: 'blur(12px)',
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: speaker.photo_url ? `url(${speaker.photo_url}) center/cover` : 'linear-gradient(135deg, #0284c7, #6366f1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: '#fff',
                    flexShrink: 0
                  }}>
                    {!speaker.photo_url && (speaker.full_name ? speaker.full_name[0] : 'S')}
                  </div>

                  <div>
                    <h3 style={{ margin: '0 0 2px 0', fontSize: '1.15rem', fontWeight: '700', color: '#f8fafc' }}>
                      {speaker.full_name}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#38bdf8', fontWeight: '500' }}>
                      {speaker.role} {speaker.organization ? `• ${speaker.organization}` : ''}
                    </p>
                  </div>
                </div>

                {speaker.short_bio && (
                  <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 14px 0' }}>
                    {speaker.short_bio}
                  </p>
                )}

                {speaker.topics && (
                  <div style={{ marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                      Key Topics
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {speaker.topics.split(',').map((topic, idx) => (
                        <span
                          key={idx}
                          style={{
                            background: 'rgba(56, 189, 248, 0.1)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.2)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}
                        >
                          {topic.strip ? topic.strip() : topic.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => onAskJoyAboutSpeaker && onAskJoyAboutSpeaker(`Tell me about ${speaker.full_name}'s background and session topic at Next Wave Summit`)}
                  style={{
                    background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(99, 102, 241, 0.2))',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    color: '#38bdf8',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <BookOpen size={14} /> Ask Joy About Speaker
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
