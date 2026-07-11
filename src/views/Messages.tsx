'use client'

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import Card from '../components/ui/Card';
import { 
  Search, 
  Send, 
  Image as ImageIcon, 
  Paperclip, 
  MoreVertical, 
  ChevronLeft,
  Sparkles,
  Mic,
  Video,
  FileText,
  Loader2,
  UserPlus,
  Check,
  X
} from 'lucide-react';
import { Message, Conversation, UserProfile } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generateSmartReplies } from '../lib/gemini';
import { useTranslation } from 'react-i18next';

type ConnectionRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at?: string;
};

export default function Messages() {
  const { i18n } = useTranslation();
  const { user, profile } = useAuth();
  const searchParams = useSearchParams();
  const targetUserId = searchParams ? searchParams.get('user') : null;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [connectionDirection, setConnectionDirection] = useState<'incoming' | 'outgoing' | 'mutual' | null>(null);
  const [availableContacts, setAvailableContacts] = useState<UserProfile[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<UserProfile[]>([]);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [connectionBusy, setConnectionBusy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canMessageSelectedUser = Boolean(selectedUser && connectionStatus === 'accepted');

  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchConnectionsOverview();
      
      if (targetUserId) {
        handleTargetUser(targetUserId as string);
      }
      
      // Realtime pour les nouveaux messages
      const channel = supabase
        .channel('messages_changes')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages' 
        }, (payload) => {
          const newMsg = payload.new as Message;
          if (
            (newMsg.from_user_id === user.id && newMsg.to_user_id === selectedUser?.id) ||
            (newMsg.from_user_id === selectedUser?.id && newMsg.to_user_id === user.id)
          ) {
            fetchMessages(selectedUser?.id || '');
          }
          fetchConversations();
        })
        .subscribe();

      const connectionsChannel = supabase
        .channel('connections_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'connections'
        }, () => {
          fetchConnectionsOverview();
          if (selectedUser?.id) {
            fetchConnectionStatus(selectedUser.id);
          }
        })
        .subscribe();

      // Suppression de l'écouteur onAuthStateChange qui causait des boucles de rafraîchissement
      // et déconnectait l'utilisateur lors de l'accès aux messages
      
      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(connectionsChannel);
      };
    }
  }, [user, selectedUser?.id, targetUserId]);

  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);

  const startRecording = async () => {
     if (!canMessageSelectedUser) {
       alert("La discussion n'est possible qu'après acceptation de la demande de contact.");
       return;
     }
     try {
       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
       const recorder = new MediaRecorder(stream);
       const localChunks: Blob[] = [];
       const startTime = Date.now();

       recorder.ondataavailable = (e) => {
         if (e.data.size > 0) localChunks.push(e.data);
       };

       recorder.onstop = async () => {
         const duration = Date.now() - startTime;
         // Ne pas envoyer si le message est trop court (moins de 700ms)
         if (localChunks.length > 0 && duration > 700) {
           const audioBlob = new Blob(localChunks, { type: 'audio/webm' });
           await uploadAudio(audioBlob);
         } else {
           
         }
         stream.getTracks().forEach(track => track.stop());
       };

       setRecordingStartTime(startTime);
       recorder.start();
       setMediaRecorder(recorder);
       setIsRecording(true);
     } catch (err) {
       console.error("Error accessing microphone:", err);
       alert("Impossible d'accéder au micro. Vérifiez les permissions de votre navigateur.");
     }
   };

   const stopRecording = () => {
     if (mediaRecorder && mediaRecorder.state !== 'inactive') {
       mediaRecorder.stop();
       setIsRecording(false);
     }
   };

   const uploadAudio = async (blob: Blob) => {
     if (!user || !selectedUser || !canMessageSelectedUser) return;
     setIsUploadingAudio(true);
     try {
       const fileName = `${user.id}-${Date.now()}.webm`;
       const path = `messages/${user.id}/${fileName}`;
       
       
       const { error: uploadError } = await supabase.storage
         .from('DOCUMENTS')
         .upload(path, blob);

       if (uploadError) throw uploadError;

       const { data: { publicUrl } } = supabase.storage.from('DOCUMENTS').getPublicUrl(path);
       

       // Tentative d'insertion avec les colonnes media
       const { error: dbError } = await supabase.from('messages').insert({
        from_user_id: user.id,
        to_user_id: selectedUser.id,
        content: "Message vocal Searcher",
        media_url: publicUrl,
        media_type: 'audio'
      });

       // Fallback si les colonnes media n'existent pas encore dans la DB
       if (dbError && dbError.message.includes('media_url')) {
         
         const { error: fallbackError } = await supabase.from('messages').insert({
           from_user_id: user.id,
           to_user_id: selectedUser.id,
           content: `MEDIA_JSON:{"text":"Message vocal Searcher","media_url":"${publicUrl}","media_type":"audio"}`
         });
         if (fallbackError) throw fallbackError;
       } else if (dbError) {
         throw dbError;
       }

       fetchMessages(selectedUser.id);
     } catch (err: any) {
       console.error("Audio upload/send error:", err);
       alert("Erreur lors de l'envoi du vocal: " + (err.message || "Erreur inconnue"));
     } finally {
       setIsUploadingAudio(false);
     }
   };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTargetUser = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (data) {
        setSelectedUser(data);
        fetchMessages(data.id);
        fetchConnectionStatus(data.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConnectionStatus = async (otherUserId: string) => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('connections')
        .select('id, from_user_id, to_user_id, status, created_at')
        .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${otherUserId}),and(from_user_id.eq.${otherUserId},to_user_id.eq.${user.id})`)
        .order('created_at', { ascending: false });

      const rows = (data || []) as ConnectionRow[];
      const accepted = rows.find(row => row.status === 'accepted');
      const incomingPending = rows.find(row => row.status === 'pending' && row.to_user_id === user.id);
      const outgoingPending = rows.find(row => row.status === 'pending' && row.from_user_id === user.id);

      if (accepted) {
        setConnectionStatus('accepted');
        setConnectionDirection('mutual');
        return;
      }

      if (incomingPending) {
        setConnectionStatus('pending');
        setConnectionDirection('incoming');
        return;
      }

      if (outgoingPending) {
        setConnectionStatus('pending');
        setConnectionDirection('outgoing');
        return;
      }

      setConnectionStatus('none');
      setConnectionDirection(null);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConnectionsOverview = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('connections')
        .select('id, from_user_id, to_user_id, status')
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

      if (error) throw error;

      const rows = (data || []) as ConnectionRow[];
      const acceptedIds = Array.from(new Set(
        rows
          .filter(row => row.status === 'accepted')
          .map(row => row.from_user_id === user.id ? row.to_user_id : row.from_user_id)
      ));
      const incomingIds = Array.from(new Set(
        rows
          .filter(row => row.status === 'pending' && row.to_user_id === user.id)
          .map(row => row.from_user_id)
      ));
      const relatedIds = Array.from(new Set([...acceptedIds, ...incomingIds]));

      if (relatedIds.length === 0) {
        setAvailableContacts([]);
        setIncomingRequests([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('users_profiles')
        .select('*')
        .in('id', relatedIds);

      if (profilesError) throw profilesError;

      const profilesById = new Map((profiles || []).map(profile => [profile.id, profile]));
      const sortByName = (a: UserProfile, b: UserProfile) => (a.full_name || '').localeCompare(b.full_name || '');

      setAvailableContacts(
        acceptedIds
          .map(id => profilesById.get(id))
          .filter(Boolean)
          .sort(sortByName) as UserProfile[]
      );
      setIncomingRequests(
        incomingIds
          .map(id => profilesById.get(id))
          .filter(Boolean)
          .sort(sortByName) as UserProfile[]
      );
    } catch (err) {
      console.error(err);
    }
  };

  const openConversation = (profile: UserProfile) => {
    setSelectedUser(profile);
    setMessages([]);
    setSmartReplies([]);
    setShowContactPicker(false);
    fetchMessages(profile.id);
    fetchConnectionStatus(profile.id);
  };

  const requestConnection = async (targetId: string) => {
    if (!user) return;

    setConnectionBusy(true);
    try {
      const { data, error } = await supabase
        .from('connections')
        .select('id, from_user_id, to_user_id, status, created_at')
        .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${targetId}),and(from_user_id.eq.${targetId},to_user_id.eq.${user.id})`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = (data || []) as ConnectionRow[];
      const accepted = rows.find(row => row.status === 'accepted');
      const incomingPending = rows.find(row => row.status === 'pending' && row.to_user_id === user.id);
      const outgoingPending = rows.find(row => row.status === 'pending' && row.from_user_id === user.id);
      const previousOutgoing = rows.find(row => row.from_user_id === user.id && row.to_user_id === targetId);

      if (accepted || outgoingPending) {
        await fetchConnectionStatus(targetId);
        await fetchConnectionsOverview();
        return;
      }

      if (incomingPending) {
        const { error: updateError } = await supabase
          .from('connections')
          .update({ status: 'accepted' })
          .eq('id', incomingPending.id);

        if (updateError) throw updateError;
      } else if (previousOutgoing) {
        const { error: updateError } = await supabase
          .from('connections')
          .update({ status: 'pending' })
          .eq('id', previousOutgoing.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('connections').insert({
          from_user_id: user.id,
          to_user_id: targetId,
          status: 'pending'
        });

        if (insertError) throw insertError;
      }

      await fetchConnectionStatus(targetId);
      await fetchConnectionsOverview();
    } catch (err) {
      console.error(err);
      alert("Impossible d'envoyer la demande de contact.");
    } finally {
      setConnectionBusy(false);
    }
  };

  const respondToConnection = async (targetId: string, decision: 'accepted' | 'declined') => {
    if (!user) return;

    setConnectionBusy(true);
    try {
      const { error } = await supabase
        .from('connections')
        .update({ status: decision })
        .eq('from_user_id', targetId)
        .eq('to_user_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;

      await fetchConnectionsOverview();
      if (selectedUser?.id === targetId) {
        await fetchConnectionStatus(targetId);
      }
    } catch (err) {
      console.error(err);
      alert("Impossible de mettre à jour cette demande.");
    } finally {
      setConnectionBusy(false);
    }
  };

  const fetchConversations = async () => {
    if (!user) return;
    try {
      // Cette requête est simplifiée, idéalement on utiliserait une vue ou une fonction RPC
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users_profiles!from_user_id(*),
          receiver:users_profiles!to_user_id(*)
        `)
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Grouper par utilisateur
      const groups: Record<string, Conversation> = {};
                    data?.forEach((msg: any) => {
        const otherUser = msg.from_user_id === user.id ? msg.receiver : msg.sender;
        if (otherUser && !groups[otherUser.id]) {
          groups[otherUser.id] = {
            id: otherUser.id,
            other_user: otherUser,
            last_message: msg,
            unread_count: 0,
            updated_at: msg.created_at
          };
        }
      });

      setConversations(Object.values(groups));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (otherUserId: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users_profiles!from_user_id(*),
          receiver:users_profiles!to_user_id(*)
        `)
        .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${otherUserId}),and(from_user_id.eq.${otherUserId},to_user_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      
      // Générer des réponses intelligentes si le dernier message est de l'autre
      const lastMsg = data?.[data.length - 1];
      if (lastMsg && lastMsg.from_user_id !== user.id) {
        getSmartReplies(data.slice(-10));
      } else {
        setSmartReplies([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getSmartReplies = async (recentMessages: Message[]) => {
    if (recentMessages.length === 0) return;
    setIsAiThinking(true);
    try {
      const history = recentMessages.map(m => ({
        content: m.content,
        role: m.from_user_id === user?.id ? 'me' : 'them' as 'me' | 'them',
        mediaUrl: m.media_url,
        mediaType: m.media_type
      }));
      
      
      const replies = await generateSmartReplies(history, i18n.language);
      
      if (replies && replies.length > 0) {
        setSmartReplies(replies);
      } else {
        
        // Fallback contextuel simple si l'IA échoue
        const lastMsg = history[history.length - 1];
        const content = (lastMsg.content || "").toLowerCase();

        if (content.includes('salut') || content.includes('bonjour') || content.includes('hello')) {
          setSmartReplies(["Bonjour !", "Salut, comment vas-tu ?", "Enchanté !"]);
        } else if (lastMsg.mediaType === 'audio') {
          setSmartReplies(["Bien reçu ton vocal.", "D'accord, je l'écoute.", "Entendu !"]);
        } else if (content.includes('projet') || content.includes('marketing') || content.includes('discuter')) {
          setSmartReplies(["C'est très intéressant !", "On peut se voir quand ?", "Quels sont tes objectifs ?"]);
        } else {
          setSmartReplies(["D'accord, je vois.", "Peux-tu m'en dire plus ?", "C'est noté !"]);
        }
      }
    } catch (err) {
      console.error("Error in getSmartReplies:", err);
      setSmartReplies(["Merci !", "Entendu.", "À bientôt."]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!user || !selectedUser || !content.trim()) return;
    if (!canMessageSelectedUser) {
      alert("Tu peux envoyer un message uniquement à un contact qui a accepté la demande.");
      return;
    }

    try {
      const { error } = await supabase.from('messages').insert({
        from_user_id: user.id,
        to_user_id: selectedUser.id,
        content: content.trim()
      });

      if (error) throw error;
      setNewMessage('');
      setSmartReplies([]);
      fetchMessages(selectedUser.id);
      fetchConversations();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedUser) return;
    if (!canMessageSelectedUser) {
      alert("Tu peux envoyer un fichier uniquement à un contact accepté.");
      return;
    }

    try {
      const path = `messages/${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('DOCUMENTS')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('DOCUMENTS').getPublicUrl(path);

      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const mediaType = isImage ? 'image' : isVideo ? 'video' : 'document';

      const { error: dbError } = await supabase.from('messages').insert({
        from_user_id: user.id,
        to_user_id: selectedUser.id,
        content: `Sent a file: ${file.name}`,
        media_url: publicUrl,
        media_type: mediaType
      });

      if (dbError && dbError.message.includes('media_url')) {
        await supabase.from('messages').insert({
          from_user_id: user.id,
          to_user_id: selectedUser.id,
          content: `MEDIA_JSON:{"text":"Sent a file: ${file.name}","media_url":"${publicUrl}","media_type":"${mediaType}"}`
        });
      } else if (dbError) {
        throw dbError;
      }

      fetchMessages(selectedUser.id);
    } catch (err) {
      console.error(err);
      alert("Failed to upload file");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden lg:ml-64 mt-16 lg:mt-0">
        <div className="flex flex-1 h-full overflow-hidden">
          
          {/* Liste des Conversations */}
          <div className={`w-full lg:w-80 border-r border-[#1A1A1A] flex flex-col bg-[#0D0D0D] ${selectedUser ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-6 border-b border-[#1A1A1A]">
              <h2 className="text-xl font-bold text-white mb-4 tracking-tight">Messages</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input 
                  placeholder="Rechercher..."
                  className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37] transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => openConversation(conv.other_user)}
                  className={`w-full p-4 flex gap-3 hover:bg-[#1A1A1A] transition-all border-l-2 ${
                    selectedUser?.id === conv.other_user.id ? 'bg-[#1A1A1A] border-[#D4AF37]' : 'border-transparent'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-[#1A1A1A] border border-[#2a2a2a]">
                      {conv.other_user.avatar_url ? (
                        <img src={conv.other_user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#D4AF37] font-bold">
                          {conv.other_user.full_name?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#0D0D0D] rounded-full"></div>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-white text-sm truncate">{conv.other_user.full_name}</span>
                      <span className="text-[10px] text-gray-600 font-bold uppercase tracking-tighter">
                        {conv.last_message && formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: false, locale: fr })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate font-medium">
                      {conv.last_message?.from_user_id === user?.id && "Moi: "}{conv.last_message?.content}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Fenêtre de Chat */}
          <div className={`flex-1 flex flex-col bg-[#0A0A0A] ${!selectedUser ? 'hidden lg:flex items-center justify-center' : 'flex'}`}>
            {selectedUser ? (
              <>
                {/* Header Chat */}
                <div className="h-16 border-b border-[#1A1A1A] px-6 flex items-center justify-between bg-[#0A0A0A]/50 backdrop-blur-md z-10">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedUser(null)} className="lg:hidden p-2 -ml-2 text-gray-500">
                      <ChevronLeft size={20} />
                    </button>
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-[#2a2a2a] bg-[#111111]">
                      {selectedUser.avatar_url ? (
                        <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#D4AF37] font-bold">
                          {selectedUser.full_name?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-white text-sm leading-tight">{selectedUser.full_name}</div>
                        <span className="text-[9px] px-1.5 py-0.5 bg-[#1A1A1A] text-gray-500 rounded font-bold uppercase tracking-widest border border-[#2a2a2a]">
                          {connectionStatus === 'accepted'
                            ? 'Contact'
                            : connectionStatus === 'pending' && connectionDirection === 'incoming'
                              ? 'Invitation reçue'
                              : connectionStatus === 'pending'
                                ? 'Invitation envoyée'
                                : 'Hors réseau'}
                        </span>
                        {connectionStatus === 'none' && (
                          <button
                            onClick={() => requestConnection(selectedUser.id)}
                            disabled={connectionBusy}
                            className="text-[8px] font-bold text-[#D4AF37] uppercase tracking-widest hover:underline ml-1 disabled:opacity-50"
                          >
                            • Demander le contact
                          </button>
                        )}
                        {connectionStatus === 'pending' && connectionDirection === 'incoming' && (
                          <>
                            <button
                              onClick={() => respondToConnection(selectedUser.id, 'accepted')}
                              disabled={connectionBusy}
                              className="inline-flex items-center gap-1 text-[8px] font-bold text-green-400 uppercase tracking-widest hover:underline ml-1 disabled:opacity-50"
                            >
                              <Check size={10} /> Accepter
                            </button>
                            <button
                              onClick={() => respondToConnection(selectedUser.id, 'declined')}
                              disabled={connectionBusy}
                              className="inline-flex items-center gap-1 text-[8px] font-bold text-red-400 uppercase tracking-widest hover:underline disabled:opacity-50"
                            >
                              <X size={10} /> Refuser
                            </button>
                          </>
                        )}
                      </div>
                      <div className="text-[10px] text-green-500 font-bold uppercase tracking-widest">En ligne</div>
                    </div>
                  </div>
                  <button className="text-gray-500 hover:text-white transition-colors">
                    <MoreVertical size={20} />
                  </button>
                </div>

                {/* Zone Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
                  {messages.map((msg, i) => {
                    const isMe = msg.from_user_id === user?.id;
                    
                    // Parsing du contenu si c'est un fallback JSON
                    let displayContent = msg.content;
                    let mediaUrl = msg.media_url;
                    let mediaType = msg.media_type;
                    
                    if (msg.content.startsWith('MEDIA_JSON:')) {
                      try {
                        const jsonStr = msg.content.replace('MEDIA_JSON:', '');
                        const data = JSON.parse(jsonStr);
                        displayContent = data.text;
                        mediaUrl = data.media_url;
                        mediaType = data.media_type;
                      } catch (e) {
                        console.error("Error parsing media JSON", e);
                      }
                    }

                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}>
                        <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                            isMe 
                              ? 'bg-[#D4AF37] text-[#0A0A0A] rounded-tr-none font-medium' 
                              : 'bg-[#1A1A1A] text-white rounded-tl-none border border-[#2a2a2a]'
                          }`}>
                            {mediaUrl && (
                              <div className="mb-2 rounded-lg overflow-hidden border border-black/10">
                                {mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)/i) ? (
                                  <img src={mediaUrl} className="max-w-full max-h-64 object-cover" />
                                ) : (mediaUrl.match(/\.(mp4|ogg)/i) && !mediaUrl.includes('avatars') && mediaType !== 'audio') ? (
                                  <video src={mediaUrl} controls className="max-w-full max-h-64" />
                                ) : (mediaUrl.includes('.webm') || mediaType === 'audio') ? (
                                  <audio src={mediaUrl} controls className="w-full h-12 bg-black/20 rounded-lg" />
                                ) : null}
                                
                                {mediaType === 'document' && (
                                  <a href={mediaUrl} target="_blank" className="flex items-center gap-3 p-3 bg-black/20 hover:bg-black/40 transition-all group/doc">
                                    <div className="relative">
                                      <FileText className="text-[#D4AF37]" size={20} />
                                      {(msg.sender?.verification_status === 'verified' || msg.sender?.verification_status === 'genius') && (
                                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border border-[#0A0A0A] flex items-center justify-center">
                                          <div className="w-1 h-1 bg-white rounded-full" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[10px] font-bold uppercase tracking-widest truncate max-w-[150px]">
                                        {msg.sender?.verification_status === 'verified' || msg.sender?.verification_status === 'genius' ? 'Document Vérifié' : 'Document'}
                                      </span>
                                      <span className="text-[8px] text-gray-500 font-medium uppercase tracking-tighter group-hover/doc:text-gray-300 transition-colors">
                                        Cliquer pour ouvrir
                                      </span>
                                    </div>
                                  </a>
                                )}
                              </div>
                            )}
                            {displayContent}
                          </div>
                          <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-1">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Zone Input & Smart Replies */}
                <div className="p-4 border-t border-[#1A1A1A] bg-[#0A0A0A]">
                  {!canMessageSelectedUser && selectedUser && (
                    <div className="mb-4 rounded-2xl border border-[#D4AF37]/20 bg-[#1A1500] px-4 py-3 text-xs text-[#F5E6A3]">
                      {connectionStatus === 'pending' && connectionDirection === 'incoming'
                        ? "Cette personne t'a envoyé une demande. Accepte-la pour démarrer la discussion."
                        : connectionStatus === 'pending'
                          ? "Invitation envoyée. Tu pourras écrire dès que la demande sera acceptée."
                          : "Envoie d'abord une demande de contact pour pouvoir discuter."}
                    </div>
                  )}
                  {/* Smart Replies (Désactivé à la demande) */}

                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!canMessageSelectedUser}
                        className="p-2.5 text-gray-500 hover:text-[#D4AF37] hover:bg-[#1A1A1A] rounded-xl transition-all disabled:opacity-30 disabled:hover:text-gray-500 disabled:hover:bg-transparent"
                      >
                        <Paperclip size={20} />
                      </button>
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                      <button 
                        onMouseDown={startRecording}
                        onMouseUp={stopRecording}
                        onMouseLeave={stopRecording}
                        onTouchStart={startRecording}
                        onTouchEnd={stopRecording}
                        disabled={!canMessageSelectedUser}
                        className={`p-2.5 rounded-xl transition-all hidden sm:block ${
                          isRecording ? 'text-red-500 bg-red-500/10 animate-pulse' : 'text-gray-500 hover:text-[#D4AF37] hover:bg-[#1A1A1A]'
                        } disabled:opacity-30 disabled:hover:text-gray-500 disabled:hover:bg-transparent`}
                      >
                        <Mic size={20} />
                      </button>
                    </div>
                    
                    <div className="flex-1 relative">
                      {isRecording ? (
                        <div className="w-full bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-3 text-sm text-red-500 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                            Enregistrement en cours...
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-50 animate-pulse">Relâchez pour envoyer</span>
                        </div>
                      ) : isUploadingAudio ? (
                        <div className="w-full bg-[#1A1500] border border-[#D4AF37]/20 rounded-2xl px-5 py-3 text-sm text-[#D4AF37] flex items-center gap-3">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Envoi du message vocal...
                        </div>
                      ) : (
                        <input 
                          value={newMessage}
                          onChange={e => setNewMessage(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && sendMessage(newMessage)}
                          placeholder={canMessageSelectedUser ? "Écrire un message..." : "Connexion requise pour écrire"}
                          disabled={!canMessageSelectedUser}
                          className="w-full bg-[#111111] border border-[#2a2a2a] rounded-2xl px-5 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-all"
                        />
                      )}
                    </div>

                    <button 
                      onClick={() => sendMessage(newMessage)}
                      disabled={!newMessage.trim() || !canMessageSelectedUser}
                      className="p-3 bg-[#D4AF37] text-[#0A0A0A] rounded-2xl hover:bg-[#F5E6A3] disabled:opacity-20 transition-all shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center p-10">
                {incomingRequests.length > 0 && (
                  <div className="max-w-md mx-auto mb-6 text-left rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37] mb-3">
                      Demandes de contact
                    </div>
                    <div className="space-y-3">
                      {incomingRequests.map((person) => (
                        <div key={person.id} className="flex items-center justify-between gap-3">
                          <button
                            onClick={() => openConversation(person)}
                            className="text-left text-sm text-white hover:text-[#D4AF37] transition-colors"
                          >
                            {person.full_name || person.email || 'Profil'}
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => respondToConnection(person.id, 'accepted')}
                              disabled={connectionBusy}
                              className="inline-flex items-center gap-1 rounded-lg bg-green-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-green-400 disabled:opacity-50"
                            >
                              <Check size={12} /> Accepter
                            </button>
                            <button
                              onClick={() => respondToConnection(person.id, 'declined')}
                              disabled={connectionBusy}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-red-400 disabled:opacity-50"
                            >
                              <X size={12} /> Refuser
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="w-20 h-20 bg-[#111111] rounded-3xl border border-[#2a2a2a] flex items-center justify-center text-gray-800 mx-auto mb-6">
                  <Send size={40} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Vos Messages</h3>
                <p className="text-sm text-gray-500 max-w-xs mx-auto mb-8">Sélectionnez une conversation pour commencer à networker avec la communauté.</p>
                {showContactPicker && (
                  <div className="max-w-md mx-auto mb-4 rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4 text-left">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37] mb-3">
                      Contacts acceptés
                    </div>
                    {availableContacts.length === 0 ? (
                      <div className="text-xs text-gray-500">
                        Aucun contact accepté pour le moment. Envoie d'abord une demande puis attends l'acceptation.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {availableContacts.map((contact) => (
                          <button
                            key={contact.id}
                            onClick={() => openConversation(contact)}
                            className="w-full rounded-xl border border-[#2a2a2a] px-4 py-3 text-left text-sm text-white hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all"
                          >
                            {contact.full_name || contact.email || 'Profil'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setShowContactPicker(prev => !prev)}
                  className="px-8 py-3 bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] rounded-xl font-bold uppercase tracking-widest hover:bg-[#D4AF37]/20 transition-all"
                >
                  Nouvelle discussion
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
