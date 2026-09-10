import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Brain } from 'lucide-react';
import { AIPodcasterAgent } from '../services/aiPodcasterAgent';
import { AudioEngine } from '../services/audioEngine';
import { HOST_PERSONAS } from './PersonaBadge';

// Components
import { AISphere } from './AISphere';
import { StarField } from './StarField';
import { TopBar } from './TopBar';
import { ControlBar } from './ControlBar';
import { ConversationPanel } from './ConversationPanel';
import { MemoryPanel } from './MemoryPanel';
import { SettingsModal } from './SettingsModal';
import { KnowledgeStudio } from './KnowledgeStudio';

const DEFAULT_GUESTS = [
  {
    id: 'guest_sarah',
    name: 'Dr. Sarah Lin',
    role: 'Chief AI Sustainability Officer',
    color: '#1e3a5f',
    avatar: '👩‍💼',
    bio: 'Dr. Sarah Lin specializes in Carbon-Aware Neural Reasoning, Sparse Compute Architectures, and grid-interactive datacenters.',
    isActive: true
  },
  {
    id: 'guest_marcus',
    name: 'Prof. Marcus Vance',
    role: 'Clean Energy & Compute Systems Lead',
    color: '#1a3c34',
    avatar: '👨‍🔬',
    bio: 'Prof. Marcus Vance researches dynamic renewable load-shifting for AI clusters and thermal waste-heat recapture networks.',
    isActive: false
  }
];

export function AIInterface() {
  const agentRef = useRef(null);
  const audioRef = useRef(null);

  // Layout Panels & Modals
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [knowledgeStudioOpen, setKnowledgeStudioOpen] = useState(false);

  // Engine Configuration & Persona
  const [config, setConfig] = useState({
    conferenceName: 'Next Wave Summit',
    topic: 'Decarbonizing AI: Clean Grids, Efficient Silicon & Sustainable Computing',
    engine: 'groq'
  });
  const [guests, setGuests] = useState(DEFAULT_GUESTS);
  const [hostPersonaId, setHostPersonaId] = useState('alex');

  // Stage & Audio State
  const [stageStatus, setStageStatus] = useState('idle'); // 'idle' | 'listening_guest' | 'thinking' | 'speaking_host'
  const [audioLevel, setAudioLevel] = useState(0);

  // Transcript & Inputs
  const [transcript, setTranscript] = useState([]);
  const [guestText, setGuestText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [knowledgeText, setKnowledgeText] = useState('');
  const [indexedDocs, setIndexedDocs] = useState(['Next Wave Summit 2026 Keynote Agenda & Schedule']);

  // Initialize Agent and Audio Engine
  useEffect(() => {
    agentRef.current = new AIPodcasterAgent({
      conferenceName: config.conferenceName,
      topic: config.topic,
      guests,
      hostPersonaId
    });

    audioRef.current = new AudioEngine({
      onAudioLevel: setAudioLevel
    });

    return () => {
      if (audioRef.current) {
        audioRef.current.cleanup();
      }
    };
  }, []);

  // Sync Agent Config
  useEffect(() => {
    if (agentRef.current) {
      agentRef.current.setEngineConfig(config);
      agentRef.current.setGuests(guests);
      agentRef.current.setHostPersona(hostPersonaId);
    }
  }, [config, guests, hostPersonaId]);

  const hostPersona = HOST_PERSONAS[hostPersonaId] || HOST_PERSONAS.alex;

  // Add initial welcome turn
  useEffect(() => {
    if (transcript.length === 0) {
      setTranscript([
        {
          id: `welcome_${Date.now()}`,
          sender: 'host',
          name: 'Joy (AI Assistant)',
          text: `Welcome to Next Wave Summit! I'm Joy, your official AI assistant. How can I help you with our schedule, keynote speakers, session tracks, or sustainable tech today?`,
          thinking: '1. Intent: Welcome attendee to Next Wave Summit.\n2. Action: Present capabilities & offer assistance.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, []);

  const handleStartSession = async () => {
    if (audioRef.current) {
      audioRef.current.unlockAudioContext();
    }
    setStageStatus('thinking');

    try {
      const response = await agentRef.current.generateOpening();
      const turnId = `host_turn_${Date.now()}`;

      setTranscript(prev => [...prev, {
        id: turnId,
        sender: 'host',
        name: 'Joy (AI Assistant)',
        text: response.spokenResponse,
        thinking: response.thinking,
        citations: response.citations,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);

      setStageStatus('speaking_host');
      audioRef.current.speakText(response.spokenResponse, {
        pitch: hostPersona.pitch,
        rate: hostPersona.rate,
        voiceName: hostPersona.voice || "en-US-AvaNeural",
        onEnd: () => setStageStatus('idle')
      });
    } catch (err) {
      console.error("Error starting session:", err);
      setStageStatus('idle');
    }
  };

  const handleSendMessage = async (text) => {
    if (!text || !text.trim()) return;

    if (audioRef.current) {
      audioRef.current.unlockAudioContext();
      audioRef.current.stopSpeaking();
      audioRef.current.stopListening();
    }

    const userTurnId = `user_turn_${Date.now()}`;
    setTranscript(prev => [...prev, {
      id: userTurnId,
      sender: 'guest',
      name: 'You',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);

    setGuestText('');
    setInterimText('');
    setStageStatus('thinking');

    try {
      const response = await agentRef.current.respondToGuest(text.trim());
      const hostTurnId = `host_turn_${Date.now()}`;

      setTranscript(prev => [...prev, {
        id: hostTurnId,
        sender: 'host',
        name: 'Joy (AI Assistant)',
        text: response.spokenResponse,
        thinking: response.thinking,
        citations: response.citations,
        guestQuery: text.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);

      setStageStatus('speaking_host');
      audioRef.current.speakText(response.spokenResponse, {
        pitch: hostPersona.pitch,
        rate: hostPersona.rate,
        voiceName: hostPersona.voice || "en-US-AvaNeural",
        onEnd: () => setStageStatus('idle')
      });
    } catch (err) {
      console.error("Error processing response:", err);
      setStageStatus('idle');
    }
  };

  const handleToggleListening = () => {
    if (audioRef.current) {
      audioRef.current.unlockAudioContext();
    }

    if (stageStatus === 'listening_guest') {
      audioRef.current.stopListening();
      const textToProcess = guestText.trim() || interimText.trim();
      if (textToProcess) {
        handleSendMessage(textToProcess);
      } else {
        setStageStatus('idle');
      }
    } else {
      audioRef.current.stopSpeaking();
      setGuestText('');
      setInterimText('');
      setStageStatus('listening_guest');

      audioRef.current.startListening({
        onTranscript: ({ interim, final: finalText }) => {
          setInterimText(interim);
          if (finalText) {
            setGuestText(prev => prev ? `${prev} ${finalText}` : finalText);
          }
        }
      });
    }
  };

  const handleFeedbackSubmit = async (turnId, rating, tags = [], comment = '') => {
    setTranscript(prev => prev.map(item =>
      item.id === turnId ? { ...item, userRating: rating, userComment: comment, userTags: tags } : item
    ));

    if (agentRef.current) {
      const turn = transcript.find(t => t.id === turnId);
      await agentRef.current.submitFeedback({
        id: `fb_${turnId}`,
        timestamp: new Date().toISOString(),
        guest_query: turn?.guestQuery || 'User query',
        host_response: turn?.text || '',
        thinking: turn?.thinking || '',
        rating,
        tags,
        comment,
        topic: config.topic
      });
    }
  };

  const handleUploadKnowledge = () => {
    if (!knowledgeText.trim()) return;
    if (agentRef.current) {
      agentRef.current.uploadKnowledgeDocument('Pasted Document', knowledgeText.trim());
    }
    setIndexedDocs(prev => [...prev, `${knowledgeText.substring(0, 45)}...`]);
    setKnowledgeText('');
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.stopListening();
      audioRef.current.stopSpeaking();
    }
    setStageStatus('idle');
    setGuestText('');
    setInterimText('');
  };

  return (
    <div className="ai-interface">
      <StarField />

      <div className="ai-interface__content">
        <TopBar
          hostPersonaId={hostPersonaId}
          stageStatus={stageStatus}
          isListening={stageStatus === 'listening_guest'}
          onOpenKnowledgeStudio={() => setKnowledgeStudioOpen(true)}
        />

        {/* Central Animated Orb */}
        <div className="sphere-container">
          <AISphere state={stageStatus} audioLevel={audioLevel} />

          <div className="sphere-label">
            <div className="sphere-label__name">JOY</div>
            <div className="sphere-label__mode">{hostPersona.style}</div>

            <div className={`sphere-label__status sphere-label__status--${
              stageStatus === 'listening_guest' ? 'listening' :
              stageStatus === 'thinking' ? 'thinking' :
              stageStatus === 'speaking_host' ? 'speaking' : 'idle'
            }`}>
              <div className={`status-dot status-dot--${
                stageStatus === 'listening_guest' ? 'listening' :
                stageStatus === 'thinking' ? 'thinking' :
                stageStatus === 'speaking_host' ? 'speaking' : 'idle'
              }`} />
              {stageStatus === 'idle' && 'Idle'}
              {stageStatus === 'listening_guest' && 'Listening...'}
              {stageStatus === 'thinking' && 'Thinking...'}
              {stageStatus === 'speaking_host' && 'Speaking...'}
            </div>
          </div>
        </div>

        {/* Panel Toggles */}
        <button
          className="panel-toggle panel-toggle--left"
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          aria-label="Toggle Chat Panel"
        >
          <MessageSquare size={18} />
        </button>

        <button
          className="panel-toggle panel-toggle--right"
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          aria-label="Toggle Memory Panel"
        >
          <Brain size={18} />
        </button>

        {/* Floating Glass Panels */}
        <ConversationPanel
          isOpen={leftPanelOpen}
          onClose={() => setLeftPanelOpen(false)}
          transcript={transcript}
          guestText={guestText || interimText}
          stageStatus={stageStatus}
          onFeedback={handleFeedbackSubmit}
          onSendMessage={handleSendMessage}
          onToggleMic={handleToggleListening}
        />

        <MemoryPanel
          isOpen={rightPanelOpen}
          onClose={() => setRightPanelOpen(false)}
          indexedDocs={indexedDocs}
          knowledgeText={knowledgeText}
          onKnowledgeTextChange={setKnowledgeText}
          onUploadKnowledge={handleUploadKnowledge}
          config={config}
          guests={guests}
          transcript={transcript}
          activeGuestName=""
        />

        {/* Bottom Control Bar */}
        <ControlBar
          stageStatus={stageStatus}
          hasStarted={transcript.length > 0}
          onStart={handleStartSession}
          onToggleMic={handleToggleListening}
          onStop={handleStop}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenKnowledgeStudio={() => setKnowledgeStudioOpen(true)}
          onToggleLeftPanel={() => setLeftPanelOpen(!leftPanelOpen)}
          onToggleRightPanel={() => setRightPanelOpen(!rightPanelOpen)}
          leftPanelOpen={leftPanelOpen}
          rightPanelOpen={rightPanelOpen}
        />

        {/* Modals */}
        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          config={config}
          onConfigChange={setConfig}
          guests={guests}
          onGuestsChange={setGuests}
          hostPersonaId={hostPersonaId}
          onPersonaChange={setHostPersonaId}
          transcript={transcript}
          onFeedback={handleFeedbackSubmit}
          onOpenKnowledgeStudio={() => setKnowledgeStudioOpen(true)}
        />

        <KnowledgeStudio
          isOpen={knowledgeStudioOpen}
          onClose={() => setKnowledgeStudioOpen(false)}
        />
      </div>
    </div>
  );
}
