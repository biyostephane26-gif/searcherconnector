'use client'

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import {
  MoreHorizontal, MessageCircle, Share2, Bookmark,
  BookmarkCheck, Flag, Copy, Zap, Loader2
} from 'lucide-react';
import ProfileHoverCard from './ProfileHoverCard';
import { extractOpportunityFromPost } from '../../lib/gemini';

const REACTIONS = [
  { key: 'like',   emoji: '👍', label: 'Like' },
  { key: 'fire',   emoji: '🔥', label: 'Fire' },
  { key: 'clap',   emoji: '👏', label: 'Bravo' },
  { key: 'genius', emoji: '🧠', label: 'Genius' },
  { key: 'rocket', emoji: '🚀', label: 'Rocket' },
];

interface PostCardProps {
  post: any;
  onUpdate?: () => void;
}

export default function PostCard({ post, onUpdate }: PostCardProps) {
  const { user } = useAuth();
  const [showReactions, setShowReactions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showHoverCard, setShowHoverCard] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedOpportunity, setExtractedOpportunity] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [myReaction, setMyReaction] = useState<string | null>(post.my_reaction);
  const [reactionCounts, setReactionCounts] = useState({
    like: post.likes_count || 0,
    fire: 0, clap: 0, genius: 0, rocket: 0
  });

  const handleReaction = async (reactionKey: string) => {
    if (!user) return;
    setShowReactions(false);

    if (myReaction === reactionKey) {
      await supabase
        .from('post_reactions')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.id);
      setMyReaction(null);
      setReactionCounts(prev => ({ ...prev, [reactionKey]: Math.max(0, prev[reactionKey as keyof typeof prev] - 1) }));
    } else {
      await supabase
        .from('post_reactions')
        .upsert({ post_id: post.id, user_id: user.id, reaction: reactionKey });
      
      const newCounts = { ...reactionCounts };
      if (myReaction) {
        newCounts[myReaction as keyof typeof newCounts] = Math.max(0, newCounts[myReaction as keyof typeof newCounts] - 1);
      }
      newCounts[reactionKey as keyof typeof newCounts] = (newCounts[reactionKey as keyof typeof newCounts] || 0) + 1;
      
      setReactionCounts(newCounts);
      setMyReaction(reactionKey);

      // Algorithme Genius : Booster la visibilité si reaction Genius
      if (reactionKey === 'genius') {
        await supabase.from('posts').update({ is_genius_post: true }).eq('id', post.id);
      }
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (isSaved) {
      await supabase.from('saved_posts').delete().eq('post_id', post.id).eq('user_id', user.id);
    } else {
      await supabase.from('saved_posts').upsert({ post_id: post.id, user_id: user.id });
    }
    setIsSaved(!isSaved);
  };

  const handleReport = async (reason: string) => {
    if (!user) return;
    await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: 'post',
      target_id: post.id,
      reason
    });
    setShowMenu(false);
    alert("Merci pour votre signalement. Nous l'analyserons prochainement.");
  };

  const handleTransformToOpportunity = async () => {
    setIsAnalyzing(true);
    setShowMenu(false);
    try {
      const data = await extractOpportunityFromPost(post.content);
      if (data && data.is_opportunity) {
        setExtractedOpportunity(data);
      } else {
        alert("Désolé, l'IA n'a pas détecté d'opportunité claire dans ce post.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, author:users_profiles!author_id(full_name, avatar_url, verification_status)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
      .limit(20);
    setComments(data || []);
  };

  const submitComment = async () => {
    if (!user || !comment.trim()) return;
    await supabase.from('comments').insert({
      post_id: post.id,
      author_id: user.id,
      content: comment.trim()
    });
    setComment('');
    loadComments();
    if (onUpdate) onUpdate();
  };

  const renderContent = (text: string) => {
    return text.split(/(#\w+)/g).map((part, i) =>
      part.startsWith('#')
        ? <span key={i} className="text-[#D4AF37] font-bold cursor-pointer hover:underline">{part}</span>
        : part
    );
  };

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr });

  // Détection du type de média
  const getMediaType = () => {
    if (post.media_type) return post.media_type;
    if (!post.image_url) return null;
    const url = post.image_url.toLowerCase();
    if (url.match(/\.(mp4|webm|ogg|mov)$/)) return 'video';
    if (url.match(/\.(mp3|wav|ogg|m4a)$/)) return 'audio';
    return 'image';
  };

  const mediaType = getMediaType();

  return (
    <Card className={`overflow-hidden hover:border-[#D4AF37]/30 transition-all duration-300 ${post.is_genius_post ? 'border-[#D4AF37] glow-gold' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between p-4">
        <div 
          className="flex items-center gap-3 relative"
          onMouseEnter={() => setShowHoverCard(true)}
          onMouseLeave={() => setShowHoverCard(false)}
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1A1A1A] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0 cursor-pointer">
            {post.author?.avatar_url ? (
              <img src={post.author.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[#D4AF37] font-bold">{post.author?.full_name?.[0]?.toUpperCase()}</span>
            )}
          </div>
          <div className="cursor-pointer">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm hover:text-[#D4AF37] transition-colors">{post.author?.full_name}</span>
              <Badge status={post.author?.verification_status} />
            </div>
            <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-0.5">
              {post.author?.domain} • {timeAgo}
            </div>
          </div>

          {showHoverCard && (
            <div className="absolute top-12 left-0 z-50">
              <ProfileHoverCard profile={post.author} />
            </div>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-gray-600 hover:text-[#D4AF37] p-2 hover:bg-[#1A1A1A] rounded-full transition-all"
          >
            <MoreHorizontal size={18} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-10 bg-[#111111] border border-[#2a2a2a] rounded-xl z-50 min-w-[220px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <button 
                onClick={handleTransformToOpportunity}
                disabled={isAnalyzing}
                className="flex items-center gap-3 w-full px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors"
              >
                {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} 
                Extraire Opportunité
              </button>
              <button onClick={handleSave} className="flex items-center gap-3 w-full px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-[#D4AF37] hover:bg-[#1A1A1A] transition-colors">
                <Bookmark size={14} /> Sauvegarder
              </button>
              <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/post/' + post.id); setShowMenu(false); }}
                className="flex items-center gap-3 w-full px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-[#D4AF37] hover:bg-[#1A1A1A] transition-colors">
                <Copy size={14} /> Copier le lien
              </button>
              <button onClick={() => handleReport('spam')}
                className="flex items-center gap-3 w-full px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-colors">
                <Flag size={14} /> Signaler
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contenu */}
      <div className="px-4 pb-4">
        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
          {renderContent(post.content)}
        </p>

        {extractedOpportunity && (
          <div className="mt-4 p-4 bg-[#1A1500] border border-[#D4AF37]/30 rounded-xl animate-in slide-in-from-top-2 duration-300 relative group/opp">
            <button 
              onClick={() => setExtractedOpportunity(null)}
              className="absolute top-2 right-2 text-gray-600 hover:text-white"
            >
              ×
            </button>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-[#D4AF37]" />
              <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Opportunité Détectée par IA</span>
            </div>
            <h4 className="text-white font-bold text-sm mb-1">{extractedOpportunity.title}</h4>
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mb-2">
              {extractedOpportunity.company} • {extractedOpportunity.location}
            </div>
            <p className="text-xs text-gray-500 mb-3">{extractedOpportunity.description}</p>
            <div className="bg-black/20 p-2 rounded-lg text-[10px] text-[#D4AF37] italic">
              " {extractedOpportunity.match_reason} "
            </div>
            <button 
              onClick={() => {
                alert(`Agent Searcher : Analyse de l'opportunité "${extractedOpportunity.title}" en cours...`);
                // Ici on pourrait rediriger vers l'agent avec les données pré-remplies
              }}
              className="w-full mt-3 py-2 bg-[#D4AF37] text-[#0A0A0A] rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-[#F5E6A3] transition-all"
            >
              Postuler via Searcher Agent
            </button>
          </div>
        )}
        
        {post.image_url && (
          <div className="mt-4 rounded-xl overflow-hidden border border-[#1A1A1A] bg-black/20">
            {mediaType === 'image' && (
              <img src={post.image_url} alt="" className="w-full max-h-[500px] object-cover" />
            )}
            {mediaType === 'video' && (
              <video src={post.image_url} controls className="w-full max-h-[500px]" />
            )}
            {mediaType === 'audio' && (
              <div className="p-6 flex flex-col items-center gap-4 bg-[#111111]">
                <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
                  <Share2 className="text-[#D4AF37] w-8 h-8 animate-pulse" />
                </div>
                <audio src={post.image_url} controls className="w-full" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Barre de réactions */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-[#1A1A1A]">
        <div className="flex items-center gap-1 relative">
          {/* Popup réactions */}
          {showReactions && (
            <div 
              className="absolute bottom-12 left-0 bg-[#111111] border border-[#2a2a2a] rounded-full px-2 py-1.5 flex gap-2 z-50 shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-200"
              onMouseLeave={() => setShowReactions(false)}
            >
              {REACTIONS.map(r => (
                <button
                  key={r.key}
                  onClick={() => handleReaction(r.key)}
                  className={`text-2xl p-2 rounded-full hover:scale-125 hover:bg-[#1A1A1A] transition-all ${
                    myReaction === r.key ? 'bg-[#D4AF37]/20' : ''
                  }`}
                  title={r.label}
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          )}
          <button
            onMouseEnter={() => setShowReactions(true)}
            onClick={() => handleReaction(myReaction || 'like')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
              myReaction
                ? 'bg-[#D4AF37] text-[#0A0A0A] shadow-[0_0_10px_rgba(212,175,55,0.3)]'
                : 'bg-[#111111] text-gray-500 hover:text-[#D4AF37] hover:bg-[#1A1A1A]'
            }`}
          >
            {myReaction ? REACTIONS.find(r => r.key === myReaction)?.emoji : '👍'}
            <span>{Object.values(reactionCounts).reduce((a, b) => a + b, 0) || ''}</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => { setShowComments(!showComments); if (!showComments) loadComments(); }}
            className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg transition-all ${
              showComments ? 'text-[#D4AF37] bg-[#1A1A1A]' : 'text-gray-500 hover:text-white hover:bg-[#1A1A1A]'
            }`}
          >
            <MessageCircle size={16} />
            <span>{post.comments_count || ''}</span>
          </button>
          <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white hover:bg-[#1A1A1A] px-3 py-2 rounded-lg transition-all">
            <Share2 size={16} />
          </button>
          <button onClick={handleSave} className={`px-3 py-2 rounded-lg transition-all ${isSaved ? 'text-[#D4AF37] bg-[#1A1A1A]' : 'text-gray-500 hover:text-white hover:bg-[#1A1A1A]'}`}>
            {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          </button>
        </div>
      </div>

      {/* Section commentaires */}
      {showComments && (
        <div className="bg-[#0A0A0A]/50 border-t border-[#1A1A1A] px-4 py-4 space-y-4">
          <div className="max-h-60 overflow-y-auto space-y-4 scrollbar-hide">
            {comments.map(c => (
              <div key={c.id} className="flex gap-3 animate-in fade-in duration-300">
                <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0 text-[10px] text-[#D4AF37] font-bold uppercase">
                  {c.author?.full_name?.[0]?.toUpperCase()}
                </div>
                <div className="bg-[#111111] border border-[#1A1A1A] rounded-xl px-4 py-2.5 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white text-[10px] font-bold uppercase tracking-widest">{c.author?.full_name}</span>
                    <Badge status={c.author?.verification_status} />
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <input
              value={comment}
              onChange={e => setComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitComment()}
              placeholder="Ajouter un commentaire..."
              className="flex-1 bg-[#111111] border border-[#2a2a2a] rounded-lg px-4 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-all"
            />
            <button
              onClick={submitComment}
              disabled={!comment.trim()}
              className="bg-[#D4AF37] text-[#0A0A0A] px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-[#F5E6A3] disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              Envoyer
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
