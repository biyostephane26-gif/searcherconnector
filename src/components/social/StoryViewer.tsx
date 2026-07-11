'use client'

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, ChevronLeft, ChevronRight, Eye, Mic } from 'lucide-react';
import Badge from '../ui/Badge';

interface StoryViewerProps {
  stories: any[];
  initialIndex: number;
  onClose: () => void;
}

export default function StoryViewer({ stories, initialIndex, onClose }: StoryViewerProps) {
  const { user } = useAuth();
  const [index, setViewingIndex] = useState(initialIndex);
  const currentStory = stories[index];

  useEffect(() => {
    if (user && currentStory) {
      supabase.from('story_views').upsert({
        story_id: currentStory.id,
        viewer_id: user.id
      }).then();
    }

    // Ajuster le timer selon le type de média
    const duration = currentStory.story_type === 'video' ? 15000 : 5000;
    const timer = setTimeout(() => {
      if (index < stories.length - 1) setViewingIndex(index + 1);
      else onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [index, currentStory, user]);

  return (
    <div className="fixed inset-0 bg-black z-[200] flex items-center justify-center">
      <div className="relative w-full max-w-md h-full max-h-[850px] overflow-hidden sm:rounded-2xl">
        {/* Progress bars */}
        <div className="absolute top-4 inset-x-4 flex gap-1.5 z-50">
          {stories.map((_, i) => (
            <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-white transition-all ease-linear ${
                  i < index ? 'w-full' : i === index ? 'w-full animate-progress' : 'w-0'
                }`}
                style={{ 
                  animationDuration: i === index ? (currentStory.story_type === 'video' ? '15s' : '5s') : '0s'
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-8 inset-x-4 flex items-center justify-between z-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20">
              {currentStory.author.avatar_url ? (
                <img src={currentStory.author.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#1A1A1A] text-[#D4AF37] font-bold">
                  {currentStory.author.full_name?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm shadow-sm">{currentStory.author.full_name}</span>
                <Badge status={currentStory.author.verification_status} />
              </div>
              <div className="flex items-center gap-2 text-white/60 text-[10px] font-bold uppercase tracking-widest">
                <span>{new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {user?.id === currentStory.author_id && (
                  <div className="flex items-center gap-1">
                    <Eye size={10} />
                    <span>{currentStory.views_count || 0}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/70 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div 
          className="w-full h-full flex items-center justify-center relative overflow-hidden"
          style={{ backgroundColor: currentStory.bg_color }}
        >
          {currentStory.image_url && (
            <>
              {currentStory.story_type === 'image' && (
                <img src={currentStory.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}
              {currentStory.story_type === 'video' && (
                <video src={currentStory.image_url} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
              )}
              {currentStory.story_type === 'audio' && (
                <div className="z-10 bg-black/40 p-8 rounded-3xl border border-white/10 backdrop-blur-xl text-center">
                  <Mic className="text-[#D4AF37] w-16 h-16 mx-auto mb-6 animate-pulse" />
                  <audio src={currentStory.image_url} autoPlay controls className="w-full" />
                </div>
              )}
            </>
          )}

          {currentStory.content && (
            <div className={`z-10 p-12 text-center ${currentStory.image_url ? 'mt-auto bg-gradient-to-t from-black/80 to-transparent w-full pb-20' : ''}`}>
              <p className="text-2xl font-bold text-white leading-relaxed drop-shadow-2xl">
                {currentStory.content}
              </p>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <button 
          onClick={(e) => { e.stopPropagation(); if (index > 0) setViewingIndex(index - 1); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/50 hover:text-white transition-colors"
          disabled={index === 0}
        >
          <ChevronLeft size={32} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); if (index < stories.length - 1) setViewingIndex(index + 1); else onClose(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/50 hover:text-white transition-colors"
        >
          <ChevronRight size={32} />
        </button>
      </div>
    </div>
  );
}
