import React, { useState } from 'react';
import { TopBar } from './TopBar';
import { ConversationPanel } from './ConversationPanel';
import { SpeakersView } from './SpeakersView';
import { EventGuideView } from './EventGuideView';
import { KnowledgeStudio } from './KnowledgeStudio';
import { StarField } from './StarField';

export function AIInterface() {
  const [activeTab, setActiveTab] = useState('ask_joy');
  const [isKnowledgeStudioOpen, setIsKnowledgeStudioOpen] = useState(false);
  const [activePrompt, setActivePrompt] = useState('');

  const handleSelectGuideQuery = (query) => {
    setActivePrompt(query);
    setActiveTab('ask_joy');
  };

  const handleAskJoyAboutSpeaker = (query) => {
    setActivePrompt(query);
    setActiveTab('ask_joy');
  };

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      background: '#090d16',
      overflowX: 'hidden',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      {/* Background Ambient Animation */}
      <StarField />

      {/* Top Header Navigation */}
      <TopBar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActivePrompt('');
          setActiveTab(tab);
        }}
        onOpenKnowledgeStudio={() => setIsKnowledgeStudioOpen(true)}
      />

      {/* Main Workspace View depending on selected tab */}
      <main style={{ position: 'relative', zIndex: 10 }}>
        {(activeTab === 'ask_joy' || activeTab === 'interview') && (
          <ConversationPanel
            activeTab={activeTab}
            initialPrompt={activePrompt}
          />
        )}

        {activeTab === 'speakers' && (
          <SpeakersView
            onAskJoyAboutSpeaker={handleAskJoyAboutSpeaker}
          />
        )}

        {activeTab === 'guide' && (
          <EventGuideView
            onSelectQuery={handleSelectGuideQuery}
          />
        )}
      </main>

      {/* Knowledge Studio Organiser Admin Area */}
      <KnowledgeStudio
        isOpen={isKnowledgeStudioOpen}
        onClose={() => setIsKnowledgeStudioOpen(false)}
      />
    </div>
  );
}
