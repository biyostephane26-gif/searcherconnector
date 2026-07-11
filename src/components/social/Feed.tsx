'use client'

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PostCard from './PostCard';
import CreatePostBox from './CreatePostBox';
import InfiniteScroll from 'react-infinite-scroll-component';

interface FeedProps {
  filter: string;
}

export default function Feed({ filter }: FeedProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  const loadPosts = useCallback(async (reset = false) => {
    if (reset) setInitialLoading(true);
    const currentPage = reset ? 0 : page;
    const from = currentPage * 10;
    const to = from + 9;

    let query = supabase
      .from('posts')
      .select(`
        *,
        author:users_profiles!author_id(
          id, full_name, avatar_url, verification_status, domain, profile_type
        ),
        user_reaction:post_reactions(reaction, user_id)
      `)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to);

    // Appliquer les filtres
    if (filter === 'verified') {
      query = query.eq('author.verification_status', 'verified');
    } else if (filter === 'genius') {
      query = query.eq('author.verification_status', 'genius');
    } else if (filter.startsWith('#')) {
      const { data: hashtagData } = await supabase
        .from('hashtags')
        .select('id')
        .eq('tag', filter.slice(1))
        .single();
      
      if (hashtagData) {
        const { data: postIds } = await supabase
          .from('post_hashtags')
          .select('post_id')
          .eq('hashtag_id', hashtagData.id);
        
        if (postIds) {
          query = query.in('id', postIds.map((p: any) => p.post_id));
        }
      }
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error loading posts:", error);
      setHasMore(false);
      setInitialLoading(false);
      return;
    }

    const enriched = (data || []).map((post: any) => ({
      ...post,
      my_reaction: post.user_reaction?.find((r: any) => r.user_id === user?.id)?.reaction || null
    }));

    if (reset) {
      setPosts(enriched);
      setPage(1);
    } else {
      setPosts(prev => [...prev, ...enriched]);
      setPage(prev => prev + 1);
    }
    setHasMore((data?.length || 0) === 10);
    setInitialLoading(false);
  }, [page, filter, user]);

  useEffect(() => {
    loadPosts(true);
  }, [filter]);

  // Realtime subscription pour nouveaux posts
  useEffect(() => {
    const channel = supabase
      .channel('posts_feed')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts'
      }, () => {
        loadPosts(true);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadPosts]);

  return (
    <div className="space-y-6">
      <CreatePostBox onPostCreated={() => loadPosts(true)} />
      
      {initialLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 bg-[#111111] border border-[#2a2a2a] rounded-3xl">
          <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">
            Aucun post trouvé pour ce filtre.
          </p>
        </div>
      ) : (
        <InfiniteScroll
          dataLength={posts.length}
          next={() => loadPosts(false)}
          hasMore={hasMore}
          loader={
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            </div>
          }
          endMessage={
            <p className="text-center text-gray-600 py-8 text-sm font-bold tracking-widest uppercase">
              Vous avez tout vu — revenez demain.
            </p>
          }
        >
          <div className="space-y-6">
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onUpdate={() => loadPosts(true)}
              />
            ))}
          </div>
        </InfiniteScroll>
      )}
    </div>
  );
}
