'use client'

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus } from 'lucide-react';
import StoryCreator from './StoryCreator';
import StoryViewer from './StoryViewer';

export default function StoriesBar() {
  const { user, profile } = useAuth();
  const [stories, setStories] = useState<any[]>([]);
  const [showCreator, setShowCreator] = useState(false);
  const [viewingStories, setViewingStories] = useState<any[] | null>(null);
  const [viewingIndex, setViewingIndex] = useState(0);

  useEffect(() => {
    loadStories();

    // Realtime subscription pour les nouvelles stories
    const channel = supabase
      .channel('public:stories')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stories'
      }, () => {
        loadStories();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadStories = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('stories')
      .select(`
        *,
        author:users_profiles!author_id(id, full_name, avatar_url, verification_status),
        views:story_views(viewer_id)
      `)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    // Grouper par auteur
    const grouped = (data || []).reduce((acc: any, story: any) => {
      if (!story.author) return acc; // Sécurité si le profil n'est pas trouvé
      
      const authorId = story.author_id;
      if (!acc[authorId]) {
        acc[authorId] = { author: story.author, stories: [], hasUnviewed: false };
      }
      acc[authorId].stories.push(story);
      if (user && !story.views?.some((v: any) => v.viewer_id === user.id)) {
        acc[authorId].hasUnviewed = true;
      }
      return acc;
    }, {});

    setStories(Object.values(grouped));
  };

  return (
    <div className="mb-6">
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {/* Ma story */}
        <button
          onClick={() => setShowCreator(true)}
          className="flex flex-col items-center gap-2 flex-shrink-0 group"
        >
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#D4AF37]/50 flex items-center justify-center bg-[#111111] group-hover:border-[#D4AF37] group-hover:bg-[#1A1A1A] transition-all duration-300">
            <Plus className="text-[#D4AF37]" size={24} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-[#D4AF37] transition-colors">Ma story</span>
        </button>

        {/* Stories des connexions */}
        {stories.map((group: any) => (
          <button
            key={group.author.id}
            onClick={() => { setViewingStories(group.stories); setViewingIndex(0); }}
            className="flex flex-col items-center gap-2 flex-shrink-0 group"
          >
            <div className={`w-16 h-16 rounded-full p-1 transition-transform duration-300 group-hover:scale-105 ${
              group.hasUnviewed
                ? 'bg-gradient-to-br from-[#D4AF37] via-[#F5E6A3] to-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                : 'bg-[#2a2a2a]'
            }`}>
              <div className="w-full h-full rounded-full overflow-hidden bg-black border-2 border-black">
                {group.author.avatar_url ? (
                  <img src={group.author.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#1A1A1A] text-[#D4AF37] font-bold text-lg">
                    {group.author.full_name?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors max-w-[64px] truncate">
              {group.author.full_name?.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>

      {showCreator && (
        <StoryCreator
          onClose={() => setShowCreator(false)}
          onCreated={() => { setShowCreator(false); loadStories(); }}
        />
      )}

      {viewingStories && (
        <StoryViewer
          stories={viewingStories}
          initialIndex={viewingIndex}
          onClose={() => setViewingStories(null)}
        />
      )}
    </div>
  );
}
