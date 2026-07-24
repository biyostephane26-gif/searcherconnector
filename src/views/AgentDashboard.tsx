'use client'

// v1.0.3 - Added Chat Persistence & Strategic Relevance
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../lib/supabase';
import ScanMetrics from '../components/ScanMetrics';
import { useAuth } from '../contexts/AuthContext';
import { useAgent } from '../hooks/useAgent';
import { useAgentRealtime } from '../hooks/useAgentRealtime';
import { useVoiceInput } from '../hooks/useVoiceInput';
import ScaiThinkingOrb from '../components/scai/ScaiThinkingOrb';
import VoiceWaveform from '../components/scai/VoiceWaveform';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import {
  Zap,
  Mail,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Play,
  Mic,
  Paperclip,
  Send,
  Camera,
  FileText,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  Check,
  MessageSquare,
  History,
  AlertTriangle,
  Globe,
  Eye,
  Target,
  Radio,
  Volume2
} from 'lucide-react';

const ACTION_ICONS: Record<string, any> = {
  search_scan: <Search size={14} className="text-blue-400" />,
  auto_apply: <Check size={14} className="text-green-400" />,
  email_response: <Mail size={14} className="text-purple-400" />,
  whatsapp_response: <MessageSquare size={14} className="text-green-500" />,
  follow_up_sent: <History size={14} className="text-gray-400" />,
  diversification_warning: <AlertTriangle size={14} className="text-yellow-500" />,
  international_alert: <Globe size={14} className="text-blue-500" />,
  surveillance_check: <Eye size={14} className="text-gray-500" />,
  schedule_interview_prep: <Target size={14} className="text-red-500" />,
  cv_adapted: <FileText size={14} className="text-orange-400" />,
  cover_generated: <FileText size={14} className="text-pink-400" />,
};

export default function AgentDashboard() {
  const { user, profile } = useAuth();
  const { scanning, launchScan, getEmailThreads, getSchedule, updateSchedule } = useAgent();
  const { recentActions, pendingQueue } = useAgentRealtime();
  const [activeTab, setActiveTab] = useState<'status' | 'queue' | 'communications' | 'config'>('status');
  const [queue, setQueue] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any>(null);
  const [scanLog, setScanLog] = useState<string[]>([]);
  const [scanMetrics, setScanMetrics] = useState<{sitesScanned:number; socialNetworksScanned:number; platformsScanned:number; feedsScanned:number; totalSources:number} | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [userInstruction, setUserInstruction] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'agent' | 'user', content: string, thought?: string, showThought?: boolean}[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Hook SCAI Voice pour transcription
  const { isRecording, transcript, toggle: toggleRecording, error: voiceError } = useVoiceInput({
    onTranscript: (text) => {
      // Ajouter le texte transcrit à l'input
      setUserInstruction(prev => prev + ' ' + text)
    },
    onError: (err) => {
      console.error('[SCAI Voice] Erreur:', err)
      alert('❌ Erreur microphone. Vérifie tes permissions dans les paramètres du navigateur.')
    }
  });
  const [pendingScanConfirm, setPendingScanConfirm] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Note vocale SCAI (façon WhatsApp) — distincte du micro STT ────
  // ci-dessus : celui-ci enregistre un vrai clip audio (maintenir
  // appuyé), l'envoie à /api/scai/voice (STT→LLM→TTS en un appel),
  // et joue la réponse vocale de SCAI.
  const [isVoiceNoteRecording, setIsVoiceNoteRecording] = useState(false);
  const [isVoiceNoteProcessing, setIsVoiceNoteProcessing] = useState(false);
  const [isScaiSpeaking, setIsScaiSpeaking] = useState(false);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const [speakingAudioEl, setSpeakingAudioEl] = useState<HTMLAudioElement | null>(null);
  const voiceNoteRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceNoteChunksRef = useRef<Blob[]>([]);
  const voiceNoteStartRef = useRef<number>(0);

  const startVoiceNote = async () => {
    if (isVoiceNoteRecording || isVoiceNoteProcessing) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      voiceNoteChunksRef.current = [];
      voiceNoteStartRef.current = Date.now();

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) voiceNoteChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setRecordingStream(null);
        const duration = Date.now() - voiceNoteStartRef.current;
        if (voiceNoteChunksRef.current.length > 0 && duration > 500) {
          const blob = new Blob(voiceNoteChunksRef.current, { type: 'audio/webm' });
          await sendVoiceNote(blob);
        }
      };

      voiceNoteRecorderRef.current = recorder;
      setRecordingStream(stream);
      recorder.start();
      setIsVoiceNoteRecording(true);
    } catch (err) {
      console.error('[SCAI Voice Note] Erreur micro:', err);
      alert("Impossible d'accéder au micro. Vérifie les permissions du navigateur.");
    }
  };

  const stopVoiceNote = () => {
    if (voiceNoteRecorderRef.current && voiceNoteRecorderRef.current.state !== 'inactive') {
      voiceNoteRecorderRef.current.stop();
    }
    setIsVoiceNoteRecording(false);
  };

  const sendVoiceNote = async (blob: Blob) => {
    if (!user) return;
    setIsVoiceNoteProcessing(true);
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      const audioBase64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const res = await fetch('/api/scai/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, userProfile: profile, audio: audioBase64, mode: 'full' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Erreur note vocale');

      if (data.text) {
        setChatHistory(prev => [...prev, { role: 'user', content: data.text }]);
        await saveChatMessage('user', data.text);
      }
      if (data.response) {
        setChatHistory(prev => [...prev, { role: 'agent', content: data.response }]);
        await saveChatMessage('agent', data.response);
      }

      if (data.audioBuffer) {
        const buffer = Uint8Array.from(atob(data.audioBuffer), c => c.charCodeAt(0));
        const audioBlob = new Blob([buffer], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        audio.onplay = () => setSpeakingAudioEl(audio);
        audio.onended = () => { setIsScaiSpeaking(false); setSpeakingAudioEl(null); };
        audio.onerror = () => { setIsScaiSpeaking(false); setSpeakingAudioEl(null); };
        setIsScaiSpeaking(true);
        audio.play().catch(() => setIsScaiSpeaking(false));
      }
    } catch (err: any) {
      console.error('[SCAI Voice Note] Erreur envoi:', err);
      setChatHistory(prev => [...prev, { role: 'agent', content: "Désolé, je n'ai pas pu traiter ta note vocale. Réessaie." }]);
    } finally {
      setIsVoiceNoteProcessing(false);
      setIsProcessing(false);
    }
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const clearChat = async () => {
    if (!user) return
    if (!showClearConfirm) { setShowClearConfirm(true); return }
    setShowClearConfirm(false)
    try {
      const res = await fetch(`/api/scai/reset/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'reset' })
      })
      if (res.ok) {
        setChatHistory([{ role: 'agent', content: "Historique effacé. Prêt pour une nouvelle mission." }])
      }
    } catch { /* silent */ }
  }

  const toggleThought = (index: number) => {
    setChatHistory(prev => prev.map((msg, i) => 
      i === index ? { ...msg, showThought: !msg.showThought } : msg
    ));
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // Charger l'historique de chat depuis MongoDB quand l'utilisateur se connecte
  useEffect(() => {
    if (!user) return;
    const loadHistory = async () => {
      try {
        const res = await fetch(`/api/scai/history/${user.id}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.history && data.history.length > 0) {
            // Convertir le rôle "assistant" en "agent" pour l'interface
            const mappedHistory = data.history.map((m: any) => ({
              role: m.role === 'assistant' ? 'agent' : m.role,
              content: m.content
            }));
            setChatHistory(mappedHistory);
          }
        }
      } catch {
        // Échec silencieux, on garde l'historique vide par défaut
      }
    };
    loadHistory();
  }, [user]);

  const saveChatMessage = async (role: 'agent' | 'user', content: string, thought?: string) => {
    // Désormais géré automatiquement par MongoDB côté backend !
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !user) return;
    
    const userMsg = { role: 'user' as const, content: text };
    setChatHistory(prev => [...prev, userMsg]);
    setUserInstruction('');
    setIsProcessing(true);
    
    // Sauvegarder le message utilisateur
    await saveChatMessage('user', text);

    try {
      // On récupère l'historique mis à jour pour l'envoi
      const currentMessages = [...chatHistory, userMsg];
      
      const res = await fetch('/api/scai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          message: text,
          userProfile: profile
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur de communication avec l\'IA');
      }
      const data = await res.json();

      // Mettre à jour le chat avec la réponse
      if (data && data.response) {
        let content = data.response;
        let scanParams: any = null;
        
        // Détecter le token SCAN_READY
        const scanMatch = content.match(/\[SCAN_READY:(.*?)\]/);
        if (scanMatch) {
          try {
            scanParams = JSON.parse(scanMatch[1]);
            content = content.replace(scanMatch[0], ''); // Enlever le token du message
          } catch (e) {
            console.error('Erreur parsing SCAN_READY:', e);
          }
        }

        const agentMsg = { 
          role: 'agent' as const, 
          content: content
        };
        setChatHistory(prev => [...prev, agentMsg]);
        
        if (scanParams) {
          setPendingScanConfirm(scanParams);
        }
      } else {
        throw new Error('Format de réponse IA invalide');
      }

      // Si l'IA a détecté des mises à jour de profil (domaine, pays, préférences)
      if (data.detected_updates && user) {
        const updates: any = {};
        if (data.detected_updates.domain) updates.domain = data.detected_updates.domain;
        if (data.detected_updates.country) updates.country = data.detected_updates.country;
        if (data.detected_updates.profile_type) updates.profile_type = data.detected_updates.profile_type;
        if (data.detected_updates.search_preferences) {
          updates.search_preferences = {
            ...(profile?.search_preferences || {}),
            ...data.detected_updates.search_preferences
          };
        }

        if (Object.keys(updates).length > 0) {
          await supabase.from('users_profiles').update(updates).eq('id', user.id);
        }
      }

      // Si l'IA suggère de lancer un scan (désactivé: scan ne se lance que sur confirmation explicite de l'utilisateur)

    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      let errorMessage = ''

      if (errorMsg.includes('429') || errorMsg.includes('rate_limit') || errorMsg.includes('Rate limit')) {
        errorMessage = "Les clés IA sont temporairement saturées (limite atteinte). Elles se réinitialisent chaque minute — réessaie dans 60 secondes."
      } else if (errorMsg.includes('Timeout') || errorMsg.includes('timeout')) {
        errorMessage = "La connexion a pris trop de temps. Réessaie dans un instant."
      } else if (errorMsg.includes('fetch') || errorMsg.includes('network') || errorMsg.includes('NetworkError')) {
        errorMessage = "Erreur réseau — vérifie ta connexion internet."
      } else if (errorMsg.includes('Groq') || errorMsg.includes('Gemini') || errorMsg.includes('indisponibles') || errorMsg.includes('saturés')) {
        errorMessage = errorMsg // Afficher le message exact depuis scaiUtils
      } else {
        errorMessage = `Erreur technique : ${errorMsg.slice(0, 150)}`
      }

      setChatHistory(prev => [...prev, {
        role: 'agent',
        content: errorMessage
      }])
    } finally {
      setIsProcessing(false)
    }
  };

  useEffect(() => {
    if (!user) return; // Attendre que user soit disponible
    loadData();
    loadChatHistory();
  }, [user?.id]); // Dépendre de user.id et non user (évite les re-renders infinis)

  const loadChatHistory = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/scai/history/${user.id}`);
      if (!res.ok) throw new Error("Erreur fetch history");
      
      const data = await res.json();
      
      if (data && data.success && data.history && data.history.length > 0) {
        setChatHistory(data.history.map((m: any) => ({
          role: m.role === 'assistant' ? 'agent' : m.role,
          content: m.content,
          showThought: false
        })));
      } else {
        // Message initial si historique vide
        const initialMsg = { role: 'agent' as const, content: "Bonjour. Je suis SCAI, votre intelligence artificielle stratégique. Comment puis-je vous accompagner dans votre croissance aujourd'hui ?", showThought: false };
        setChatHistory([initialMsg]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      const initialMsg = { role: 'agent' as const, content: "Bonjour. Je suis SCAI, votre intelligence artificielle stratégique. Comment puis-je vous accompagner dans votre croissance aujourd'hui ?", showThought: false };
      setChatHistory([initialMsg]);
    }
  };

  const loadData = async () => {
    if (!user) return;
    try {
      const [queueData, emailData, scheduleData] = await Promise.all([
        supabase.from('agent_queue').select('*').eq('user_id', user.id)
          .order('scheduled_for', { ascending: true }).limit(20),
        getEmailThreads(),
        getSchedule()
      ]);
      setQueue(queueData.data || []);
      setEmails(emailData || []);
      setSchedule(scheduleData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // On ne crash pas, on laisse l'UI avec les valeurs par défaut
    }
  };

  const handleScan = async (zone: string = 'continental') => {
    setScanError(null);
    const steps = [
      'Initialisation du scan global sur le Web...',
      'Scan des job boards (LinkedIn, Indeed, RemoteOK, Glassdoor)...',
      'Recherche sur les réseaux sociaux et forums pro (Twitter, Reddit)...',
      'Analyse des sites carrières et annonces directes...',
      'Scoring par IA (Analyse de pertinence Deep Learning)...',
      'Filtrage des opportunités à haut potentiel...',
      'Préparation des candidatures automatiques...',
      'Finalisation et enregistrement des résultats...'
    ];
    setScanLog([]);
    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setScanLog(prev => [...prev, steps[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 800);

    const result = await launchScan(zone);
    clearInterval(interval);
    if (result?.success) {
      // Set scan metrics if available
      if (result.sitesScanned !== undefined) {
        setScanMetrics({
          sitesScanned: result.sitesScanned,
          socialNetworksScanned: result.socialNetworksScanned || 0,
          platformsScanned: result.platformsScanned || 0,
          feedsScanned: result.feedsScanned || 0,
          totalSources: result.totalSources || 0,
        });
      }
      setScanLog(prev => [
        ...prev,
        `✅ Scan terminé : ${result.found || 0} opportunités trouvées, ${result.auto_applied || 0} candidatures envoyées automatiquement.`
      ]);
    } else {
      const errorMessage = result?.error || 'Le scan s’est arrêté avant la fin.';
      setScanError(errorMessage);
      setScanLog(prev => [
        ...prev,
        `❌ Échec du scan : ${errorMessage}`
      ]);
    }
    loadData();
  };

  const cancelTask = async (taskId: string) => {
    await supabase.from('agent_queue')
      .update({ status: 'cancelled' })
      .eq('id', taskId);
    loadData();
  };

  const handleScheduleChange = async (key: string, value: any) => {
    const updated = { ...schedule, [key]: value };
    setSchedule(updated);
    await updateSchedule({ [key]: value });
  };

  const tabs = [
    { id: 'status', label: 'Statut Live', icon: '⚡' },
    { id: 'queue', label: `File d'attente (${pendingQueue})`, icon: '📋' },
    { id: 'communications', label: 'Emails & WA', icon: '📨' },
    { id: 'config', label: 'Configuration', icon: '⚙️' }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-syne text-2xl font-bold text-white">Agent Searcher</h1>
            <p className="text-sm text-gray-400 mt-1">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
              Actif 24h/24 · {pendingQueue} tâches planifiées
            </p>
          </div>
          <button
            onClick={() => handleScan()}
            disabled={scanning}
            className="flex items-center gap-2 bg-[#D4AF37] text-black px-5 py-2.5 rounded-lg font-syne font-bold text-sm hover:bg-[#B8962D] disabled:opacity-50 transition-colors"
          >
            {scanning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {scanning ? 'Scan en cours...' : 'Lancer un scan'}
          </button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Intelligence Index', value: 'SCAI v1.2', icon: <Zap size={14} className="text-[#D4AF37]" /> },
            { label: 'Web Coverage', value: '100% Global', icon: <Clock size={14} className="text-blue-500" /> },
            { label: 'Active Missions', value: recentActions?.filter((a: any) => a.action_type === 'auto_apply').length || 0, icon: <CheckCircle size={14} className="text-green-500" /> },
            { label: 'Strategic Value', value: 'High Potential', icon: <Mail size={14} className="text-purple-500" /> },
          ].map((stat, i) => (
            <div key={i} className="bg-[#111111] border border-gray-800 rounded-xl p-3 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-[10px] text-gray-500 font-syne uppercase tracking-wider">
                {stat.icon} {stat.label}
              </div>
              <div className="text-lg font-bold text-white font-syne">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Agent Command Center */}
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-4 mb-8 shadow-2xl">
          <div className="flex flex-col gap-4">
            {/* Chat History Preview */}
            <div className="flex justify-between items-center mb-2 px-2">
              <span className="text-[10px] font-syne font-bold uppercase tracking-[0.2em] text-gray-500">Flux de Pensée Stratégique</span>
              <div className="flex items-center gap-2">
                {showClearConfirm && (
                  <span className="text-[10px] text-red-400">Confirmer ?</span>
                )}
                <button 
                  onClick={clearChat}
                  className={`transition-colors ${showClearConfirm ? 'text-red-500 hover:text-red-400' : 'text-gray-600 hover:text-red-500'}`}
                  title={showClearConfirm ? "Cliquer pour confirmer" : "Effacer l'historique"}
                >
                  <Trash2 size={12} />
                </button>
                {showClearConfirm && (
                  <button onClick={() => setShowClearConfirm(false)} className="text-[10px] text-gray-600 hover:text-white">
                    Annuler
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto mb-4 scrollbar-hide pr-2">
              {chatHistory && chatHistory.map((msg: any, i: number) => (
                <div key={i} className={"flex " + (msg?.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={"max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm " + (
                    msg?.role === 'user' 
                      ? 'bg-[#D4AF37] text-black font-medium rounded-tr-none' 
                      : 'bg-[#111111] border border-gray-800 text-gray-200 rounded-tl-none'
                  )}>
                    {msg?.role === 'agent' ? (
                      <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed">
                        {msg.thought && (
                          <div className="mb-2">
                            <button 
                              onClick={() => toggleThought(i)}
                              className="flex items-center gap-1 text-[8px] uppercase tracking-widest text-[#D4AF37]/40 hover:text-[#D4AF37]/80 font-syne transition-colors"
                            >
                              {msg.showThought ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                              Processus de réflexion stratégique
                            </button>
                            {msg.showThought && (
                              <div className="text-[9px] text-[#D4AF37]/60 mt-2 p-2 bg-black/30 rounded border-l border-[#D4AF37]/20 italic font-light animate-in fade-in slide-in-from-top-1 duration-300">
                                {msg.thought}
                              </div>
                            )}
                          </div>
                        )}
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content || ''}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{msg?.content || ''}</div>
                    )}
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-[#111111] border border-gray-800 text-[#D4AF37] rounded-2xl rounded-tl-none px-4 py-3 text-xs flex flex-col gap-2 shadow-lg min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <ScaiThinkingOrb size={16} />
                      <span className="font-syne font-bold uppercase tracking-widest text-[9px]">
                        {isVoiceNoteProcessing ? 'SCAI écoute et réfléchit...' : 'SCAI réfléchit intensément...'}
                      </span>
                    </div>
                    <div className="h-1 w-full bg-gray-900 rounded-full overflow-hidden">
                      <div className="h-full bg-[#D4AF37] animate-[shimmer_2s_infinite] w-1/2"></div>
                    </div>
                  </div>
                </div>
              )}
              {isScaiSpeaking && (
                <div className="flex justify-start">
                  <div className="bg-[#111111] border border-[#D4AF37]/30 text-[#D4AF37] rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-3 shadow-lg">
                    <Volume2 size={14} className="animate-pulse" />
                    <VoiceWaveform source={speakingAudioEl} variant="speaking" />
                    <span className="font-syne font-bold uppercase tracking-widest text-[9px]">SCAI parle...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div className="flex items-center gap-2 bg-black border border-gray-700 rounded-xl p-2 focus-within:border-[#D4AF37] transition-all">
              <input
                type="file" 
                id="agent-upload" 
                className="hidden" 
                multiple
                onChange={(e) => {
                  const files = e.target.files;
                  if (files?.length) {
                    setChatHistory(prev => [...prev, { role: 'user', content: `[Téléversement de ${files.length} fichier(s)]` }]);
                    setTimeout(() => {
                      setChatHistory(prev => [...prev, { role: 'agent', content: "Merci pour ces documents. Je vais les analyser pour affiner votre profil et vos opportunités." }]);
                    }, 1000);
                  }
                }}
              />
              <button 
                onClick={() => document.getElementById('agent-upload')?.click()}
                className="p-2 text-gray-400 hover:text-[#D4AF37] transition-colors"
                title="Téléverser un document, photo ou vidéo"
              >
                <Paperclip size={20} />
              </button>
              
              <input 
                type="text"
                value={userInstruction}
                onChange={(e) => setUserInstruction(e.target.value)}
                placeholder={isProcessing ? "SCAI réfléchit intensément..." : "Échangez avec SCAI (votre agent d'élite)..."}
                disabled={isProcessing}
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white py-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && userInstruction.trim()) {
                    handleSendMessage(userInstruction);
                  }
                }}
              />

              {/* Séparateur vertical */}
              <div className="w-px h-6 bg-gray-700 my-auto"></div>

              {/* Bouton SCAI Voice - SÉPARÉ */}
              <button 
                onClick={() => {
                  // Paywall SCAI Voice pour free users (le fondateur n'a aucune restriction)
                  const isFree = profile?.role !== 'founder' && (!profile?.plan || profile.plan === 'free')
                  if (isFree) {
                    alert('🎤 SCAI Voice est réservé aux membres Premium. Upgrade pour parler directement avec SCAI.')
                    window.location.href = '/pricing'
                    return
                  }
                  
                  // Toggle enregistrement vocal (via hook useVoiceInput)
                  toggleRecording()
                }}
                className={`p-2.5 rounded-lg transition-all ${
                  isRecording 
                    ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50' 
                    : 'bg-[#1A1A1A] text-gray-400 hover:text-[#D4AF37] hover:bg-[#2A2A2A]'
                }`}
                title={isRecording ? "🔴 Enregistrement en cours... (clique pour arrêter)" : "🎤 SCAI Voice (Premium)"}
              >
                <Mic size={18} />
              </button>

              {/* Note vocale SCAI — maintenir appuyé façon WhatsApp */}
              {isVoiceNoteRecording ? (
                <div className="flex items-center gap-2 px-2">
                  <VoiceWaveform source={recordingStream} variant="recording" />
                  <button
                    onMouseUp={stopVoiceNote}
                    onMouseLeave={stopVoiceNote}
                    onTouchEnd={stopVoiceNote}
                    className="p-2.5 rounded-lg bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50 transition-all"
                    title="Relâche pour envoyer"
                  >
                    <Radio size={18} />
                  </button>
                </div>
              ) : (
                <button
                  onMouseDown={startVoiceNote}
                  onTouchStart={startVoiceNote}
                  disabled={isVoiceNoteProcessing || isProcessing}
                  className="p-2.5 rounded-lg bg-[#1A1A1A] text-gray-400 hover:text-[#D4AF37] hover:bg-[#2A2A2A] transition-all disabled:opacity-30"
                  title="Maintenir appuyé pour envoyer une note vocale à SCAI"
                >
                  <Radio size={18} />
                </button>
              )}

              <button
                disabled={!userInstruction.trim() || isProcessing}
                onClick={() => handleSendMessage(userInstruction)}
                className="p-2 bg-[#D4AF37] text-black rounded-lg disabled:opacity-50 hover:bg-[#B8962D] transition-colors"
              >
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
            
            <div className="flex gap-4 px-2">
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <Camera size={12} /> Photos/Vidéos acceptées
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <FileText size={12} /> Documents CV/Portfolio
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-6 border-b border-gray-800">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-[#D4AF37] border-[#D4AF37]'
                  : 'text-gray-500 border-transparent hover:text-white'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Status Live */}
        {activeTab === 'status' && (
          <div className="space-y-4">
            {/* Confirmation de scan */}
            {pendingScanConfirm && (
              <div className="bg-[#111111] border border-[#D4AF37]/30 rounded-xl p-4">
                <div className="font-syne text-sm font-bold text-[#D4AF37] mb-3">⚡ Prêt pour le scan</div>
                <div className="text-xs text-gray-400 mb-3">
                  Zone cible : {pendingScanConfirm.zone || 'continental'} · 
                  Budget plateformes : {pendingScanConfirm.has_budget ? 'Oui' : 'Non'}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      handleScan(pendingScanConfirm.zone);
                      setPendingScanConfirm(null);
                    }}
                    disabled={scanning}
                    className="flex-1 bg-[#D4AF37] text-black px-4 py-2 rounded-lg font-syne font-bold text-sm hover:bg-[#B8962D] disabled:opacity-50 transition-colors"
                  >
                    Oui, lancer le scan
                  </button>
                  <button 
                    onClick={() => setPendingScanConfirm(null)}
                    className="flex-1 bg-transparent border border-gray-700 text-gray-400 px-4 py-2 rounded-lg font-syne font-bold text-sm hover:border-gray-500 hover:text-white transition-colors"
                  >
                    Pas maintenant
                  </button>
                </div>
              </div>
            )}
            {/* Scan log */}
            {scanLog.length > 0 && (
              <div className="bg-[#111111] border border-[#D4AF37]/30 rounded-xl p-4">
                <div className="font-syne text-sm font-bold text-[#D4AF37] mb-3">⚡ Scan en cours</div>
                {scanLog.map((line, i) => (
                  <div key={i} className="text-xs text-gray-300 py-1 border-b border-gray-800/50 last:border-0 font-mono">
                    <span className="text-gray-600 mr-2">{new Date().toLocaleTimeString('fr-FR')}</span>
                    {line}
                  </div>
                ))}
              </div>
            )}
            {scanMetrics && (
                <div className="my-4">
                  <ScanMetrics
                    sitesScanned={scanMetrics.sitesScanned}
                    socialNetworksScanned={scanMetrics.socialNetworksScanned}
                    platformsScanned={scanMetrics.platformsScanned}
                    feedsScanned={scanMetrics.feedsScanned}
                    totalSources={scanMetrics.totalSources}
                  />
                </div>
              )}
            {scanError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-300">
                {scanError}
              </div>
            )}

            {/* Recent actions */}
            <div className="bg-[#111111] border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <span className="font-syne font-bold text-sm text-white">Journal des actions</span>
                <span className="text-xs text-gray-500">{recentActions?.length || 0} actions récentes</span>
              </div>
              {!recentActions || recentActions.length === 0 ? (
                <div className="p-8 text-center text-gray-600 text-sm">
                  Aucune action pour l'instant. Lancez un scan pour commencer.
                </div>
              ) : (
                recentActions.map((action: any) => (
                  <div key={action.id} className="flex items-start gap-3 px-4 py-3 border-b border-gray-800/50 last:border-0 hover:bg-black/30">
                    <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center border border-gray-800">
                      {ACTION_ICONS[action.action_type] || <Zap size={14} className="text-[#D4AF37]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white">{action.result}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {action.created_at ? formatDistanceToNow(new Date(action.created_at), { addSuffix: true, locale: fr }) : 'À l\'instant'}
                        {action.execution_ms > 0 && ` · ${(action.execution_ms / 1000).toFixed(1)}s`}
                      </div>
                    </div>
                    {action.auto_promo_sent && (
                      <span className="text-xs text-[#D4AF37]/60 flex-shrink-0">● promo</span>
                    )}
                    {action.success ? (
                      <CheckCircle size={14} className="text-green-500 flex-shrink-0 mt-1" />
                    ) : (
                      <XCircle size={14} className="text-red-500 flex-shrink-0 mt-1" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab: Queue */}
        {activeTab === 'queue' && (
          <div className="bg-[#111111] border border-gray-800 rounded-xl overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wider">Tâche</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wider">Planifié</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wider">Priorité</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-600 text-sm">
                      Aucune tâche planifiée
                    </td>
                  </tr>
                ) : queue.map(task => (
                  <tr key={task.id} className="border-b border-gray-800/50 hover:bg-black/20">
                    <td className="px-4 py-3">
                      <div className="text-sm text-white">{task.task_type.replace(/_/g, ' ')}</div>
                      {task.payload?.opportunity_id && (
                        <div className="text-xs text-gray-500">Relance #{task.payload.followup_number}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {task.scheduled_for ? formatDistanceToNow(new Date(task.scheduled_for), { addSuffix: true, locale: fr }) : 'Non planifié'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className={`w-1.5 h-4 rounded-sm ${i < Math.ceil(task.priority / 2) ? 'bg-[#D4AF37]' : 'bg-gray-700'}`} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        task.status === 'pending' ? 'bg-[#D4AF37]/10 text-[#D4AF37]' :
                        task.status === 'running' ? 'bg-blue-500/10 text-blue-400' :
                        task.status === 'done' ? 'bg-green-500/10 text-green-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {task.status === 'pending' && (
                        <button
                          onClick={() => cancelTask(task.id)}
                          className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                        >
                          Annuler
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab: Communications */}
        {activeTab === 'communications' && (
          <div className="space-y-3">
            {emails.length === 0 ? (
              <div className="bg-[#111111] border border-gray-800 rounded-xl p-8 text-center text-gray-600 text-sm">
                Aucun email géré par Searcher pour l'instant.
              </div>
            ) : emails.map(email => (
              <div key={email.id} className="bg-[#111111] border border-gray-800 rounded-xl p-4 hover:border-[#D4AF37]/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-white">{email.from_name || email.from_email}</span>
                      {email.company && (
                        <span className="text-xs text-gray-500">· {email.company}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mb-2">{email.subject}</div>
                    <div className="text-xs text-gray-500">{email.body_preview}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      email.sentiment === 'positive' ? 'bg-green-500/10 text-green-400' :
                      email.sentiment === 'negative' ? 'bg-red-500/10 text-red-400' :
                      'bg-gray-700 text-gray-400'
                    }`}>
                      {email.sentiment === 'positive' ? '😊' :
                       email.sentiment === 'negative' ? '😞' : '😐'} {email.sentiment || 'inconnu'}
                    </span>
                    {email.searcher_replied ? (
                      <span className="text-xs text-green-400">✅ Searcher a répondu</span>
                    ) : email.requires_human ? (
                      <span className="text-xs text-gold">⚠️ Votre action requise</span>
                    ) : (
                      <span className="text-xs text-gray-600">En attente</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Config */}
        {activeTab === 'config' && schedule && (
          <div className="space-y-4">

            <div className="bg-[#111111] border border-gray-800 rounded-xl p-5">
              <div className="font-syne font-bold text-sm text-white mb-4">⏰ Fréquence de scan</div>
              <div className="flex items-center gap-4">
                <input
                  type="range" min="1" max="24" step="1"
                  value={schedule.scan_frequency_hours}
                  onChange={e => handleScheduleChange('scan_frequency_hours', parseInt(e.target.value))}
                  className="flex-1 accent-[#D4AF37]"
                />
                <span className="text-[#D4AF37] font-syne font-bold text-lg w-16 text-right">
                  {schedule.scan_frequency_hours}h
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">Scan automatique toutes les {schedule.scan_frequency_hours} heures</div>
            </div>

            <div className="bg-[#111111] border border-gray-800 rounded-xl p-5">
              <div className="font-syne font-bold text-sm text-white mb-4">🎯 Seuil de candidature automatique</div>
              <div className="flex items-center gap-4">
                <input
                  type="range" min="50" max="100" step="5"
                  value={schedule.auto_apply_threshold}
                  onChange={e => handleScheduleChange('auto_apply_threshold', parseInt(e.target.value))}
                  className="flex-1 accent-[#D4AF37]"
                />
                <span className="text-[#D4AF37] font-syne font-bold text-lg w-16 text-right">
                  {schedule.auto_apply_threshold}+
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">Searcher postule automatiquement si score ≥ {schedule.auto_apply_threshold}/100</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'email_auto_reply', label: '📧 Réponses email auto', desc: 'Searcher répond aux recruteurs' },
                { key: 'whatsapp_auto_reply', label: '💬 Réponses WhatsApp auto', desc: 'Searcher gère les messages WA' },
                { key: 'surveillance_active', label: '🔭 Surveillance continue', desc: 'Même après avoir trouvé un poste' },
              ].map(item => (
                <div key={item.key} className="bg-[#111111] border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-white font-medium">{item.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                    </div>
                    <button
                      onClick={() => handleScheduleChange(item.key, !schedule[item.key])}
                      className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative ${
                        schedule[item.key] ? 'bg-[#D4AF37]' : 'bg-gray-700'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                        schedule[item.key] ? 'left-5' : 'left-1'
                      }`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
