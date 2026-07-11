'use client'

import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Image, Video, Mic, ChevronDown, X } from 'lucide-react';
import Card from '../ui/Card';

const POST_TYPES = [
  { value: 'general',           label: '📝 Général' },
  { value: 'opportunity_share', label: '💼 Opportunité' },
  { value: 'achievement',       label: '🏆 Réussite' },
  { value: 'insight',           label: '💡 Insight' },
];

interface CreatePostBoxProps {
  onPostCreated: () => void;
  groupId?: string;
}

export default function CreatePostBox({ onPostCreated, groupId }: CreatePostBoxProps) {
  const { user, profile } = useAuth();
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('general');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleMedia = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setMediaFile(file);
    const url = URL.createObjectURL(file);
    setMediaPreview(url);
    setMediaType(type);
  };

  const extractHashtags = (text: string): string[] => {
    return (text.match(/#\w+/g) || []).map(tag => tag.slice(1).toLowerCase());
  };

  const publish = async () => {
    if (!user || !content.trim() || publishing) return
setPublishing(true)

    try {
      // 1. MODÉRATION AUTOMATIQUE PAR SCAI
      const moderationRes = await fetch('/api/social/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          mediaType,
          userId: user.id
        })
      })

      if (!moderationRes.ok) {
        alert('Erreur lors de la modération. Réessaye.')
        setPublishing(false)
        return
      }

      const { moderation } = await moderationRes.json()

      // Si le contenu est rejeté, informer l'utilisateur
      if (!moderation.approved) {
        alert(`❌ Publication refusée par SCAI\n\n${moderation.reason || 'Ce contenu ne correspond pas aux standards professionnels de Searcher Connector.'}\n\nSearcher Connector est un réseau professionnel. Partage des opportunités, insights, réussites et collaborations.`)
        setPublishing(false)
        return
      }

      // 2. UPLOAD MÉDIA SI PRÉSENT
      let mediaUrl = null
      if (mediaFile) {
        const path = `posts/${user.id}/${Date.now()}-${mediaFile.name}`
        
        const { error: uploadError } = await supabase.storage
          .from('DOCUMENTS')
          .upload(path, mediaFile)
        
        if (uploadError) {
          console.error("Upload error:", uploadError)
          alert(`Erreur d'upload: ${uploadError.message}`)
          setPublishing(false)
          return
        } else {
          const { data } = supabase.storage.from('DOCUMENTS').getPublicUrl(path)
          mediaUrl = data.publicUrl
        }
      }

      // 3. CRÉER LE POST
      const table = groupId ? 'group_posts' : 'posts'
      const insertData: any = {
        author_id: user.id,
        content: content.trim(),
        image_url: mediaUrl,
        media_type: mediaType,
        moderation_score: moderation.confidence,
        moderation_category: moderation.category
      }

      if (groupId) {
        insertData.group_id = groupId
      } else {
        insertData.post_type = postType
        insertData.is_genius_post = profile?.verification_status === 'genius'
      }

      const { data: postData, error } = await supabase
        .from(table)
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error("Supabase insert error:", error)
        alert(`Erreur de publication: ${error.message}`)
        throw error
      }

      // 4. TRAITER LES HASHTAGS
      if (postData) {
        const tags = extractHashtags(content)
        for (const tag of tags) {
          const { data: hashtagData } = await supabase
            .from('hashtags')
            .upsert({ tag, posts_count: 1 }, { onConflict: 'tag' })
            .select()
            .single()
          if (hashtagData && !groupId) {
            await supabase.from('post_hashtags').upsert({
              post_id: postData.id,
              hashtag_id: hashtagData.id
            })
          }
        }
      }
      
      setContent('')
      setMediaFile(null)
      setMediaPreview(null)
      setMediaType(null)
      onPostCreated()
      alert("✅ Publication réussie !")
    } catch (err: any) {
      console.error("Publishing exception:", err)
      alert(`Erreur: ${err.message}`)
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Card className="p-4 border-[#1A1A1A] bg-[#0A0A0A]/50">
      <div className="flex gap-4">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1A1A1A] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[#D4AF37] font-bold">{profile?.full_name?.[0]?.toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={`Quoi de neuf, ${profile?.full_name?.split(' ')[0] || 'Searcher'} ?`}
            rows={3}
            maxLength={2000}
            className="w-full bg-transparent text-white placeholder-gray-600 resize-none focus:outline-none text-sm leading-relaxed"
          />
          {mediaPreview && (
            <div className="relative mt-2 rounded-xl overflow-hidden border border-[#1A1A1A] bg-black/20">
              {mediaType === 'image' && (
                <img src={mediaPreview} alt="" className="w-full max-h-64 object-cover" />
              )}
              {mediaType === 'video' && (
                <video src={mediaPreview} controls className="w-full max-h-64" />
              )}
              {mediaType === 'audio' && (
                <div className="p-4 flex flex-col items-center gap-2">
                  <div className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Aperçu Audio</div>
                  <audio src={mediaPreview} controls className="w-full h-10" />
                </div>
              )}
              <button
                onClick={() => { setMediaFile(null); setMediaPreview(null); setMediaType(null); }}
                className="absolute top-2 right-2 bg-black/70 rounded-full p-1 hover:bg-black transition-colors z-10"
              >
                <X size={14} className="text-white" />
              </button>
            </div>
          )}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1A1A1A]">
            <div className="flex gap-1">
              <button 
                onClick={() => imageInputRef.current?.click()} 
                className="text-gray-500 hover:text-[#D4AF37] p-2 hover:bg-[#1A1A1A] rounded-full transition-all"
                title="Ajouter une image"
              >
                <Image size={18} />
              </button>
              <button 
                onClick={() => videoInputRef.current?.click()} 
                className="text-gray-500 hover:text-[#D4AF37] p-2 hover:bg-[#1A1A1A] rounded-full transition-all"
                title="Ajouter une vidéo"
              >
                <Video size={18} />
              </button>
              <button 
                onClick={() => audioInputRef.current?.click()} 
                className="text-gray-500 hover:text-[#D4AF37] p-2 hover:bg-[#1A1A1A] rounded-full transition-all"
                title="Ajouter un audio"
              >
                <Mic size={18} />
              </button>

              <input ref={imageInputRef} type="file" accept="image/*" onChange={e => handleMedia(e, 'image')} className="hidden" />
              <input ref={videoInputRef} type="file" accept="video/*,video/mp4,video/quicktime,video/x-msvideo,video/webm" onChange={e => handleMedia(e, 'video')} className="hidden" />
              <input ref={audioInputRef} type="file" accept="audio/*,audio/mpeg,audio/wav,audio/ogg,audio/mp4" onChange={e => handleMedia(e, 'audio')} className="hidden" />

              <div className="relative ml-2">
                <button
                  onClick={() => setShowTypeMenu(!showTypeMenu)}
                  className="flex items-center gap-2 text-gray-500 hover:text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-[#2a2a2a] hover:border-[#D4AF37] transition-all"
                >
                  {POST_TYPES.find(t => t.value === postType)?.label}
                  <ChevronDown size={10} />
                </button>
                {showTypeMenu && (
                  <div className="absolute top-10 left-0 bg-[#111111] border border-[#2a2a2a] rounded-xl z-50 min-w-[180px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                    {POST_TYPES.map(t => (
                      <button
                        key={t.value}
                        onClick={() => { setPostType(t.value); setShowTypeMenu(false); }}
                        className={`block w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-[#1A1A1A] transition-colors ${
                          postType === t.value ? 'text-[#D4AF37] bg-[#1A1A1A]/50' : 'text-gray-400'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold text-gray-700 tracking-widest">{content.length}/2000</span>
              <button
                onClick={publish}
                disabled={!content.trim() || publishing}
                className="bg-[#D4AF37] text-[#0A0A0A] px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-[#F5E6A3] disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(212,175,55,0.2)]"
              >
                {publishing ? '...' : 'Publier'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
