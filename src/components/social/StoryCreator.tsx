'use client'

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, Image as ImageIcon, Type, Trophy, Lightbulb, Upload, Video, Mic } from 'lucide-react';
import Card from '../ui/Card';

interface StoryCreatorProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function StoryCreator({ onClose, onCreated }: StoryCreatorProps) {
  const { user } = useAuth();
  const [type, setType] = useState<'text' | 'image' | 'video' | 'audio' | 'achievement' | 'opportunity'>('text');
  const [content, setContent] = useState('');
  const [bgColor, setBgColor] = useState('#D4AF37');
  const [loading, setLoading] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  const colors = ['#D4AF37', '#000000', '#1A1A1A', '#1E3A8A', '#4C1D95'];

  const handleMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    
    if (file.type.startsWith('image/')) setType('image');
    else if (file.type.startsWith('video/')) setType('video');
    else if (file.type.startsWith('audio/')) setType('audio');
  };

  const handleCreate = async () => {
    if (!user || (!content && !mediaFile)) return;
    setLoading(true);
    try {
      let mediaUrl: string | null = null;
      if (mediaFile) {
        const path = `stories/${user.id}/${Date.now()}-${mediaFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('DOCUMENTS')
          .upload(path, mediaFile);
        
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('DOCUMENTS').getPublicUrl(path);
        mediaUrl = data.publicUrl;
      }

      const { error } = await supabase.from('stories').insert({
        author_id: user.id,
        content: content.trim(),
        image_url: mediaUrl,
        story_type: type,
        bg_color: bgColor,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });

      if (error) throw error;
      onCreated();
    } catch (err: any) {
      console.error(err);
      alert(`Failed to create story: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#0A0A0A] border-[#1A1A1A] relative overflow-hidden flex flex-col max-h-[95vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white z-50 bg-black/50 p-2 rounded-full">
          <X size={20} />
        </button>

        <div className="p-6 overflow-y-auto scrollbar-hide flex-1">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#D4AF37] mb-8">Créer une Story</h3>
          
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-8">
            {[
              { id: 'text', icon: Type, label: 'Texte' },
              { id: 'image', icon: ImageIcon, label: 'Image' },
              { id: 'video', icon: Video, label: 'Vidéo' },
              { id: 'audio', icon: Mic, label: 'Audio' },
              { id: 'achievement', icon: Trophy, label: 'Succès' },
              { id: 'opportunity', icon: Lightbulb, label: 'Idée' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setType(t.id as any);
                  if (!['image', 'video', 'audio'].includes(t.id)) { 
                    setMediaFile(null); 
                    setMediaPreview(null); 
                  }
                }}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  type === t.id ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-[#1A1A1A] hover:border-gray-700'
                }`}
              >
                <t.icon size={18} className={type === t.id ? 'text-[#D4AF37]' : 'text-gray-500'} />
                <span className={`text-[8px] font-bold uppercase tracking-widest ${type === t.id ? 'text-white' : 'text-gray-600'}`}>{t.label}</span>
              </button>
            ))}
          </div>

          <div 
            className="w-full aspect-[4/5] md:aspect-[9/16] rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all duration-500 relative overflow-hidden shadow-2xl"
            style={{ backgroundColor: (type === 'text' || !mediaPreview) ? bgColor : '#000000' }}
          >
            {mediaPreview ? (
              <>
                {type === 'image' && <img src={mediaPreview} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />}
                {type === 'video' && <video src={mediaPreview} controls className="absolute inset-0 w-full h-full object-cover opacity-70" />}
                {type === 'audio' && (
                  <div className="z-10 bg-black/40 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                    <Mic className="text-[#D4AF37] w-12 h-12 mx-auto mb-4 animate-pulse" />
                    <audio src={mediaPreview} controls className="w-full h-10" />
                  </div>
                )}
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Ajouter une légende..."
                  className="w-full bg-transparent text-white text-lg font-bold text-center placeholder-white/50 resize-none focus:outline-none z-10 drop-shadow-lg mt-auto"
                  rows={3}
                />
              </>
            ) : ['image', 'video', 'audio'].includes(type) ? (
              <label className="cursor-pointer flex flex-col items-center gap-4 group">
                <div className="w-16 h-16 rounded-full bg-[#1A1A1A] border-2 border-dashed border-[#D4AF37]/50 flex items-center justify-center group-hover:border-[#D4AF37] transition-all">
                  <Upload className="text-[#D4AF37]" size={24} />
                </div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Sélectionner {type === 'image' ? 'une image' : type === 'video' ? 'une vidéo' : 'un audio'}
                </span>
                <input 
                  type="file" 
                  accept={type === 'image' ? 'image/*' : type === 'video' ? 'video/*,video/mp4,video/quicktime,video/x-msvideo,video/webm' : 'audio/*,audio/mpeg,audio/wav,audio/ogg,audio/mp4'} 
                  className="hidden" 
                  onChange={handleMedia} 
                />
              </label>
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={type === 'achievement' ? "J'ai réussi à..." : "Partagez votre expertise..."}
                className="w-full bg-transparent text-white text-xl font-bold text-center placeholder-white/30 resize-none focus:outline-none"
                rows={6}
              />
            )}
          </div>

          {!['image', 'video', 'audio'].includes(type) && !mediaPreview && (
            <div className="flex gap-2 justify-center mt-6">
              {colors.map(c => (
                <button
                  key={c}
                  onClick={() => setBgColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${bgColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={loading || (!content && !mediaFile)}
            className="w-full mt-8 bg-[#D4AF37] text-[#0A0A0A] py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-[#F5E6A3] disabled:opacity-20 transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)]"
          >
            {loading ? 'Publication...' : 'Publier (24h)'}
          </button>
        </div>
      </Card>
    </div>
  );
}
