=================================================================
SEARCHER CONNECTOR — OPENHANDS PROMPT — COUCHE 2
RÉSEAU SOCIAL AVANCÉ — GROUPES, STORIES, TRENDING, LIVE
=================================================================
Tu es un développeur senior full-stack avec 15 ans d'expérience.
La Couche 1 est déjà codée et fonctionnelle.
Tu construis PAR-DESSUS la couche 1 sans rien casser.
Tu codes TOUT. Tu ne sautes RIEN. Tu te corriges toi-même.
Tu testes mentalement chaque feature avant de passer à la suivante.
=================================================================

PRÉREQUIS : La Couche 1 tourne parfaitement.
npm run dev fonctionne. Build passe. Supabase connecté.
Tables existantes : users_profiles, posts, connections, notifications,
messages, conversations, likes, comments, post_shares.
=================================================================

=================================================================
ÉTAPE 1 — NOUVELLES TABLES SQL (COUCHE 2)
=================================================================

Ouvre Supabase SQL Editor et exécute ce SQL complet :

-- Groupes
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  cover_url text,
  avatar_url text,
  category text check (
    category in ('emploi','freelance','investissement','tech','marketing','design','finance','startup','cameroun','afrique','autre')
  ),
  visibility text default 'public' check (visibility in ('public','private')),
  created_by uuid references users_profiles(id) on delete set null,
  members_count integer default 1,
  posts_count integer default 0,
  is_verified boolean default false,
  created_at timestamp default now()
);

-- Membres des groupes
create table if not exists group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references users_profiles(id) on delete cascade,
  role text default 'member' check (role in ('member','moderator','admin')),
  joined_at timestamp default now(),
  unique(group_id, user_id)
);

-- Posts dans les groupes
create table if not exists group_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  author_id uuid references users_profiles(id) on delete cascade,
  content text not null,
  image_url text,
  likes_count integer default 0,
  comments_count integer default 0,
  is_pinned boolean default false,
  created_at timestamp default now()
);

-- Stories (visibles 24h)
create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references users_profiles(id) on delete cascade,
  content text,
  image_url text,
  story_type text default 'text' check (story_type in ('text','image','achievement','opportunity')),
  bg_color text default '#D4AF37',
  views_count integer default 0,
  expires_at timestamp default (now() + interval '24 hours'),
  created_at timestamp default now()
);

-- Vues des stories
create table if not exists story_views (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references stories(id) on delete cascade,
  viewer_id uuid references users_profiles(id) on delete cascade,
  viewed_at timestamp default now(),
  unique(story_id, viewer_id)
);

-- Hashtags
create table if not exists hashtags (
  id uuid primary key default gen_random_uuid(),
  tag text not null unique,
  posts_count integer default 0,
  trend_score integer default 0,
  last_used_at timestamp default now()
);

-- Lien posts ↔ hashtags
create table if not exists post_hashtags (
  post_id uuid references posts(id) on delete cascade,
  hashtag_id uuid references hashtags(id) on delete cascade,
  primary key (post_id, hashtag_id)
);

-- Signalements
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references users_profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post','comment','profile','group','story','message')),
  target_id uuid not null,
  reason text not null check (
    reason in ('spam','fake','harassment','inappropriate','scam','other')
  ),
  details text,
  status text default 'pending' check (status in ('pending','reviewed','resolved','dismissed')),
  reviewed_by uuid references users_profiles(id),
  created_at timestamp default now()
);

-- Réactions avancées sur les posts (fire, clap, genius, rocket)
create table if not exists post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references users_profiles(id) on delete cascade,
  reaction text not null check (reaction in ('like','fire','clap','genius','rocket')),
  created_at timestamp default now(),
  unique(post_id, user_id)
);

-- Sauvegardes de posts
create table if not exists saved_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profiles(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  saved_at timestamp default now(),
  unique(user_id, post_id)
);

-- Endorsements vérifiés
create table if not exists endorsements (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid references users_profiles(id) on delete cascade,
  to_user_id uuid references users_profiles(id) on delete cascade,
  skill text not null,
  comment text,
  verified_by_searcher boolean default false,
  created_at timestamp default now(),
  unique(from_user_id, to_user_id, skill)
);

-- Articles longs (Genius/Verified only)
create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references users_profiles(id) on delete cascade,
  title text not null,
  subtitle text,
  cover_url text,
  content text not null,
  tags text[],
  reads_count integer default 0,
  likes_count integer default 0,
  is_published boolean default false,
  published_at timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- RLS sur toutes les nouvelles tables
alter table groups enable row level security;
alter table group_members enable row level security;
alter table group_posts enable row level security;
alter table stories enable row level security;
alter table story_views enable row level security;
alter table hashtags enable row level security;
alter table post_hashtags enable row level security;
alter table reports enable row level security;
alter table post_reactions enable row level security;
alter table saved_posts enable row level security;
alter table endorsements enable row level security;
alter table articles enable row level security;

-- Policies : groupes publics visibles par tous
create policy "groups_public_read" on groups
  for select using (visibility = 'public' or created_by = auth.uid());

create policy "groups_insert" on groups
  for insert with check (auth.uid() is not null);

create policy "group_members_read" on group_members
  for select using (true);

create policy "group_members_insert" on group_members
  for insert with check (auth.uid() = user_id);

create policy "group_posts_read" on group_posts
  for select using (true);

create policy "group_posts_insert" on group_posts
  for insert with check (auth.uid() = author_id);

create policy "stories_read" on stories
  for select using (expires_at > now());

create policy "stories_insert" on stories
  for insert with check (auth.uid() = author_id);

create policy "story_views_insert" on story_views
  for insert with check (auth.uid() = viewer_id);

create policy "hashtags_read" on hashtags
  for select using (true);

create policy "post_reactions_all" on post_reactions
  for all using (auth.uid() = user_id);

create policy "saved_posts_all" on saved_posts
  for all using (auth.uid() = user_id);

create policy "endorsements_read" on endorsements
  for select using (true);

create policy "endorsements_insert" on endorsements
  for insert with check (auth.uid() = from_user_id);

create policy "articles_read" on articles
  for select using (is_published = true or author_id = auth.uid());

create policy "articles_all_own" on articles
  for all using (author_id = auth.uid());

create policy "reports_insert" on reports
  for insert with check (auth.uid() = reporter_id);

=================================================================
ÉTAPE 2 — INSTALLER LES NOUVELLES DÉPENDANCES
=================================================================

npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-image
npm install @tiptap/extension-placeholder @tiptap/extension-character-count
npm install react-dropzone emoji-picker-react
npm install date-fns
npm install react-infinite-scroll-component

=================================================================
ÉTAPE 3 — MISE À JOUR DES TYPES TYPESCRIPT
=================================================================

Ouvre src/types/index.ts et AJOUTE ces types (sans supprimer les existants) :

export type Group = {
  id: string;
  name: string;
  description?: string;
  cover_url?: string;
  avatar_url?: string;
  category: string;
  visibility: 'public' | 'private';
  created_by?: string;
  members_count: number;
  posts_count: number;
  is_verified: boolean;
  created_at: string;
  is_member?: boolean;
  member_role?: string;
};

export type GroupPost = {
  id: string;
  group_id: string;
  author_id: string;
  content: string;
  image_url?: string;
  likes_count: number;
  comments_count: number;
  is_pinned: boolean;
  created_at: string;
  author?: UserProfile;
};

export type Story = {
  id: string;
  author_id: string;
  content?: string;
  image_url?: string;
  story_type: 'text' | 'image' | 'achievement' | 'opportunity';
  bg_color: string;
  views_count: number;
  expires_at: string;
  created_at: string;
  author?: UserProfile;
  is_viewed?: boolean;
};

export type Hashtag = {
  id: string;
  tag: string;
  posts_count: number;
  trend_score: number;
  last_used_at: string;
};

export type Article = {
  id: string;
  author_id: string;
  title: string;
  subtitle?: string;
  cover_url?: string;
  content: string;
  tags?: string[];
  reads_count: number;
  likes_count: number;
  is_published: boolean;
  published_at?: string;
  created_at: string;
  author?: UserProfile;
};

export type Endorsement = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  skill: string;
  comment?: string;
  verified_by_searcher: boolean;
  created_at: string;
  from_user?: UserProfile;
};

export type PostReaction = 'like' | 'fire' | 'clap' | 'genius' | 'rocket';

=================================================================
ÉTAPE 4 — MISE À JOUR DU FEED PRINCIPAL
=================================================================

Modifie src/pages/Feed.tsx (ou crée-le s'il n'existe pas) :

STRUCTURE COMPLÈTE DU FEED :

Section 1 — Stories bar (défilement horizontal) :
- Cercle "+ Ma story" → ouvre StoryCreator
- Cercles des connexions avec stories actives
- Cercle avec anneau OR si story non vue
- Cercle grisé si déjà vu
- Clic → ouvre StoryViewer plein écran

Section 2 — Zone de création de post :
- Avatar de l'utilisateur connecté
- Input placeholder : "Partagez une opportunité, une réussite, une insight..."
- Boutons inline : Image | Article | Hashtag
- Badge GENIUS en or si verification_status = 'genius'

Section 3 — Trending hashtags (horizontal scroll) :
- Récupère les 8 hashtags avec trend_score le plus élevé
- Pills noires avec texte or : #marketing #emploi #startup
- Clic → filtre le feed sur ce hashtag

Section 4 — Feed principal (infinite scroll) :
- Charge 10 posts, puis 10 de plus au scroll
- Ordre : posts des connexions + posts GENIUS en priorité
- Chaque PostCard inclut les nouvelles réactions

Section 5 — Sidebar droite (desktop uniquement) :
- "Groupes suggérés" : 3 groupes selon le profil
- "Personnes à connecter" : 3 profils VERIFIED/GENIUS
- "Articles tendance" : 2 articles récents

CODE :

--- src/pages/Feed.tsx ---

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import StoriesBar from '../components/social/StoriesBar';
import CreatePostBox from '../components/social/CreatePostBox';
import PostCard from '../components/social/PostCard';
import TrendingHashtags from '../components/social/TrendingHashtags';
import SuggestedGroups from '../components/social/SuggestedGroups';
import SuggestedConnections from '../components/social/SuggestedConnections';
import InfiniteScroll from 'react-infinite-scroll-component';

export default function Feed() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [activeHashtag, setActiveHashtag] = useState<string | null>(null);

  const loadPosts = useCallback(async (reset = false) => {
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
        user_reaction:post_reactions(reaction)
      `)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (activeHashtag) {
      const { data: hashtagData } = await supabase
        .from('hashtags')
        .select('id')
        .eq('tag', activeHashtag)
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
    if (error) return;

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
  }, [page, activeHashtag, user]);

  useEffect(() => {
    loadPosts(true);
  }, [activeHashtag]);

  // Realtime subscription pour nouveaux posts
  useEffect(() => {
    const channel = supabase
      .channel('posts_feed')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts'
      }, (payload) => {
        loadPosts(true);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Feed principal */}
          <div className="flex-1 max-w-2xl">
            <StoriesBar />
            <TrendingHashtags
              activeHashtag={activeHashtag}
              onSelect={(tag) => setActiveHashtag(tag === activeHashtag ? null : tag)}
            />
            <CreatePostBox onPostCreated={() => loadPosts(true)} />
            <InfiniteScroll
              dataLength={posts.length}
              next={() => loadPosts(false)}
              hasMore={hasMore}
              loader={
                <div className="flex justify-center py-4">
                  <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                </div>
              }
              endMessage={
                <p className="text-center text-gray-600 py-4 text-sm">
                  Vous avez tout vu — revenez demain.
                </p>
              }
            >
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  onUpdate={() => loadPosts(true)}
                />
              ))}
            </InfiniteScroll>
          </div>
          {/* Sidebar desktop */}
          <div className="hidden lg:block w-72 space-y-4">
            <SuggestedGroups />
            <SuggestedConnections />
          </div>
        </div>
      </div>
    </div>
  );
}

=================================================================
ÉTAPE 5 — COMPOSANT STORIES
=================================================================

--- src/components/social/StoriesBar.tsx ---

Affiche la barre de stories horizontale.

Logique :
1. Charge les stories actives (expires_at > now()) des connexions
2. Groupe par auteur (1 cercle par auteur)
3. Anneau or = story non vue, anneau gris = vue
4. Clic → ouvre StoryViewer

--- src/components/social/StoryCreator.tsx ---

Modal pour créer une story :
- Onglet "Texte" : textarea + choix couleur fond (noir, or, violet, bleu)
- Onglet "Image" : upload via react-dropzone
- Onglet "Réussite" : template prédéfini "J'ai été sélectionné(e) pour..."
- Bouton "Publier (24h)"
- Insert dans table stories

--- src/components/social/StoryViewer.tsx ---

Plein écran sur mobile, modal sur desktop :
- Affiche la story en plein écran
- Barre de progression en haut (auto-avance après 5s)
- Swipe gauche/droite pour naviguer
- Bouton X pour fermer
- Compteur vues
- Insert dans story_views au chargement

CODE StoriesBar :

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import StoryCreator from './StoryCreator';
import StoryViewer from './StoryViewer';
import { Plus } from 'lucide-react';

export default function StoriesBar() {
  const { user, profile } = useAuth();
  const [stories, setStories] = useState<any[]>([]);
  const [showCreator, setShowCreator] = useState(false);
  const [viewingStories, setViewingStories] = useState<any[] | null>(null);
  const [viewingIndex, setViewingIndex] = useState(0);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
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
      const authorId = story.author_id;
      if (!acc[authorId]) {
        acc[authorId] = { author: story.author, stories: [], hasUnviewed: false };
      }
      acc[authorId].stories.push(story);
      if (!story.views?.some((v: any) => v.viewer_id === user?.id)) {
        acc[authorId].hasUnviewed = true;
      }
      return acc;
    }, {});

    setStories(Object.values(grouped));
  };

  return (
    <div className="mb-4">
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {/* Ma story */}
        <button
          onClick={() => setShowCreator(true)}
          className="flex flex-col items-center gap-1 flex-shrink-0"
        >
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-gold flex items-center justify-center bg-black-card hover:border-gold-light transition-colors">
            <Plus className="text-gold" size={20} />
          </div>
          <span className="text-xs text-gray-400">Ma story</span>
        </button>

        {/* Stories des connexions */}
        {stories.map((group: any) => (
          <button
            key={group.author.id}
            onClick={() => { setViewingStories(group.stories); setViewingIndex(0); }}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div className={`w-16 h-16 rounded-full p-0.5 ${
              group.hasUnviewed
                ? 'bg-gradient-to-br from-gold to-gold-dark'
                : 'bg-gray-700'
            }`}>
              <div className="w-full h-full rounded-full overflow-hidden bg-black">
                {group.author.avatar_url ? (
                  <img src={group.author.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-black-card text-gold font-bold">
                    {group.author.full_name?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <span className="text-xs text-gray-400 max-w-[64px] truncate">
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

=================================================================
ÉTAPE 6 — POSTCARD AVEC RÉACTIONS AVANCÉES
=================================================================

--- src/components/social/PostCard.tsx ---

Remplace / améliore le PostCard existant.

STRUCTURE D'UNE CARD :

Header :
- Avatar auteur + nom + badge (GENIUS en or, VERIFIED en argent)
- Domaine + heure relative (formatDistance de date-fns)
- Menu ⋯ → Signaler | Sauvegarder | Copier lien

Corps :
- Texte du post avec hashtags cliquables en or
- Image si présente (rounded-lg, max-height 400px)
- Preview article si post_type = 'article'

Réactions (barre) :
5 boutons de réaction avec compteur :
👍 Like | 🔥 Fire | 👏 Clap | 🧠 Genius | 🚀 Rocket

Au survol : popup avec les 5 options.
Au clic direct : toggle Like.
Réaction active = fond or, texte noir.
Clic sur réaction active = annule la réaction.

Logique :
- Upsert dans post_reactions
- Si même réaction → DELETE (toggle off)
- Update compteur local optimiste

Footer :
- Icône commentaire + compteur → ouvre CommentsSection
- Icône partage → ouvre ShareModal
- Icône signet → toggle saved_posts

Section commentaires (collapsible) :
- Input commentaire + bouton envoyer
- Affiche les 3 derniers commentaires
- "Voir tous les X commentaires" → charge tous

CODE PostCard complet :

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import {
  MoreHorizontal, MessageCircle, Share2, Bookmark,
  BookmarkCheck, Flag, Copy
} from 'lucide-react';

const REACTIONS = [
  { key: 'like',   emoji: '👍', label: 'Like' },
  { key: 'fire',   emoji: '🔥', label: 'Fire' },
  { key: 'clap',   emoji: '👏', label: 'Bravo' },
  { key: 'genius', emoji: '🧠', label: 'Genius' },
  { key: 'rocket', emoji: '🚀', label: 'Rocket' },
];

interface PostCardProps {
  post: any;
  onUpdate: () => void;
}

export default function PostCard({ post, onUpdate }: PostCardProps) {
  const { user } = useAuth();
  const [showReactions, setShowReactions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
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
      // Annuler la réaction
      await supabase
        .from('post_reactions')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.id);
      setMyReaction(null);
      setReactionCounts(prev => ({ ...prev, [reactionKey]: Math.max(0, prev[reactionKey as keyof typeof prev] - 1) }));
    } else {
      // Nouvelle réaction ou changement
      await supabase
        .from('post_reactions')
        .upsert({ post_id: post.id, user_id: user.id, reaction: reactionKey });
      if (myReaction) {
        setReactionCounts(prev => ({
          ...prev,
          [myReaction]: Math.max(0, prev[myReaction as keyof typeof prev] - 1),
          [reactionKey]: prev[reactionKey as keyof typeof prev] + 1
        }));
      } else {
        setReactionCounts(prev => ({ ...prev, [reactionKey]: prev[reactionKey as keyof typeof prev] + 1 }));
      }
      setMyReaction(reactionKey);
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
  };

  const renderContent = (text: string) => {
    return text.split(/(#\w+)/g).map((part, i) =>
      part.startsWith('#')
        ? <span key={i} className="text-gold cursor-pointer hover:text-gold-light">{part}</span>
        : part
    );
  };

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr });

  return (
    <div className="bg-black-card border border-gray-800 rounded-xl mb-4 overflow-hidden hover:border-gold/30 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-black-dark flex items-center justify-center flex-shrink-0">
            {post.author?.avatar_url ? (
              <img src={post.author.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-gold font-bold">{post.author?.full_name?.[0]?.toUpperCase()}</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">{post.author?.full_name}</span>
              {post.author?.verification_status === 'genius' && (
                <span className="bg-gold text-black text-xs font-bold px-2 py-0.5 rounded-full">GENIUS</span>
              )}
              {post.author?.verification_status === 'verified' && (
                <span className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full">VÉRIFIÉ</span>
              )}
            </div>
            <span className="text-gray-500 text-xs">{post.author?.domain} • {timeAgo}</span>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-gray-500 hover:text-gold p-1 rounded"
          >
            <MoreHorizontal size={16} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-6 bg-black-dark border border-gray-700 rounded-lg shadow-xl z-10 min-w-[160px]">
              <button onClick={handleSave} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300 hover:text-gold hover:bg-black">
                <Bookmark size={14} /> Sauvegarder
              </button>
              <button onClick={() => { navigator.clipboard.writeText(window.location.href + '/post/' + post.id); setShowMenu(false); }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300 hover:text-gold hover:bg-black">
                <Copy size={14} /> Copier le lien
              </button>
              <button onClick={() => handleReport('spam')}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-black">
                <Flag size={14} /> Signaler
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contenu */}
      <div className="px-4 pb-3">
        <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
          {renderContent(post.content)}
        </p>
        {post.image_url && (
          <img src={post.image_url} alt="" className="mt-3 w-full rounded-lg max-h-96 object-cover" />
        )}
      </div>

      {/* Barre de réactions */}
      <div className="px-4 pb-3 flex items-center justify-between border-t border-gray-800/50 pt-3">
        <div className="flex items-center gap-1 relative">
          {/* Popup réactions */}
          {showReactions && (
            <div className="absolute bottom-10 left-0 bg-black-dark border border-gray-700 rounded-full px-2 py-1 flex gap-1 z-20 shadow-xl">
              {REACTIONS.map(r => (
                <button
                  key={r.key}
                  onClick={() => handleReaction(r.key)}
                  className={`text-xl p-1 rounded-full hover:scale-125 transition-transform ${
                    myReaction === r.key ? 'bg-gold/20' : ''
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
            onMouseLeave={() => setTimeout(() => setShowReactions(false), 300)}
            onClick={() => handleReaction(myReaction || 'like')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors ${
              myReaction
                ? 'bg-gold text-black font-semibold'
                : 'bg-black-dark text-gray-400 hover:text-gold hover:bg-black-dark/80'
            }`}
          >
            {myReaction ? REACTIONS.find(r => r.key === myReaction)?.emoji : '👍'}
            <span>{Object.values(reactionCounts).reduce((a, b) => a + b, 0) || ''}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowComments(!showComments); if (!showComments) loadComments(); }}
            className="flex items-center gap-1 text-gray-500 hover:text-gold text-sm px-2 py-1 rounded-full hover:bg-black-dark"
          >
            <MessageCircle size={15} />
            <span>{post.comments_count || ''}</span>
          </button>
          <button className="flex items-center gap-1 text-gray-500 hover:text-gold text-sm px-2 py-1 rounded-full hover:bg-black-dark">
            <Share2 size={15} />
          </button>
          <button onClick={handleSave} className="text-gray-500 hover:text-gold px-2 py-1 rounded-full hover:bg-black-dark">
            {isSaved ? <BookmarkCheck size={15} className="text-gold" /> : <Bookmark size={15} />}
          </button>
        </div>
      </div>

      {/* Section commentaires */}
      {showComments && (
        <div className="border-t border-gray-800 px-4 py-3">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-black-dark flex items-center justify-center flex-shrink-0 text-xs text-gold font-bold">
                {c.author?.full_name?.[0]?.toUpperCase()}
              </div>
              <div className="bg-black-dark rounded-lg px-3 py-2 flex-1">
                <span className="text-white text-xs font-semibold">{c.author?.full_name} </span>
                <span className="text-gray-300 text-xs">{c.content}</span>
              </div>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input
              value={comment}
              onChange={e => setComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitComment()}
              placeholder="Écrire un commentaire..."
              className="flex-1 bg-black-dark border border-gray-700 rounded-full px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold"
            />
            <button
              onClick={submitComment}
              className="bg-gold text-black px-4 py-2 rounded-full text-sm font-semibold hover:bg-gold-light transition-colors"
            >
              Envoyer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

=================================================================
ÉTAPE 7 — CRÉATION DE POST AVANCÉE
=================================================================

--- src/components/social/CreatePostBox.tsx ---

interface CreatePostBoxProps {
  onPostCreated: () => void;
  groupId?: string; // Si dans un groupe
}

INTERFACE :
- Header : avatar + "Quoi de neuf, {prénom} ?"
- Textarea auto-expand (min 3 lignes, max 10)
- Hashtag suggérés en temps réel au frappe de #
- Compteur caractères (max 2000)
- Barre d'outils : Image | Hashtag | Type de post
- Preview image uploadée (avec bouton supprimer)
- Bouton "Publier" → disabled si vide

TYPES DE POST (selector discret) :
📝 Général | 💼 Opportunité partagée | 🏆 Réussite | 💡 Insight

LOGIQUE HASHTAGS :
- Détecte #motclé dans le texte
- Crée le hashtag si inexistant (upsert)
- Incrémente posts_count
- Lie post ↔ hashtag dans post_hashtags

CODE :

import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Image, Hash, ChevronDown, X } from 'lucide-react';

const POST_TYPES = [
  { value: 'general',           label: '📝 Général' },
  { value: 'opportunity_share', label: '💼 Opportunité' },
  { value: 'achievement',       label: '🏆 Réussite' },
  { value: 'insight',           label: '💡 Insight' },
];

export default function CreatePostBox({ onPostCreated, groupId }: CreatePostBoxProps) {
  const { user, profile } = useAuth();
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('general');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const extractHashtags = (text: string): string[] => {
    return (text.match(/#\w+/g) || []).map(tag => tag.slice(1).toLowerCase());
  };

  const publish = async () => {
    if (!user || !content.trim() || publishing) return;
    setPublishing(true);

    let imageUrl = null;
    if (imageFile) {
      const path = `posts/${user.id}/${Date.now()}-${imageFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, imageFile);
      if (!uploadError) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        imageUrl = data.publicUrl;
      }
    }

    const { data: postData, error } = await supabase
      .from(groupId ? 'group_posts' : 'posts')
      .insert({
        [groupId ? 'author_id' : 'author_id']: user.id,
        content: content.trim(),
        image_url: imageUrl,
        post_type: postType,
        ...(groupId ? { group_id: groupId } : {}),
        is_genius_post: profile?.verification_status === 'genius'
      })
      .select()
      .single();

    if (!error && postData) {
      // Gérer les hashtags
      const tags = extractHashtags(content);
      for (const tag of tags) {
        const { data: hashtagData } = await supabase
          .from('hashtags')
          .upsert({ tag, posts_count: 1 }, { onConflict: 'tag' })
          .select()
          .single();
        if (hashtagData && !groupId) {
          await supabase.from('post_hashtags').upsert({
            post_id: postData.id,
            hashtag_id: hashtagData.id
          });
        }
      }
    }

    setContent('');
    setImageFile(null);
    setImagePreview(null);
    setPublishing(false);
    onPostCreated();
  };

  return (
    <div className="bg-black-card border border-gray-800 rounded-xl mb-4 p-4">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-black-dark flex items-center justify-center flex-shrink-0">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-gold font-bold">{profile?.full_name?.[0]?.toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={`Partagez une opportunité, une réussite, une insight...`}
            rows={3}
            maxLength={2000}
            className="w-full bg-transparent text-white placeholder-gray-600 resize-none focus:outline-none text-sm leading-relaxed"
          />
          {imagePreview && (
            <div className="relative mt-2">
              <img src={imagePreview} alt="" className="w-full rounded-lg max-h-48 object-cover" />
              <button
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="absolute top-2 right-2 bg-black/70 rounded-full p-1"
              >
                <X size={14} className="text-white" />
              </button>
            </div>
          )}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800">
            <div className="flex gap-2">
              <button onClick={() => fileRef.current?.click()} className="text-gray-500 hover:text-gold p-1">
                <Image size={16} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
              <div className="relative">
                <button
                  onClick={() => setShowTypeMenu(!showTypeMenu)}
                  className="flex items-center gap-1 text-gray-500 hover:text-gold text-xs px-2 py-1 rounded-full border border-gray-700 hover:border-gold"
                >
                  {POST_TYPES.find(t => t.value === postType)?.label}
                  <ChevronDown size={10} />
                </button>
                {showTypeMenu && (
                  <div className="absolute top-8 left-0 bg-black-dark border border-gray-700 rounded-lg z-10 min-w-[160px]">
                    {POST_TYPES.map(t => (
                      <button
                        key={t.value}
                        onClick={() => { setPostType(t.value); setShowTypeMenu(false); }}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-black ${
                          postType === t.value ? 'text-gold' : 'text-gray-300'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-600">{content.length}/2000</span>
              <button
                onClick={publish}
                disabled={!content.trim() || publishing}
                className="bg-gold text-black px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-gold-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {publishing ? '...' : 'Publier'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

=================================================================
ÉTAPE 8 — TRENDING HASHTAGS
=================================================================

--- src/components/social/TrendingHashtags.tsx ---

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface TrendingHashtagsProps {
  activeHashtag: string | null;
  onSelect: (tag: string) => void;
}

export default function TrendingHashtags({ activeHashtag, onSelect }: TrendingHashtagsProps) {
  const [hashtags, setHashtags] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('hashtags')
      .select('*')
      .order('trend_score', { ascending: false })
      .limit(10)
      .then(({ data }) => setHashtags(data || []));
  }, []);

  if (!hashtags.length) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
      {hashtags.map(h => (
        <button
          key={h.id}
          onClick={() => onSelect(h.tag)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeHashtag === h.tag
              ? 'bg-gold text-black'
              : 'bg-black-card border border-gray-700 text-gray-400 hover:border-gold hover:text-gold'
          }`}
        >
          #{h.tag}
          <span className="ml-1 text-xs opacity-60">{h.posts_count}</span>
        </button>
      ))}
    </div>
  );
}

=================================================================
ÉTAPE 9 — GROUPES (PAGE COMPLÈTE)
=================================================================

--- src/pages/Groups.tsx ---

Onglets : "Mes groupes" | "Découvrir" | "Créer"

MES GROUPES :
- Groupes où l'utilisateur est membre
- Dernière activité + nb membres
- Badge "Admin" si role = admin
- Clic → ouvre GroupDetail

DÉCOUVRIR :
- Filtres : catégorie + visibilité
- Liste groupes publics
- Bouton "Rejoindre" → insert group_members
- Groupes vérifiés avec badge or

CRÉER UN GROUPE :
- Input nom + description + catégorie
- Upload cover image
- Toggle public/privé
- Bouton "Créer" → insert groups + insert group_members (creator = admin)

--- src/pages/GroupDetail.tsx ---

Header :
- Cover image (pleine largeur, dégradé noir en bas)
- Avatar du groupe par-dessus
- Nom + badge + nb membres + catégorie
- Bouton "Rejoindre" ou "Membre ✓" ou "Admin"
- Bouton "Gérer" si admin

Contenu :
- Onglets : "Feed" | "Membres" | "À propos"

Feed du groupe :
- CreatePostBox avec groupId
- Liste des group_posts avec PostCard adapté
- Posts épinglés en premier (is_pinned = true)

Membres :
- Liste membres avec badge GENIUS/VERIFIED
- Admin : bouton "Promouvoir modérateur" | "Retirer"

À propos :
- Description, règles, catégorie, date création

=================================================================
ÉTAPE 10 — ARTICLES LONGS (GENIUS/VERIFIED)
=================================================================

--- src/pages/Articles.tsx ---

Liste des articles publiés.
Filtre : Tous | Genius uniquement
Chaque article en card :
- Cover image
- Titre + sous-titre
- Auteur + badge + date
- Temps de lecture estimé
- Bouton "Lire"

--- src/pages/ArticleEditor.tsx ---

Accessible uniquement si verification_status = 'verified' ou 'genius'.

Éditeur TipTap avec :
- Barre d'outils : Gras | Italique | Titre H2/H3 | Liste | Image | Lien | Citation
- Placeholder : "Partagez votre expertise..."
- Champ titre + sous-titre
- Upload cover image
- Tags (max 5)
- Boutons : "Enregistrer brouillon" | "Publier"

Si non vérifié : affiche message
"La publication d'articles est réservée aux profils VERIFIED et GENIUS.
Complétez votre vérification pour débloquer cette feature."

--- src/pages/ArticleDetail.tsx ---

Affiche l'article complet.
Header : cover + titre + auteur + date
Corps : rendu HTML de TipTap
Footer : réactions + partage + commentaires
Incrémente reads_count au chargement

=================================================================
ÉTAPE 11 — ENDORSEMENTS VÉRIFIÉS
=================================================================

--- src/components/social/EndorsementSection.tsx ---

Affiché sur les profils publics.

AFFICHAGE :
- Section "Compétences endorsées"
- Badge "Verified by Searcher" en or pour les endorsements validés
- Skills groupés par nombre d'endorsements (tri décroissant)
- Ex : "React — 12 personnes dont 3 GENIUS"

AJOUTER UN ENDORSEMENT :
- Disponible si : connecté + visiteur vérifié + pas encore endorsé cette skill
- Input : skill (autocomplete depuis les skills populaires) + commentaire optionnel
- Submit → insert endorsements
- Notification à l'utilisateur endorsé

VÉRIFICATION PAR SEARCHER :
- Gemini vérifie la cohérence :
  Prompt : "L'utilisateur {nom} prétend avoir la compétence {skill}.
  Son profil indique : {bio} {portfolio_url} {github_url}.
  L'endorsement vient de {nom_endorseur} qui est {verification_status}.
  Est-ce crédible ? Oui/Non + raison courte."
- Si Gemini dit Oui → verified_by_searcher = true → badge or
- Si non → endorsement quand même enregistré, sans badge

=================================================================
ÉTAPE 12 — PROFIL PUBLIC AMÉLIORÉ
=================================================================

--- src/pages/PublicProfile.tsx ---

Route : /profil/:userId

HEADER :
- Cover photo (background gradient or si genius, argent si verified)
- Avatar centré + anneau or/argent
- Nom + badge GENIUS/VERIFIED en évidence
- Domaine + pays + langues
- Boutons : "Se connecter" | "Message" | "Endorser"
- Compteur : X connexions | X posts | X articles

CORPS (onglets) :

Onglet "À propos" :
- Bio
- Links (GitHub, Behance, LinkedIn, YouTube, etc.) avec icônes
- Disponibilité (cherche emploi / ouvert aux missions / pas disponible)

Onglet "Publications" :
- Posts de cet utilisateur (PostCard)
- Articles publiés

Onglet "Compétences" :
- EndorsementSection

Onglet "Réalisations" :
- Projets avec résultats mesurables
- Certifications validées (affichées depuis uploaded_documents)

=================================================================
ÉTAPE 13 — MESSAGERIE DIRECTE AMÉLIORÉE
=================================================================

Améliore les composants de messagerie existants (Couche 1).

NOUVELLES FEATURES :

Indicateur "En ligne" :
- Update users_profiles.updated_at au focus de l'app
- "En ligne" si updated_at < 5 minutes
- Point vert sur l'avatar

Réactions sur messages :
- Long press (mobile) ou hover (desktop) → picker emoji
- Affichage sous le message : 👍 2 🔥 1

Réponse à un message :
- Swipe sur un message → "Répondre à..."
- Message original en citation grisée au-dessus du nouveau

Transfert de fichier :
- Bouton clip → upload image via Supabase Storage
- Preview dans la conversation

Statut de lecture :
- ✓ envoyé | ✓✓ reçu | ✓✓ (or) lu

=================================================================
ÉTAPE 14 — NOTIFICATIONS ENRICHIES
=================================================================

Améliore src/pages/Notifications.tsx.

NOUVEAUX TYPES DE NOTIFICATIONS :

story_view : "{nom} a vu votre story"
endorsement : "{nom} vous a endorsé en {skill}"
connection_accepted : "{nom} a accepté votre connexion"
post_reaction : "{nom} a réagi 🔥 à votre post"
article_published : "{nom} (GENIUS) a publié un article : {titre}"
group_invite : "Vous avez été invité dans le groupe {nom}"
group_activity : "Nouveau post dans {groupe} : {aperçu}"
mention : "{nom} vous a mentionné dans un post"

REGROUPEMENT :
- "Aujourd'hui" | "Cette semaine" | "Plus ancien"
- Badge rouge sur l'icône cloche (count non lues)
- "Tout marquer comme lu" en haut

=================================================================
ÉTAPE 15 — SEARCH GLOBAL
=================================================================

--- src/pages/Search.tsx ---

Barre de recherche universelle.
Résultats en temps réel (debounce 300ms).

4 onglets de résultats :
PERSONNES : profils filtrés par nom/domaine/pays
POSTS : posts contenant le terme
GROUPES : groupes correspondants
ARTICLES : articles avec le mot-clé dans titre/contenu

Filtres pour Personnes :
Type (job seeker / freelance / business / investor)
Statut (Genius / Verified)
Pays
Disponible maintenant

Chaque résultat avec bouton d'action rapide :
- Personne → "Connecter"
- Groupe → "Rejoindre"
- Post → mini PostCard
- Article → "Lire"

CODE (partie requêtes Supabase) :

const searchAll = async (query: string) => {
  const [people, posts, groups, articles] = await Promise.all([
    supabase
      .from('users_profiles')
      .select('id, full_name, avatar_url, domain, country, verification_status, profile_type')
      .or(`full_name.ilike.%${query}%,domain.ilike.%${query}%,bio.ilike.%${query}%`)
      .limit(10),
    supabase
      .from('posts')
      .select('*, author:users_profiles!author_id(full_name, avatar_url, verification_status)')
      .ilike('content', `%${query}%`)
      .limit(10),
    supabase
      .from('groups')
      .select('*')
      .ilike('name', `%${query}%`)
      .eq('visibility', 'public')
      .limit(10),
    supabase
      .from('articles')
      .select('*, author:users_profiles!author_id(full_name, verification_status)')
      .or(`title.ilike.%${query}%,subtitle.ilike.%${query}%`)
      .eq('is_published', true)
      .limit(10),
  ]);
  return {
    people: people.data || [],
    posts: posts.data || [],
    groups: groups.data || [],
    articles: articles.data || [],
  };
};

=================================================================
ÉTAPE 16 — COMPOSANTS UTILITAIRES COUCHE 2
=================================================================

--- src/components/social/SuggestedGroups.tsx ---
Charge 3 groupes publics selon la catégorie du profil.
Cards compactes avec bouton "Rejoindre".

--- src/components/social/SuggestedConnections.tsx ---
Charge 3 profils VERIFIED/GENIUS du même domaine ou pays.
Mini cards avec bouton "Se connecter" → insert connections (status: pending).

--- src/components/social/ShareModal.tsx ---
Options : Copier le lien | Partager dans un groupe | Partager en story
"Partagé via Searcher Connector — searcherconnector.com"

--- src/components/social/ReactionPicker.tsx ---
Composant réutilisable pour les réactions (posts + messages).
Popup animée, 5 réactions, accessible clavier.

=================================================================
ÉTAPE 17 — MISE À JOUR DE LA NAVBAR / TABS
=================================================================

Ajoute les nouvelles routes dans la navigation :

MOBILE (bottom tab bar — 5 icônes) :
🏠 Accueil (Feed) | 🔍 Recherche | 👥 Groupes | 💬 Messages | 🔔 Notifications

DESKTOP (sidebar gauche) :
Section principale :
- 🏠 Feed
- 🔍 Recherche
- 👥 Groupes
- 📰 Articles
- 💬 Messages
- 🔔 Notifications
Section profil :
- Mon profil
- Mes posts sauvegardés
- Paramètres

Badge rouge sur Messages et Notifications si non lus.

=================================================================
ÉTAPE 18 — ROUTES REACT ROUTER (mise à jour)
=================================================================

Ajoute dans src/App.tsx :

<Route path="/feed" element={<Feed />} />
<Route path="/groupes" element={<Groups />} />
<Route path="/groupes/:groupId" element={<GroupDetail />} />
<Route path="/articles" element={<Articles />} />
<Route path="/articles/nouveau" element={<ArticleEditor />} />
<Route path="/articles/:articleId" element={<ArticleDetail />} />
<Route path="/profil/:userId" element={<PublicProfile />} />
<Route path="/recherche" element={<Search />} />
<Route path="/posts/:postId" element={<PostDetail />} />

=================================================================
ÉTAPE 19 — REALTIME SUPABASE (Couche 2)
=================================================================

Crée src/hooks/useRealtimeFeed.ts :

Subscriptions actives en permanence :
- Nouveaux posts → mise à jour du feed
- Nouvelles notifications → incrémente le badge
- Nouveaux messages → incrémente badge Messages
- Nouveaux membres dans groupes → update compteur
- Stories expirées → retirer automatiquement du feed

CODE :

import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useRealtimeFeed(onNewPost: () => void, onNewNotif: () => void) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const feedChannel = supabase
      .channel('realtime_feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, onNewPost)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, onNewNotif)
      .subscribe();

    return () => { supabase.removeChannel(feedChannel); };
  }, [user]);
}

=================================================================
ÉTAPE 20 — VÉRIFICATION FINALE COUCHE 2
=================================================================

Lance : npm run dev

Vérifie que TOUT fonctionne (en plus des checks couche 1) :

✅ Feed charge les posts avec infinite scroll
✅ Stories s'affichent avec anneau or/gris
✅ Créer une story fonctionne (texte + image)
✅ StoryViewer plein écran avec progression auto
✅ Trending hashtags cliquables filtrent le feed
✅ CreatePostBox publie avec hashtags détectés
✅ Réactions avancées (5 emojis) fonctionnent
✅ Toggle réaction → annule si même réaction
✅ Commentaires s'ouvrent et se soumettent
✅ Sauvegarder un post fonctionne
✅ Signaler un post insère dans reports
✅ Page Groupes charge les groupes publics
✅ Rejoindre un groupe insert group_members
✅ Créer un groupe fonctionne
✅ GroupDetail affiche le feed du groupe
✅ ArticleEditor accessible aux VERIFIED/GENIUS
✅ TipTap s'affiche et permet de formatter
✅ Publier un article → visible dans Articles
✅ Endorser une compétence fonctionne
✅ Gemini vérifie l'endorsement (badge or si validé)
✅ Profil public s'affiche avec onglets
✅ Bouton "Se connecter" crée une connexion pending
✅ Recherche globale retourne des résultats
✅ Notifications enrichies (nouveaux types)
✅ Point vert "en ligne" sur les profils
✅ Realtime : nouveau post → feed rafraîchi auto
✅ Badge rouge messages/notifs non lus
✅ Navigation mobile (bottom tabs) à jour
✅ Navigation desktop (sidebar) à jour
✅ Zéro fond blanc
✅ Zéro bouton cassé
✅ Build : npm run build passe sans erreurs

=================================================================
NOTES POUR OPENHANDS — COUCHE 2
=================================================================

1. Ne jamais supprimer les composants de la Couche 1.
   Tu construis PAR-DESSUS. Ajoute, améliore, extend.

2. Si un composant Couche 1 doit être modifié pour accepter
   de nouvelles props → utilise les optional props (?).

3. TipTap ne supporte pas SSR. Si erreur → lazy import.
   import { lazy } from 'react';
   const ArticleEditor = lazy(() => import('./ArticleEditor'));

4. Les stories sont supprimées côté client uniquement
   (filter expires_at > now()). Un cron Supabase peut les
   supprimer en base, mais ce n'est pas bloquant pour le MVP.

5. Le scroll horizontal (stories, hashtags) :
   Ajoute dans index.css :
   .scrollbar-hide::-webkit-scrollbar { display: none; }
   .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

6. Pour le realtime Supabase, activer dans le dashboard :
   Settings → Realtime → Activer pour les tables :
   posts, notifications, messages, group_posts

7. Gemini pour les endorsements : utiliser le modèle
   gemini-1.5-flash (gratuit, rapide).
   Prompt court, réponse JSON : { "valid": true/false, "reason": "..." }

8. Sur mobile, StoryViewer doit utiliser react-swipeable
   pour le swipe gauche/droite entre stories.

9. Les articles TipTap sont stockés en HTML dans la colonne
   content (text). Rendu avec dangerouslySetInnerHTML +
   classe prose de Tailwind Typography si disponible.

10. Badge rouge notifications : stocker le count dans
    localStorage comme cache rapide. Remettre à 0 à l'ouverture
    de la page Notifications.

=================================================================
FIN DU PROMPT COUCHE 2
=================================================================
La Couche 2 est maintenant un réseau social complet et avancé.
La base de données supporte stories, groupes, articles, endorsements,
réactions avancées, signalements, et hashtags trending.

Couche 3 = Agent 24/7 automatisé (email, WhatsApp, scheduler, cron jobs)
Couche 4 = VC tracking Orange Merchant + préparation entretien
Couche 5 = Stripe paiements + webhooks + plans
Couche 6 = Analytics + dashboard croissance
Couche 7 = App native React Native + Extension Chrome
Couche 8 = Modèle IA propriétaire + brevets
=================================================================
