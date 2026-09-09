import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Brain } from 'lucide-react';
import { AIPodcasterAgent } from '../services/aiPodcasterAgent';
import { AudioEngine } from '../services/audioEngine';
import { HOST_PERSONAS } from './PersonaBadge';

// New Components
import { AISphere } from './AISphere';
import { StarField } from './StarField';
import { TopBar } from './TopBar';
import { ControlBar } from './ControlBar';
import { ConversationPanel } from './ConversationPanel';
import { MemoryPanel } from './MemoryPanel';
import { SettingsModal } from './SettingsModal';

const DEFAULT_GUESTS = [
  {
    id: 'guest_sarah',
    name: 'Dr. Sarah Lin',
    role: 'Chief AI Sustainability Officer',
    color: '#1e3a5f',
    avatar: '👩‍💼',
    bio: 'Dr. Sarah Lin specializes in Carbon-Aware Neural Reasoning, Sparse Compute Architectures, and grid-interactive datacenters. Her research cuts LLM training carbon intensity by 45%.',
    isActive: true
  },
  {
    id: 'guest_marcus',
    name: 'Prof. Marcus Vance',
    role: 'Clean Energy & Compute Systems Lead',
    color: '#1a3c34',
    avatar: '👨‍🔬',
    bio: 'Prof. Marcus Vance researches dynamic renewable load-shifting for AI clusters, geothermal datacenter integration, and thermal waste-heat recapture networks.',
    isActive: false
  }
];

export function AIInterface() {
  const agentRef = useRef(null);
  const audioRef = useRef(null);
  const audioContextPollerRef = useRef(null);

  // Interface State
  const [stageStatus, setStageStatus] = useState('idle'); // idle, listening_guest, thinking, speaking_host
  const [audioLevel, setAudioLevel] = useState(0);

  // Panel State
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Data State
  const [transcript, setTranscript] = useState([]);
  const [interimText, setInterimText] = useState('');
  const [guestText, setGuestText] = useState('');
  const [knowledgeText, setKnowledgeText] = useState('');
  const [indexedDocs, setIndexedDocs] = useState([
    "Dr. Sarah Lin - Carbon-Aware Neural Reasoning & Net-Zero Datacenters (2025)",
    "Prof. Marcus Vance - Grid-Interactive AI Training & Renewable Load Matching (2026)"
  ]);

  // Config State
  const [guests, setGuests] = useState(DEFAULT_GUESTS);
  const [activeGuestId, setActiveGuestId] = useState(DEFAULT_GUESTS[0].id);
  const [hostPersonaId, setHostPersonaId] = useState('alex');
  const [config, setConfig] = useState({
    conferenceName: 'Next Wave: AI & Sustainability',
    topic: 'AI Innovations, Decarbonizing Compute & Energy Grids',
    engine: (import.meta.env.VITE_GROQ_API_KEY && !import.meta.env.VITE_GROQ_API_KEY.includes('your_api_key')) ? 'groq' : 'browser',
    groqApiKey: (import.meta.env.VITE_GROQ_API_KEY && !import.meta.env.VITE_GROQ_API_KEY.includes('your_api_key')) ? import.meta.env.VITE_GROQ_API_KEY : '',
    ollamaModel: 'llama3.2',
    ollamaUrl: 'http://localhost:11434'
  });

  const activeGuest = guests.find(g => g.id === activeGuestId) || guests[0];
  const hostPersona = HOST_PERSONAS[hostPersonaId] || HOST_PERSONAS.alex;

  // Initialize
  useEffect(() => {
    agentRef.current = new AIPodcasterAgent({
      ...config,
      guests,
      hostPersonaId
    });
    audioRef.current = new AudioEngine();

    // Setup audio level polling for the sphere
    audioContextPollerRef.current = setInterval(() => {
      const analyser = audioRef.current?.getAnalyserNode();
      if (analyser && (stageStatus === 'listening_guest' || stageStatus === 'speaking_host')) {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        // Calculate average amplitude (simplified RMS)
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        // Normalize 0-1
        const normalized = Math.min(1, avg / 128);

        // Smooth the level slightly
        setAudioLevel(prev => prev + (normalized - prev) * 0.2);
      } else {
        setAudioLevel(prev => prev > 0.05 ? prev * 0.9 : 0);
      }
    }, 50);

    return () => {
      if (audioRef.current) audioRef.current.destroy();
      if (audioContextPollerRef.current) clearInterval(audioContextPollerRef.current);
    };
  }, []);

  // Sync state to agent
  useEffect(() => {
    if (agentRef.current) {
      agentRef.current.setEngineConfig(config);
      agentRef.current.setGuests(guests);
      agentRef.current.setHostPersona(hostPersonaId);
    }
  }, [config, guests, hostPersonaId]);

  // Handle Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleToggleListening();
      } else if (e.code === 'Escape') {
        setLeftPanelOpen(false);
        setRightPanelOpen(false);
        setSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleUploadKnowledge = () => {
    if (!knowledgeText.trim()) return;
    agentRef.current.uploadKnowledgeDocument(
      `User_Upload_${indexedDocs.length + 1}`,
      knowledgeText,
      activeGuestId
    );
    setIndexedDocs(prev => [...prev, `${knowledgeText.substring(0, 50)}...`]);
    setKnowledgeText('');
  };

  const handleStartInterview = async () => {
    setStageStatus('thinking');

    try {
      const response = await agentRef.current.generateOpening();
      const turnId = `host_turn_${Date.now()}`;

      setTranscript([{
        id: turnId,
        sender: 'host',
        name: 'JOY (AI Host)',
        text: response.spokenResponse,
        thinking: response.thinking,
        guestQuery: 'Next Wave Event Welcome',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);

      setStageStatus('speaking_host');
      audioRef.current.speakText(response.spokenResponse, {
        pitch: hostPersona.pitch,
        rate: hostPersona.rate,
        onStart: () => audioRef.current.startMicVisualizer(),
        onEnd: () => {
          // Auto-start listening so speaker/student can talk first right after the welcome!
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
      });
    } catch (err) {
      console.error("Error generating intro:", err);
      setStageStatus('idle');
    }
  };

  const handleToggleListening = () => {
    if (stageStatus === 'listening_guest') {
      audioRef.current.stopListening();
      if (guestText.trim()) {
        processGuestAnswer(guestText.trim());
      } else if (interimText.trim()) {
        processGuestAnswer(interimText.trim());
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

  const processGuestAnswer = async (answerText) => {
    if (!answerText.trim()) return;

    const guestTurnId = `guest_turn_${Date.now()}`;
    setTranscript(prev => [...prev, {
      id: guestTurnId,
      sender: 'guest',
      name: activeGuest?.name || 'Guest',
      text: answerText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);

    setGuestText('');
    setInterimText('');
    setStageStatus('thinking');

    try {
      const response = await agentRef.current.respondToGuest(answerText, activeGuestId);
      const hostTurnId = `host_turn_${Date.now()}`;

      setTranscript(prev => [...prev, {
        id: hostTurnId,
        sender: 'host',
        name: 'JOY (AI Host)',
        text: response.spokenResponse,
        thinking: response.thinking,
        guestQuery: answerText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);

      setStageStatus('speaking_host');
      audioRef.current.speakText(response.spokenResponse, {
        pitch: hostPersona.pitch,
        rate: hostPersona.rate,
        onEnd: () => setStageStatus('idle')
      });
    } catch (err) {
      console.error("Error processing response:", err);
      setStageStatus('idle');
    }
  };

  const handleFeedbackSubmit = async (turnId, rating, tags = [], comment = '') => {
    const turn = transcript.find(t => t.id === turnId);
    if (!turn) return;

    // Update transcript item locally
    setTranscript(prev => prev.map(item =>
      item.id === turnId ? { ...item, userRating: rating, userComment: comment, userTags: tags } : item
    ));

    if (agentRef.current) {
      await agentRef.current.submitFeedback({
        id: `fb_${turnId}`,
        timestamp: new Date().toISOString(),
        guest_query: turn.guestQuery || 'Guest statement',
        host_response: turn.text,
        thinking: turn.thinking || 'No recorded reasoning',
        rating,
        tags,
        comment,
        topic: config.topic
      });
    }
  };

  const handleStop = () => {
    audioRef.current.stopListening();
    audioRef.current.stopSpeaking();
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
        />

        {/* The Central Sphere */}
        <div className="sphere-container">
          <AISphere state={stageStatus} audioLevel={audioLevel} />

          <div className="sphere-label">
            <div className="sphere-label__name">JOY</div>
            <div className="sphere-label__mode">{hostPersona.style}</div>

            <div className={`sphere-label__status sphere-label__status--${stageStatus === 'listening_guest' ? 'listening' :
              stageStatus === 'thinking' ? 'thinking' :
                stageStatus === 'speaking_host' ? 'speaking' : 'idle'
              }`}>
              <div className={`status-dot status-dot--${stageStatus === 'listening_guest' ? 'listening' :
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

        {/* Panel Toggles (Mobile + Desktop) */}
        <button
          className="panel-toggle panel-toggle--left"
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          aria-label="Toggle Conversation"
        >
          <MessageSquare size={18} />
        </button>

        <button
          className="panel-toggle panel-toggle--right"
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          aria-label="Toggle Memory"
        >
          <Brain size={18} />
        </button>

        {/* Floating Panels */}
        <ConversationPanel
          isOpen={leftPanelOpen}
          onClose={() => setLeftPanelOpen(false)}
          transcript={transcript}
          guestText={guestText || interimText}
          stageStatus={stageStatus}
          onFeedback={handleFeedbackSubmit}
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
          activeGuestName={activeGuest?.name}
        />

        <ControlBar
          stageStatus={stageStatus}
          hasStarted={transcript.length > 0}
          onStart={handleStartInterview}
          onToggleMic={handleToggleListening}
          onStop={handleStop}
          onOpenSettings={() => setSettingsOpen(true)}
        />

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
          agentRef={agentRef}
        />
      </div>
    </div>
  );
}
