'use client'

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface TrendingHashtagsProps {
  activeHashtag: string | null;
  onSelect: (tag: string) => void;
}

export default function TrendingHashtags({ activeHashtag, onSelect }: TrendingHashtagsProps) {
  const [hashtags, setHashtags] = useState<any[]>([]);

  useEffect(() => {
    const fetchHashtags = async () => {
      const { data } = await supabase
        .from('hashtags')
        .select('*')
        .order('trend_score', { ascending: false })
        .limit(10);
      setHashtags(data || []);
    };
    fetchHashtags();
  }, []);

  if (!hashtags.length) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
      {hashtags.map(h => (
        <button
          key={h.id}
          onClick={() => onSelect(`#${h.tag}`)}
          className={`flex-shrink-0 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-300 border ${
            activeHashtag === `#${h.tag}`
              ? 'bg-[#D4AF37] border-[#D4AF37] text-[#0A0A0A] shadow-[0_0_15px_rgba(212,175,55,0.3)]'
              : 'bg-[#111111] border-[#2a2a2a] text-gray-500 hover:border-[#D4AF37] hover:text-[#D4AF37]'
          }`}
        >
          <span className="opacity-50 mr-1">#</span>
          {h.tag}
          <span className={`ml-2 px-1.5 py-0.5 rounded bg-black/30 text-[8px] ${activeHashtag === `#${h.tag}` ? 'text-[#0A0A0A]/50' : 'text-gray-700'}`}>
            {h.posts_count}
          </span>
        </button>
      ))}
    </div>
  );
}
