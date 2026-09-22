'use client'

// v1.0.3 - Added Chat Persistence & Strategic Relevance
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { isPaidPlan } from '../lib/planUtils';
import ScanMetrics from '../components/ScanMetrics';
import { useAuth } from '../contexts/AuthContext';
import { useAgent } from '../hooks/useAgent';
import { useAgentRealtime } from '../hooks/useAgentRealtime';
import { useVoiceInput } from '../hooks/useVoiceInput';
import ScaiThinkingOrb from '../components/scai/ScaiThinkingOrb';
import VoiceWaveform from '../components/scai/VoiceWaveform';
import ConnectorsPanel from '../components/cowork/ConnectorsPanel';
import OutputsPanel from '../components/cowork/OutputsPanel';
import ProjectsPanel from '../components/cowork/ProjectsPanel';
import TasksPanel from '../components/cowork/TasksPanel';
import ToolAttachment, { TOOL_META, type CoworkTool, type ToolAttachmentData } from '../components/cowork/ToolAttachment';
import ImageAnnotator from '../components/cowork/ImageAnnotator';
import { CONNECTORS } from '../lib/connectors/catalog';
import { authFetch } from '../lib/authFetch';
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
  Volume2,
  Plus,
  X,
  Plug,
  PanelRightClose,
  PanelRightOpen,
  PanelLeftClose,
  PanelLeftOpen,
  FolderKanban,
  CalendarClock,
  Settings2,
  MessageSquareText,
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
  const { user, profile, refreshProfile } = useAuth();
  const { scanning, launchScan, getEmailThreads, getSchedule, updateSchedule } = useAgent();
  const { recentActions, pendingQueue } = useAgentRealtime();
  const { t, i18n } = useTranslation();
  // Écran d'accueil (aucune conversation en cours) : grande salutation
  // selon l'heure locale, comme le fait Cowork — pas un message figé.
  // Traduite via i18n (t()) au lieu d'un mot français en dur, pour que la
  // langue choisie dans Settings (ou détectée par le navigateur) s'applique
  // vraiment ici — avant, "Bonjour"/"Bonsoir" restait figé en français peu
  // importe la langue active.
  const firstName = (profile?.full_name || '').trim().split(/\s+/)[0] || '';
  const hour = new Date().getHours();
  const greeting = hour < 5 ? t('scai.greetingNight') : hour < 12 ? t('scai.greetingMorning') : hour < 18 ? t('scai.greetingAfternoon') : t('scai.greetingEvening');
  const greetingEmoji = hour < 5 ? '🌙' : hour < 18 ? '☀️' : '🌙';
  const [activeTab, setActiveTab] = useState<'status' | 'queue' | 'communications' | 'projects' | 'connectors' | 'config'>('status');
  // Outils Cowork (PDF, Excel, Word, image, vidéo) sélectionnés depuis le menu « + »
  const [activeTool, setActiveTool] = useState<CoworkTool | null>(null);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Panneau droit persistant (Sorties + Contexte) façon Cowork — repliable
  // en grand écran, tiroir superposé en dessous de xl.
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [leftRailOpen, setLeftRailOpen] = useState(true);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [connectedConnectors, setConnectedConnectors] = useState<string[]>([]);
  useEffect(() => {
    if (!user) return;
    authFetch('/api/connectors').then(async r => {
      const d = await r.json();
      if (!r.ok) return;
      const connectedIds = (d.states || []).filter((s: any) => s.status === 'connected').map((s: any) => s.id);
      setConnectedConnectors(connectedIds.map((id: string) => CONNECTORS.find(c => c.id === id)?.name || id));
    }).catch(() => {});
  }, [user]);

  // Ouverture directe depuis la recherche globale ou la page /connectors
  // (?tab=connectors, ?tool=pdf…) — appliqué une seule fois au montage.
  const searchParams = useSearchParams();
  useEffect(() => {
    const tab = searchParams?.get('tab');
    const tool = searchParams?.get('tool');
    if (tab === 'connectors') setActiveTab('connectors');
    if (tool && (Object.keys(TOOL_META) as string[]).includes(tool)) {
      setActiveTab('status');
      setActiveTool(tool as CoworkTool);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [queue, setQueue] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any>(null);
  const [scanLog, setScanLog] = useState<string[]>([]);
  const [scanMetrics, setScanMetrics] = useState<{sitesScanned:number; socialNetworksScanned:number; platformsScanned:number; feedsScanned:number; totalSources:number} | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  // Brouillon persistant — si l'utilisateur ferme SCAI Cowork (ou change
  // d'onglet) avant d'envoyer, le texte tapé est restauré à la réouverture,
  // par utilisateur (clé namespacée), jamais perdu comme un vrai brouillon.
  const draftKey = user ? `sc_agent_draft_${user.id}` : null;
  const [userInstruction, setUserInstructionRaw] = useState('');
  const setUserInstruction = (next: string | ((prev: string) => string)) => {
    setUserInstructionRaw(prev => {
      const value = typeof next === 'function' ? (next as (p: string) => string)(prev) : next;
      if (draftKey) {
        try { value.trim() ? localStorage.setItem(draftKey, value) : localStorage.removeItem(draftKey) } catch { /* stockage indisponible */ }
      }
      // Remet la zone de texte à sa hauteur d'une ligne après un envoi —
      // sinon elle reste agrandie visuellement même une fois vidée.
      if (!value && inputRef.current) inputRef.current.style.height = 'auto';
      return value;
    });
  };
  // Recharge le brouillon dès que `user` est prêt (le lazy init ci-dessus
  // ne connaît pas encore l'id au tout premier rendu serveur/client).
  useEffect(() => {
    if (!draftKey) return;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) setUserInstructionRaw(saved);
    } catch { /* stockage indisponible */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);
  const [chatHistory, setChatHistory] = useState<{role: 'agent' | 'user', content: string, thought?: string, showThought?: boolean, attachment?: ToolAttachmentData, images?: string[]}[]>([]);
  // Multi-conversation façon Cowork — "Nouveau" ouvre une conversation
  // fraîche SANS effacer les précédentes, retrouvables dans la liste
  // "Discussions". Persisté par utilisateur pour survivre au rechargement.
  const conversationKey = user ? `sc_active_conversation_${user.id}` : null;
  const [activeConversationId, setActiveConversationId] = useState<string>('default');
  const [conversations, setConversations] = useState<{ id: string; title: string; updatedAt: string | null; messageCount: number }[]>([]);
  useEffect(() => {
    if (!conversationKey) return;
    try {
      const saved = localStorage.getItem(conversationKey);
      if (saved) setActiveConversationId(saved);
    } catch { /* stockage indisponible */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationKey]);
  const loadConversations = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/scai/conversations/${user.id}`);
      const data = await res.json();
      if (data?.success) setConversations(data.conversations || []);
    } catch { /* liste non critique */ }
  };
  // Images collées (Ctrl+V, une ou plusieurs à la fois) ou téléversées, en
  // attente d'envoi — SCAI les analyse réellement via Gemini Vision, ce
  // n'est pas un accusé de réception factice. Tableau (pas une seule
  // valeur) : coller une 2e image effaçait la 1re avant ce correctif.
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const MAX_ATTACHED_IMAGES = 4;
  const attachImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setChatHistory(prev => [...prev, { role: 'agent', content: "Je ne sais analyser que des images pour l'instant dans le chat (captures d'écran, portfolio...). Pour un CV/document, utilise plutôt ton [Profil](/profile)." }]);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAttachedImages(prev => prev.length >= MAX_ATTACHED_IMAGES ? prev : [...prev, reader.result as string]);
    reader.readAsDataURL(file);
  };
  // Éléments (vidéos/images) ajoutés pour un montage — chacun est
  // téléversé immédiatement (bucket public) car ffmpeg télécharge par
  // URL, pas de fichier local possible côté serveur.
  const [montageClips, setMontageClips] = useState<{ url: string; name: string }[]>([]);
  const [montageUploading, setMontageUploading] = useState(false);
  const addMontageFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith('video/') || f.type.startsWith('image/')).slice(0, Math.max(0, 12 - montageClips.length));
    if (arr.length === 0) return;
    setMontageUploading(true);
    for (const file of arr) {
      try {
        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const res = await authFetch('/api/tools/upload-clip', { method: 'POST', body: JSON.stringify({ data: dataUrl }) });
        const data = await res.json();
        if (res.ok && data.url) setMontageClips(prev => [...prev, { url: data.url, name: file.name }]);
        else setChatHistory(prev => [...prev, { role: 'agent', content: `⚠️ Échec du téléversement de ${file.name} : ${data.error || 'erreur inconnue'}` }]);
      } catch {
        setChatHistory(prev => [...prev, { role: 'agent', content: `⚠️ Échec du téléversement de ${file.name}` }]);
      }
    }
    setMontageUploading(false);
  };
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
      // echoCancellation/noiseSuppression/autoGainControl : sans ça, le
      // micro capture le bruit ambiant brut, ce qui dégrade nettement la
      // transcription Whisper (notes vocales mal retranscrites).
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
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
        body: JSON.stringify({ userId: user.id, userProfile: { ...profile, localHour: new Date().getHours(), uiLanguage: i18n.language }, audio: audioBase64, mode: 'full', conversationId: activeConversationId }),
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
      // Même protocole que le chat texte : une note vocale peut aussi
      // déclencher un vrai outil ou une tâche multi-étapes en arrière-plan.
      if (data.tool_call?.tool && data.tool_call?.prompt) {
        await runTool(data.tool_call.tool, data.tool_call.prompt, undefined, { skipUserEcho: true });
      }
      if (data.plan_created?.id) {
        setChatHistory(prev => [...prev, { role: 'agent', content: `🗂️ Tâche lancée : **${data.plan_created.title}** — suis sa progression dans le panneau Progression, à droite.` }]);
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

  // Ouvre une conversation neuve — l'ancienne reste intacte en base,
  // retrouvable dans la liste "Discussions" (rail gauche). Ne supprime
  // rien : c'est la confusion précise que l'ancien clearChat causait
  // (un seul document par utilisateur, écrasé à chaque "Nouveau").
  const startNewConversation = () => {
    if (!user) return
    const id = (crypto as any).randomUUID ? crypto.randomUUID() : `conv_${Date.now()}_${Math.random().toString(36).slice(2)}`
    setActiveConversationId(id)
    try { if (conversationKey) localStorage.setItem(conversationKey, id) } catch { /* stockage indisponible */ }
    setChatHistory([])
    setShowClearConfirm(false)
  }

  // Supprime la conversation ACTIVE uniquement (icône corbeille dans
  // l'en-tête du chat) puis en ouvre une nouvelle — n'affecte jamais les
  // autres discussions de l'utilisateur.
  const deleteActiveConversation = async () => {
    if (!user) return
    if (!showClearConfirm) { setShowClearConfirm(true); return }
    setShowClearConfirm(false)
    try {
      await fetch(`/api/scai/conversations/${user.id}?conversationId=${encodeURIComponent(activeConversationId)}`, { method: 'DELETE' })
    } catch { /* on repart sur une nouvelle conversation même si la suppression échoue */ }
    startNewConversation()
    loadConversations()
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

  const saveChatMessage = async (role: 'agent' | 'user', content: string, thought?: string) => {
    // Désormais géré automatiquement par MongoDB côté backend !
  };

  // Sauvegarde un message généré par un outil (PDF/image/vidéo/opportunité),
  // avec sa pièce jointe — contrairement au chat texte, ces résultats ne
  // passent jamais par /api/scai/chat donc rien ne les persistait avant.
  // On ne garde QUE les champs légers (url/job, jamais base64/data URI) pour
  // ne pas alourdir indéfiniment le document MongoDB de la conversation.
  const persistToolMessage = async (content: string, attachment?: ToolAttachmentData) => {
    if (!user) return;
    let lightAttachment: ToolAttachmentData | undefined = attachment;
    if (attachment?.kind === 'file') {
      lightAttachment = { kind: 'file', filename: attachment.filename, mime: attachment.mime, url: attachment.url, size: attachment.size, title: attachment.title };
    } else if (attachment?.kind === 'image') {
      lightAttachment = { kind: 'image', url: attachment.url, provider: attachment.provider, fallback: attachment.fallback };
    }
    try {
      // "assistant" (pas "agent", qui n'est que le libellé local du state
      // React) — c'est le rôle attendu par Groq/Gemini quand ce document
      // Mongo est relu pour reconstituer le contexte envoyé à l'IA au tour
      // suivant. Un rôle inconnu ferait rejeter tout l'appel par l'API.
      await fetch(`/api/scai/history/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: activeConversationId, role: 'assistant', content, attachment: lightAttachment }),
      });
    } catch { /* non-bloquant — le fichier reste dans le panneau Sorties même si ce message n'est pas sauvegardé */ }
  };

  const handleSendMessage = async (text: string, images?: string[]) => {
    if ((!text.trim() && !images?.length) || !user) return;

    const userMsg = { role: 'user' as const, content: text, images };
    setChatHistory(prev => [...prev, userMsg]);
    setUserInstruction('');
    setAttachedImages([]);
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
          conversationId: activeConversationId,
          images,
          message: text,
          userProfile: { ...profile, localHour: new Date().getHours(), uiLanguage: i18n.language }
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur de communication avec l\'IA');
      }
      const data = await res.json();

      // Mettre à jour le chat avec la réponse
      // (le token SCAN_READY / TOOL_READY est déjà extrait côté serveur —
      // data.response arrive nettoyé, data.scan_params / data.tool_call
      // portent l'intention détectée. Une réponse réduite au seul token
      // devient une chaîne vide ici — ce n'est pas une erreur : le
      // résultat réel du vrai outil suit juste en dessous.)
      if (data && data.success !== false && typeof data.response === 'string') {
        if (data.response.trim()) {
          setChatHistory(prev => [...prev, { role: 'agent' as const, content: data.response }]);
        }
        if (data.suggest_scan && data.scan_params) {
          setPendingScanConfirm(data.scan_params);
        }
      } else {
        throw new Error(data?.error || 'Format de réponse IA invalide');
      }

      // SCAI a déterminé qu'un vrai outil (PDF/Excel/Word/image/vidéo/
      // prospection) doit se déclencher — même moteur que le menu « + »,
      // pas de texte inventé : le résultat réel arrive dans la foulée.
      if (data.tool_call?.tool && data.tool_call?.prompt) {
        await runTool(data.tool_call.tool, data.tool_call.prompt, undefined, { skipUserEcho: true });
      }

      // SCAI a planifié plusieurs actions réelles enchaînées — elles
      // s'exécutent en arrière-plan (cowork_tasks), visibles dans le
      // panneau Progression même si le chat est fermé entre-temps.
      if (data.plan_created?.id) {
        setChatHistory(prev => [...prev, { role: 'agent', content: `🗂️ Tâche lancée : **${data.plan_created.title}** — suis sa progression dans le panneau Progression, à droite.` }]);
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
          // Répercussion immédiate — ne pas attendre la sync temps réel
          // (postgres_changes) ni un rechargement de page.
          await refreshProfile();
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
      loadConversations() // titre/horodatage de la discussion mis à jour dans la liste
    }
  };

  useEffect(() => {
    if (!user) return; // Attendre que user soit disponible
    loadData();
    loadConversations();
  }, [user?.id]); // Dépendre de user.id et non user (évite les re-renders infinis)

  // Recharge l'historique à chaque changement de conversation active —
  // "Nouveau" et le clic sur une discussion dans la liste passent tous
  // les deux par activeConversationId, jamais par un flag séparé.
  useEffect(() => {
    if (!user) return;
    loadChatHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeConversationId]);

  const loadChatHistory = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/scai/history/${user.id}?conversationId=${encodeURIComponent(activeConversationId)}`);
      if (!res.ok) throw new Error("Erreur fetch history");

      const data = await res.json();

      // Historique vide → écran d'accueil (Hero), pas un message figé :
      // la salutation dynamique ("Bonjour {prénom}") vit déjà dans le Hero.
      if (data && data.success && data.history && data.history.length > 0) {
        setChatHistory(data.history.map((m: any) => ({
          role: m.role === 'assistant' ? 'agent' : m.role,
          content: m.content,
          showThought: false,
          attachment: m.attachment,
          images: m.images
        })));
      } else {
        setChatHistory([]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      setChatHistory([]);
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

  const runTool = async (tool: CoworkTool, prompt: string, source?: 'opportunities' | 'applications', opts?: { skipUserEcho?: boolean; clips?: string[] }) => {
    if (isProcessing && !opts?.skipUserEcho) return;
    const meta = TOOL_META[tool];
    if (!opts?.skipUserEcho) {
      const userText = source
        ? `${meta.emoji} Exporter mes ${source === 'opportunities' ? 'opportunités' : 'candidatures'} en ${meta.label}`
        : `${meta.emoji} ${meta.label} : ${prompt}`;
      setChatHistory(prev => [...prev, { role: 'user', content: userText }]);
      saveChatMessage('user', userText);
    }
    setUserInstruction('');
    setActiveTool(null);
    setShowToolsMenu(false);
    setIsProcessing(true);

    try {
      let endpoint = '/api/tools/document';
      let body: any = { format: tool === 'excel' ? 'xlsx' : tool === 'word' ? 'docx' : 'pdf', prompt, source };
      if (tool === 'image') { endpoint = '/api/tools/image'; body = { prompt, aspect: 'landscape' }; }
      if (tool === 'video') { endpoint = '/api/tools/video'; body = { prompt }; }
      if (tool === 'montage') { endpoint = '/api/tools/video'; body = { clips: opts?.clips || [], title: prompt || 'Montage SCAI' }; }
      if (tool === 'opportunity') {
        endpoint = '/api/opportunity-creator';
        const zone = /international|monde|global|world/i.test(prompt) ? 'international' : 'local';
        body = { zone, limit: 15 };
      }

      const res = await authFetch(endpoint, { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'La génération a échoué');

      let attachment: ToolAttachmentData;
      let content: string;
      if (tool === 'image') {
        attachment = { kind: 'image', src: data.image, url: data.fileUrl, provider: data.provider, fallback: data.fallback };
        content = 'Voici ton image.';
      } else if (tool === 'video') {
        attachment = { kind: 'video', job: data.job, provider: data.provider };
        content = "Je crée ta vidéo, elle apparaîtra ici dès qu'elle est prête.";
      } else if (tool === 'montage') {
        attachment = { kind: 'video', fileUrl: data.fileUrl, provider: data.provider };
        content = `Ton montage **${data.title}** est prêt.`;
      } else if (tool === 'opportunity') {
        const leads = data.top_targets || [];
        attachment = { kind: 'opportunity', leads };
        content = leads.length > 0
          ? `J'ai trouvé **${leads.length} entreprise(s)** qui pourraient avoir besoin de tes services (${data.total_leads} au total dans ton pipeline). Voici les messages d'approche prêts à envoyer :`
          : `Aucune nouvelle entreprise trouvée cette fois (${data.total_found || 0} scannées, déjà toutes dans ton pipeline). Réessaie plus tard ou avec une zone internationale.`;
      } else {
        attachment = { kind: 'file', filename: data.filename, mime: data.mime, base64: data.base64, url: data.fileUrl, size: data.size, title: data.title };
        content = `Ton fichier **${data.title}** est prêt.`;
      }
      setChatHistory(prev => [...prev, { role: 'agent', content, attachment }]);
      persistToolMessage(content, attachment);
    } catch (e: any) {
      setChatHistory(prev => [...prev, { role: 'agent', content: `⚠️ ${e.message}` }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const pickTool = (tool: CoworkTool) => {
    setActiveTool(tool);
    setShowToolsMenu(false);
    // « Créer une opportunité » n'a besoin d'aucun texte pour fonctionner —
    // pré-remplir pour qu'Entrée suffise, tout en restant modifiable
    // ("international" pour élargir la zone).
    if (tool === 'opportunity') setUserInstruction('local');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const submitInput = () => {
    const text = userInstruction.trim();
    if (activeTool === 'montage') {
      if (montageClips.length < 2 || isProcessing) return;
      const clips = montageClips.map(c => c.url);
      runTool('montage', text, undefined, { clips });
      setMontageClips([]);
      return;
    }
    if ((!text && attachedImages.length === 0) || isProcessing) return;
    if (activeTool) runTool(activeTool, text);
    else handleSendMessage(text || 'Analyse cette image.', attachedImages.length > 0 ? attachedImages : undefined);
  };

  const tabs = [
    { id: 'status', label: 'Statut Live', icon: '⚡' },
    { id: 'queue', label: `File d'attente (${pendingQueue})`, icon: '📋' },
    { id: 'communications', label: 'Emails & WA', icon: '📨' },
  ];

  // Rail gauche façon Cowork (Nouveau / Projets / Programmé / Connecteurs /
  // Personnaliser) — navigation persistante, plus des onglets qui se
  // mélangent avec le statut du chat.
  const railItems: { id: typeof activeTab; label: string; icon: JSX.Element }[] = [
    { id: 'projects', label: 'Projets', icon: <FolderKanban size={16} /> },
    { id: 'config', label: 'Programmé', icon: <CalendarClock size={16} /> },
    { id: 'connectors', label: 'Connecteurs', icon: <Plug size={16} /> },
  ];

  // Extrait pour être rendu à deux endroits : l'écran d'accueil (aucun
  // historique) et la conversation active — même état, mêmes handlers,
  // un seul endroit à maintenir.
  const renderComposer = () => (
    <>
            {attachedImages.length > 0 && (
              <div className="flex items-center gap-2 px-1 -mb-2 flex-wrap">
                {attachedImages.map((img, i) => (
                  <div key={i} className="relative">
                    <button
                      type="button"
                      onClick={() => setEditingImageIndex(i)}
                      className="block"
                      title="Cliquer pour annoter (entourer, dessiner, écrire dessus)"
                    >
                      <img src={img} alt="Image à envoyer" className="w-14 h-14 object-cover rounded-lg border border-gray-700 hover:border-[#D4AF37] transition-colors" />
                    </button>
                    <button
                      onClick={() => setAttachedImages(prev => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-black border border-gray-600 flex items-center justify-center text-gray-300 hover:text-white hover:border-red-500"
                      aria-label="Retirer l'image"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                <span className="text-[11px] text-gray-500">
                  {attachedImages.length} image{attachedImages.length > 1 ? 's' : ''} prête{attachedImages.length > 1 ? 's' : ''} — clique sur une image pour l'annoter, ou décris ce que tu veux savoir.
                </span>
              </div>
            )}
            {editingImageIndex !== null && (
              <ImageAnnotator
                src={attachedImages[editingImageIndex]}
                onClose={() => setEditingImageIndex(null)}
                onSave={(dataUrl) => {
                  setAttachedImages(prev => prev.map((img, i) => i === editingImageIndex ? dataUrl : img));
                  setEditingImageIndex(null);
                }}
              />
            )}
            {activeTool && (
              <div className="flex flex-wrap items-center gap-2 px-1 -mb-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full pl-2.5 pr-1 py-1">
                  {TOOL_META[activeTool].emoji} {TOOL_META[activeTool].label}
                  <button onClick={() => setActiveTool(null)} className="p-0.5 rounded-full hover:bg-[#D4AF37]/20" aria-label="Retirer l'outil"><X size={12} /></button>
                </span>
                {activeTool === 'excel' && (
                  <>
                    <button onClick={() => runTool('excel', '', 'opportunities')} className="text-[11px] text-gray-400 hover:text-white hover:underline">Exporter mes opportunités</button>
                    <button onClick={() => runTool('excel', '', 'applications')} className="text-[11px] text-gray-400 hover:text-white hover:underline">Exporter mes candidatures</button>
                  </>
                )}
              </div>
            )}
            {activeTool === 'montage' && (
              <div className="flex flex-wrap items-center gap-2 px-1 -mb-1">
                {montageClips.map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-[11px] text-gray-300 bg-[#1A1A1A] border border-gray-700 rounded-full pl-2.5 pr-1 py-1 max-w-[140px]">
                    <span className="truncate">{c.name}</span>
                    <button onClick={() => setMontageClips(prev => prev.filter((_, j) => j !== i))} className="p-0.5 rounded-full hover:bg-white/10 shrink-0" aria-label="Retirer">
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <input
                  type="file" id="montage-upload" className="hidden" multiple accept="video/*,image/*"
                  onChange={(e) => { if (e.target.files) addMontageFiles(e.target.files); e.target.value = '' }}
                />
                <button
                  onClick={() => document.getElementById('montage-upload')?.click()}
                  disabled={montageUploading || montageClips.length >= 12}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D4AF37] hover:text-[#B8962D] disabled:opacity-40 transition-colors"
                >
                  {montageUploading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  {montageUploading ? 'Envoi...' : 'Ajouter'}
                </button>
                {montageClips.length > 0 && montageClips.length < 2 && (
                  <span className="text-[11px] text-gray-500">Ajoute au moins un 2ᵉ élément</span>
                )}
              </div>
            )}

            {/* Input Bar */}
            <div className="relative flex items-center gap-2 bg-black border border-gray-700 rounded-xl p-2 focus-within:border-[#D4AF37] transition-all">
              <button
                onClick={() => setShowToolsMenu(v => !v)}
                className={`p-2 rounded-lg transition-colors ${showToolsMenu ? 'text-[#D4AF37] bg-[#1A1A1A]' : 'text-gray-400 hover:text-[#D4AF37]'}`}
                title="Outils et connecteurs"
                aria-expanded={showToolsMenu}
              >
                <Plus size={20} />
              </button>
              {showToolsMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#0D0D0D] border border-[#2a2a2a] rounded-xl shadow-2xl p-1.5 z-20">
                  <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">Créer avec SCAI</p>
                  {(Object.keys(TOOL_META) as CoworkTool[]).map(t => (
                    <button key={t} onClick={() => pickTool(t)} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-200 hover:bg-[#1A1A1A] text-left">
                      <span className="w-5 text-center">{TOOL_META[t].emoji}</span>{TOOL_META[t].label}
                    </button>
                  ))}
                  <div className="h-px bg-[#1A1A1A] my-1" />
                  <button onClick={() => { setShowToolsMenu(false); setActiveTab('connectors'); }} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-200 hover:bg-[#1A1A1A] text-left">
                    <Plug size={16} className="text-[#D4AF37]" /> Gérer les connecteurs
                  </button>
                </div>
              )}
              <input
                type="file"
                id="agent-upload"
                className="hidden"
                accept="image/*"
                multiple
                onChange={(e) => {
                  if (e.target.files) Array.from(e.target.files).forEach(attachImageFile);
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => document.getElementById('agent-upload')?.click()}
                className="p-2 text-gray-400 hover:text-[#D4AF37] transition-colors"
                title="Envoyer une image à analyser (capture d'écran, portfolio...)"
              >
                <Paperclip size={20} />
              </button>
              
              <textarea
                ref={inputRef}
                rows={1}
                value={userInstruction}
                onChange={(e) => {
                  setUserInstruction(e.target.value)
                  const el = e.target
                  el.style.height = 'auto'
                  el.style.height = `${Math.min(el.scrollHeight, 160)}px`
                }}
                placeholder={isProcessing ? "SCAI travaille..." : activeTool ? TOOL_META[activeTool].placeholder : "Échangez avec SCAI (votre agent d'élite)... (Maj+Entrée pour un saut de ligne)"}
                disabled={isProcessing}
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white py-2 resize-none leading-normal max-h-40 overflow-y-auto caret-[#D4AF37]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitInput(); }
                  if (e.key === 'Escape') { setActiveTool(null); setShowToolsMenu(false); }
                }}
                onPaste={(e) => {
                  // Toutes les images du presse-papiers, pas seulement la
                  // première — avant, coller une 2e image effaçait la 1re.
                  const items = Array.from(e.clipboardData.items).filter(i => i.type.startsWith('image/'));
                  if (items.length > 0) {
                    e.preventDefault();
                    items.forEach(i => { const file = i.getAsFile(); if (file) attachImageFile(file); });
                  }
                }}
              />

              {/* Séparateur vertical */}
              <div className="w-px h-6 bg-gray-700 my-auto"></div>

              {/* Bouton SCAI Voice - SÉPARÉ */}
              <button 
                onClick={() => {
                  // Paywall SCAI Voice pour free users (le fondateur n'a aucune restriction)
                  const isFree = !isPaidPlan(profile)
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
                disabled={(!userInstruction.trim() && attachedImages.length === 0 && !(activeTool === 'montage' && montageClips.length >= 2)) || isProcessing}
                onClick={submitInput}
                className="p-2 bg-[#D4AF37] text-black rounded-lg disabled:opacity-50 hover:bg-[#B8962D] transition-colors"
              >
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
            
            <div className="flex items-center justify-between px-2 flex-wrap gap-2">
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                  <Camera size={12} /> Photos/Vidéos acceptées
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                  <FileText size={12} /> Documents CV/Portfolio
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center bg-[#1A1A1A] rounded-full p-0.5 text-[10px] font-bold" title="Manuel : SCAI prépare, tu valides. Auto : SCAI candidate seule dès qu'une offre dépasse le seuil.">
                  <button
                    onClick={() => handleScheduleChange('auto_apply_enabled', false)}
                    className={`px-2.5 py-1 rounded-full transition-colors ${!schedule?.auto_apply_enabled ? 'bg-[#D4AF37] text-black' : 'text-gray-400 hover:text-white'}`}
                  >
                    Manuel
                  </button>
                  <button
                    onClick={() => handleScheduleChange('auto_apply_enabled', true)}
                    className={`px-2.5 py-1 rounded-full transition-colors ${schedule?.auto_apply_enabled ? 'bg-[#D4AF37] text-black' : 'text-gray-400 hover:text-white'}`}
                  >
                    Auto
                  </button>
                </div>
                <button
                  onClick={() => handleScan()}
                  disabled={scanning}
                  className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-[#D4AF37] disabled:opacity-50 transition-colors"
                >
                  {scanning ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                  {scanning ? 'Scan en cours...' : 'Lancer un scan'}
                </button>
              </div>
            </div>
    </>
  )

  // Panneau droit persistant façon Cowork — Sorties + Contexte, visible en
  // permanence à côté de la conversation (pas un onglet qu'on bascule).
  const renderRightPanel = (opts?: { onClose?: () => void }) => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
        <span className="text-[10px] font-syne font-bold uppercase tracking-widest text-gray-500">Progression</span>
        {opts?.onClose ? (
          <button onClick={opts.onClose} className="text-gray-500 hover:text-white transition-colors"><X size={16} /></button>
        ) : (
          <button onClick={() => setRightPanelOpen(false)} className="text-gray-500 hover:text-white transition-colors" title="Replier le panneau">
            <PanelRightClose size={16} />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {isProcessing && (
          <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl p-3 flex items-center gap-2.5">
            <ScaiThinkingOrb size={16} />
            <p className="text-xs text-[#D4AF37] font-syne font-semibold">
              {activeTool ? `${TOOL_META[activeTool].emoji} ${TOOL_META[activeTool].label} en cours...` : isVoiceNoteProcessing ? 'SCAI écoute et réfléchit...' : 'SCAI réfléchit...'}
            </p>
          </div>
        )}
        <div>
          <p className="text-[10px] font-syne font-bold uppercase tracking-widest text-gray-500 mb-3">Aperçu</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Opportunités', value: recentActions?.filter((a: any) => a.action_type === 'search_scan').length || 0, icon: <Search size={12} className="text-[#D4AF37]" /> },
              { label: 'Notifications', value: pendingQueue, icon: <Clock size={12} className="text-blue-500" /> },
              { label: 'Candidatures auto', value: recentActions?.filter((a: any) => a.action_type === 'auto_apply').length || 0, icon: <CheckCircle size={12} className="text-green-500" /> },
              { label: 'Actions récentes', value: recentActions?.length || 0, icon: <Mail size={12} className="text-purple-500" /> },
            ].map((stat, i) => (
              <div key={i} className="bg-[#111111] border border-gray-800 rounded-lg p-2.5 flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-syne uppercase tracking-wider">
                  {stat.icon} {stat.label}
                </div>
                <div className="text-base font-bold text-white font-syne">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-syne font-bold uppercase tracking-widest text-gray-500 mb-3">Vues</p>
          <div className="flex flex-col gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${
                  activeTab === tab.id ? 'bg-[#1A1A1A] text-[#D4AF37]' : 'text-gray-400 hover:text-white hover:bg-[#111111]'
                }`}
              >
                <span>{tab.icon}</span> {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-syne font-bold uppercase tracking-widest text-gray-500">Journal des actions</p>
            <span className="text-[10px] text-gray-600">{recentActions?.length || 0}</span>
          </div>
          {!recentActions || recentActions.length === 0 ? (
            <p className="text-xs text-gray-600">Aucune action pour l'instant. Lance un scan pour commencer.</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {recentActions.slice(0, 20).map((action: any) => (
                <div key={action.id} className="flex items-start gap-2 bg-[#111111] border border-gray-800 rounded-lg px-2.5 py-2">
                  <span className="shrink-0 mt-0.5">{ACTION_ICONS[action.action_type] || <Zap size={12} className="text-[#D4AF37]" />}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-300 line-clamp-2">{action.result}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {action.created_at ? formatDistanceToNow(new Date(action.created_at), { addSuffix: true, locale: fr }) : 'À l\'instant'}
                    </p>
                  </div>
                  {action.success ? (
                    <CheckCircle size={11} className="text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={11} className="text-red-500 shrink-0 mt-0.5" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <TasksPanel />
        <OutputsPanel />
        <div>
          <p className="text-[10px] font-syne font-bold uppercase tracking-widest text-gray-500 mb-3">Contexte</p>
          {connectedConnectors.length === 0 ? (
            <button onClick={() => setActiveTab('connectors')} className="text-xs text-gray-600 hover:text-[#D4AF37] transition-colors text-left">
              Aucun connecteur actif — SCAI travaille avec ton profil seul. Connecter un outil →
            </button>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {connectedConnectors.map(name => (
                <button
                  key={name}
                  onClick={() => setActiveTab('connectors')}
                  className="text-[11px] bg-[#111111] border border-gray-800 rounded-full px-2.5 py-1 text-gray-300 hover:border-[#D4AF37]/50 hover:text-white transition-colors"
                  title="Gérer les connecteurs"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-screen bg-black text-white flex overflow-hidden">

      {/* Rail gauche persistant façon Cowork — Nouveau / Projets / Programmé / Connecteurs / Personnaliser / Discussions */}
      {leftRailOpen ? (
        <aside className="hidden lg:flex w-56 shrink-0 border-r border-gray-800 flex-col p-3">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => { setActiveTab('status'); startNewConversation(); }}
              className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-syne font-bold text-black bg-[#D4AF37] hover:bg-[#B8962D] transition-colors"
            >
              <Plus size={16} /> Nouveau
            </button>
            <button
              onClick={() => setLeftRailOpen(false)}
              className="p-2 text-gray-500 hover:text-white transition-colors shrink-0"
              title="Replier le rail"
            >
              <PanelLeftClose size={16} />
            </button>
          </div>
          <nav className="flex flex-col gap-1">
            {railItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                  activeTab === item.id ? 'bg-[#1A1A1A] text-[#D4AF37]' : 'text-gray-400 hover:text-white hover:bg-[#111111]'
                }`}
              >
                {item.icon} {item.label}
              </button>
            ))}
            <a href="/settings" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#111111] transition-colors">
              <Settings2 size={16} /> Personnaliser
            </a>
          </nav>

          {conversations.length > 0 && (
            <div className="mt-5 flex-1 min-h-0 flex flex-col">
              <p className="text-[10px] font-syne font-bold uppercase tracking-widest text-gray-600 mb-1.5 px-2">Discussions</p>
              <div className="flex-1 overflow-y-auto space-y-0.5">
                {conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => { setActiveTab('status'); setActiveConversationId(conv.id); try { if (conversationKey) localStorage.setItem(conversationKey, conv.id) } catch {} }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                      conv.id === activeConversationId ? 'bg-[#1A1A1A] text-white' : 'text-gray-500 hover:text-white hover:bg-[#111111]'
                    }`}
                    title={conv.title}
                  >
                    <MessageSquareText size={13} className="shrink-0" />
                    <span className="text-xs truncate">{conv.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      ) : (
        <button
          onClick={() => setLeftRailOpen(true)}
          className="hidden lg:flex fixed left-4 top-6 z-10 p-2 bg-[#111111] border border-gray-800 rounded-lg text-gray-400 hover:text-[#D4AF37] transition-colors"
          title="Ouvrir le rail"
        >
          <PanelLeftOpen size={18} />
        </button>
      )}

      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">

        {activeTab === 'status' && chatHistory.length === 0 && (
          /* ── Écran d'accueil — grande salutation + saisie centrée + activité récente,
             affiché tant qu'aucune conversation n'a démarré ─────────────────────── */
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          <div className="max-w-3xl mx-auto flex flex-col items-center pt-10 pb-8">
            <div className="text-4xl mb-3">{greetingEmoji}</div>
            <h1 className="font-syne text-2xl md:text-3xl font-bold text-white mb-8 text-center">
              {greeting}{firstName ? ` ${firstName}` : ''}
            </h1>

            <div className="w-full max-w-2xl bg-[#111111] border border-gray-800 rounded-2xl p-4 shadow-2xl">
              {renderComposer()}
            </div>

            <div className="w-full max-w-2xl flex items-center justify-center mt-3">
              <span className="text-xs text-gray-500">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
                Actif 24h/24 · {pendingQueue} tâche{pendingQueue > 1 ? 's' : ''} planifiée{pendingQueue > 1 ? 's' : ''}
              </span>
            </div>

            {recentActions && recentActions.length > 0 && (
              <div className="w-full max-w-2xl mt-10">
                <p className="text-[10px] font-syne font-bold uppercase tracking-widest text-gray-500 mb-3">Activité récente</p>
                <div className="space-y-2">
                  {recentActions.slice(0, 4).map((a: any) => (
                    <div key={a.id} className="flex items-center gap-3 bg-[#111111] border border-gray-800 rounded-xl px-4 py-3">
                      <span className="shrink-0">{ACTION_ICONS[a.action_type] || <Zap size={14} className="text-[#D4AF37]" />}</span>
                      <p className="text-sm text-gray-300 truncate flex-1">{a.result || a.action_type.replace(/_/g, ' ')}</p>
                      <span className="text-[10px] text-gray-500 shrink-0">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          </div>
        )}

        {activeTab === 'status' && chatHistory.length > 0 && (
        <>
        {/* Header — hauteur fixe, ne défile jamais */}
        <div className="shrink-0 px-4 sm:px-6 pt-6 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-syne text-2xl font-bold text-white">SCAI Cowork</h1>
              <p className="text-sm text-gray-400 mt-1">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                Actif 24h/24 · {pendingQueue} tâches planifiées
              </p>
            </div>
          </div>
        </div>

        {/* Messages — seule zone qui défile, plein cadre comme dans Claude
           Cowork (pas de carte encadrée qui réduit le chat à un petit carré) */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6">
          <div className="flex flex-col gap-4 pb-4">
            {/* Chat History Preview */}
            <div className="flex justify-end items-center -mb-2">
              <div className="flex items-center gap-2">
                {showClearConfirm && (
                  <span className="text-[10px] text-red-400">Supprimer cette discussion ?</span>
                )}
                <button
                  onClick={deleteActiveConversation}
                  className={`transition-colors ${showClearConfirm ? 'text-red-500 hover:text-red-400' : 'text-gray-600 hover:text-red-500'}`}
                  title={showClearConfirm ? "Cliquer pour confirmer" : "Supprimer cette discussion"}
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

            {/* Statut du scan en cours — visible directement dans la
               conversation qui l'a déclenché, plutôt qu'un onglet séparé
               qui aurait fait doublon avec le chat lui-même. */}
            {pendingScanConfirm && (
              <div className="bg-black/40 border border-[#D4AF37]/30 rounded-xl p-4 mb-4">
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
            {scanLog.length > 0 && (
              <div className="bg-black/40 border border-[#D4AF37]/30 rounded-xl p-4 mb-4">
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
              <div className="mb-4">
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
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-300 mb-4">
                {scanError}
              </div>
            )}

            <div className="space-y-4">
              {chatHistory && chatHistory.map((msg: any, i: number) => (
                <div key={i} className={"flex " + (msg?.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={"text-sm " + (
                    msg?.role === 'user'
                      // Message utilisateur : bulle encadrée, pour le distinguer
                      // visuellement de SCAI (seul élément qui garde un cadre).
                      ? 'max-w-[85%] rounded-2xl rounded-tr-none px-4 py-3 shadow-sm bg-[#D4AF37] text-black font-medium'
                      // Message SCAI : plus de bulle/cadre — texte qui coule
                      // directement dans la conversation, comme du texte normal
                      // (même logique que les réponses de Claude lui-même).
                      : 'max-w-[90%] text-gray-200'
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
                        {msg.attachment && <ToolAttachment data={msg.attachment} />}
                      </div>
                    ) : (
                      <div>
                        {msg?.images && msg.images.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {msg.images.map((img, i) => (
                              <img key={i} src={img} alt="Image envoyée" className="rounded-lg max-w-[45%] max-h-64 object-cover" />
                            ))}
                          </div>
                        )}
                        {msg?.content && <div className="whitespace-pre-wrap">{msg.content}</div>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-[#111111] border border-gray-800 rounded-2xl rounded-tl-none px-4 py-3 shadow-lg">
                    <ScaiThinkingOrb size={28} />
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
          </div>
        </div>

        {/* Composer — hauteur fixe, toujours visible en bas comme dans Claude Cowork */}
        <div className="shrink-0 px-4 sm:px-6 pb-6 pt-3">
          <div className="bg-[#111111] border border-gray-800 rounded-2xl p-4 shadow-2xl">
            {renderComposer()}
          </div>
        </div>
        </>
        )}

        {activeTab !== 'status' && (
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-3xl mx-auto">
        {/* Tabs — repris dans le panneau droit "Vues" en desktop (xl+) ;
           visibles ici seulement en dessous, où ce panneau est masqué. */}
        <div className="xl:hidden flex items-center gap-0 mb-6 border-b border-gray-800">
          <div className="flex gap-0 flex-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`xl:hidden px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-[#D4AF37] border-[#D4AF37]'
                    : 'text-gray-500 border-transparent hover:text-white'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
            {/* En dessous de lg, le rail gauche est masqué — ses entrées
               rejoignent donc la barre d'onglets pour rester accessibles. */}
            {railItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`lg:hidden flex items-center gap-1.5 px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  activeTab === item.id
                    ? 'text-[#D4AF37] border-[#D4AF37]'
                    : 'text-gray-500 border-transparent hover:text-white'
                }`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setMobilePanelOpen(true)}
            className="xl:hidden shrink-0 p-2 text-gray-400 hover:text-[#D4AF37] transition-colors"
            title="Sorties & Contexte"
          >
            <PanelRightOpen size={18} />
          </button>
        </div>

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

        {/* Tab: Projets */}
        {activeTab === 'projects' && <ProjectsPanel />}

        {/* Tab: Connecteurs */}
        {activeTab === 'connectors' && (
          <ConnectorsPanel onUseTool={(id) => { if (id in TOOL_META) { pickTool(id as CoworkTool); window.scrollTo({ top: 0, behavior: 'smooth' }); } }} />
        )}

        {/* Tab: Programmé */}
        {activeTab === 'config' && schedule && (
          <div className="space-y-4">

            {(() => {
              const lastScan = recentActions?.find((a: any) => a.action_type === 'search_scan')
              if (!lastScan) return (
                <div className="bg-[#111111] border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                  <Clock size={16} className="text-gray-500 shrink-0" />
                  <p className="text-sm text-gray-400">Aucun scan encore effectué — le premier tournera dès que tu lances SCAI ou dans les {schedule.scan_frequency_hours}h.</p>
                </div>
              )
              const next = new Date(new Date(lastScan.created_at).getTime() + schedule.scan_frequency_hours * 3600_000)
              const isDue = next.getTime() <= Date.now()
              return (
                <div className="bg-[#111111] border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                  <p className="text-sm text-gray-300">
                    {isDue ? 'Prochain scan : imminent (dès la prochaine vérification)' : (
                      <>Prochain scan planifié {formatDistanceToNow(next, { addSuffix: true, locale: fr })}</>
                    )}
                    <span className="text-gray-500"> · dernier scan {formatDistanceToNow(new Date(lastScan.created_at), { addSuffix: true, locale: fr })}</span>
                  </p>
                </div>
              )
            })()}

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
              <div className="font-syne font-bold text-sm text-white mb-4">🎯 Seuil de rédaction automatique</div>
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
              <div className="text-xs text-gray-500 mt-1">Searcher rédige et prépare automatiquement la candidature si score ≥ {schedule.auto_apply_threshold}/100</div>
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
        )}

      </div>

      {/* Panneau droit persistant façon Cowork — Sorties + Contexte */}
      {rightPanelOpen ? (
        <aside className="hidden xl:flex w-80 shrink-0 border-l border-gray-800 flex-col">
          {renderRightPanel()}
        </aside>
      ) : (
        <button
          onClick={() => setRightPanelOpen(true)}
          className="hidden xl:flex fixed right-4 top-6 z-10 p-2 bg-[#111111] border border-gray-800 rounded-lg text-gray-400 hover:text-[#D4AF37] transition-colors"
          title="Ouvrir Sorties & Contexte"
        >
          <PanelRightOpen size={18} />
        </button>
      )}

      {/* Tiroir mobile/tablette pour le panneau droit (en dessous de xl) */}
      {mobilePanelOpen && (
        <div className="fixed inset-0 z-40 xl:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobilePanelOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-black border-l border-gray-800">
            {renderRightPanel({ onClose: () => setMobilePanelOpen(false) })}
          </div>
        </div>
      )}

    </div>
  );
}
