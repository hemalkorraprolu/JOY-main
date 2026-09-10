import React from 'react';
import { Calendar, MapPin, Ticket, MessageSquare, ShieldAlert, Bell, HelpCircle, Layers, ArrowRight } from 'lucide-react';

const GUIDE_CATEGORIES = [
  {
    id: 'schedule',
    title: 'Event Schedule & Timelines',
    icon: Calendar,
    color: '#38bdf8',
    description: 'Summit keynote times, track sessions, breaks, networking hours, and closing remarks.',
    sampleQuery: 'What is the full schedule for Next Wave Summit?'
  },
  {
    id: 'venue',
    title: 'Venue, Parking & Logistics',
    icon: MapPin,
    color: '#34d399',
    description: 'Hall maps, entrance directions, parking options, accessibility, and local transport.',
    sampleQuery: 'Where is the Next Wave Summit venue located and how do I get there?'
  },
  {
    id: 'registration',
    title: 'Registration & Check-In',
    icon: Ticket,
    color: '#f43f5e',
    description: 'Badge pickup desks, QR code check-in, student ID requirements, and delegate passes.',
    sampleQuery: 'How does registration and badge pickup work at the summit?'
  },
  {
    id: 'sessions',
    title: 'Sessions & Panel Tracks',
    icon: Layers,
    color: '#a855f7',
    description: 'AI hardware efficiency, green computing, grid-interactive datacenters, and student research.',
    sampleQuery: 'What sessions and panel tracks are featured at Next Wave Summit?'
  },
  {
    id: 'policies',
    title: 'Policies & Participant Guidelines',
    icon: ShieldAlert,
    color: '#fbbf24',
    description: 'Code of conduct, wifi access details, photography policies, and sustainability commitments.',
    sampleQuery: 'What are the attendee guidelines and code of conduct for Next Wave Summit?'
  },
  {
    id: 'announcements',
    title: 'Official Announcements',
    icon: Bell,
    color: '#818cf8',
    description: 'Live updates, room changes, emergency alerts, and organizer notifications.',
    sampleQuery: 'What are the latest official announcements for Next Wave Summit?'
  }
];

export function EventGuideView({ onSelectQuery }) {
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px', color: '#f8fafc' }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '700', margin: '0 0 8px 0', background: 'linear-gradient(135deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Next Wave Summit Event Guide
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '640px', margin: '0 auto' }}>
          Explore key information categories below. Click any section to ask Joy for verified summit details.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {GUIDE_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <div
              key={cat.id}
              onClick={() => onSelectQuery && onSelectQuery(cat.sampleQuery)}
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                backdropFilter: 'blur(12px)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = cat.color;
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: `${cat.color}15`,
                  border: `1px solid ${cat.color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  color: cat.color
                }}>
                  <Icon size={24} />
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#f8fafc', margin: '0 0 8px 0' }}>
                  {cat.title}
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                  {cat.description}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: cat.color, fontSize: '0.85rem', fontWeight: '600' }}>
                <span>Ask Joy about this</span>
                <ArrowRight size={14} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
