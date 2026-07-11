'use client'

import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Card from '../components/ui/Card';
import GoldButton from '../components/ui/GoldButton';
import { Search, Plus, BookOpen, Clock, Heart, Eye, Share2, ArrowLeft, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Article } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import ArticleEditor from '../components/articles/ArticleEditor';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Articles() {
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [content, setContent] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*, author:users_profiles!author_id(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingCover(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `article-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('DOCUMENTS')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('DOCUMENTS')
        .getPublicUrl(filePath);

      setCoverUrl(publicUrl);
    } catch (err) {
      console.error('Error uploading cover:', err);
      alert("Erreur lors de l'upload de l'image");
    } finally {
      setUploadingCover(false);
    }
  };

  const handlePublish = async () => {
    if (!user || !title.trim() || !content.trim()) return;

    try {
      const { error } = await supabase.from('articles').insert({
        author_id: user.id,
        title,
        subtitle,
        content,
        cover_url: coverUrl,
        is_published: true,
        published_at: new Date().toISOString()
      });

      if (error) throw error;
      
      setIsCreating(false);
      setTitle('');
      setSubtitle('');
      setContent('');
      setCoverUrl('');
      fetchArticles();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la publication");
    }
  };

  if (isCreating) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex">
        <Sidebar />
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <header className="h-16 border-b border-[#1A1A1A] flex items-center justify-between px-6 bg-[#0A0A0A]/50 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsCreating(false)} className="text-gray-500 hover:text-white">
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-lg font-bold text-white tracking-tight">Rédiger un article</h2>
            </div>
            <div className="flex items-center gap-3">
              <button className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-4 py-2 hover:text-white transition-all">
                Brouillon
              </button>
              <GoldButton onClick={handlePublish} className="h-9 px-6 text-[10px]">
                Publier
              </GoldButton>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6 lg:p-10 max-w-4xl mx-auto w-full space-y-8">
            <input 
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Titre de l'article"
              className="w-full bg-transparent text-4xl lg:text-5xl font-black text-white placeholder-gray-800 focus:outline-none border-none p-0 tracking-tighter"
            />
            <input 
              value={subtitle}
              onChange={e => setSubtitle(e.target.value)}
              placeholder="Sous-titre ou description courte..."
              className="w-full bg-transparent text-xl font-medium text-gray-500 placeholder-gray-800 focus:outline-none border-none p-0 tracking-tight"
            />
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="relative group cursor-pointer h-64 rounded-2xl overflow-hidden bg-[#0D0D0D] border border-[#1A1A1A] flex items-center justify-center hover:border-[#D4AF37]/50 transition-all"
            >
              {coverUrl ? (
                <>
                  <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-white">
                      <ImageIcon size={32} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Changer la couverture</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-700 group-hover:text-[#D4AF37] transition-colors">
                  {uploadingCover ? (
                    <Loader2 size={40} className="animate-spin" />
                  ) : (
                    <Plus size={40} />
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    {uploadingCover ? 'Upload en cours...' : 'Ajouter une couverture'}
                  </span>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleCoverUpload}
              />
            </div>

            <ArticleEditor content={content} onChange={setContent} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <header className="h-16 border-b border-[#1A1A1A] flex items-center justify-between px-6 bg-[#0A0A0A]/50 backdrop-blur-md sticky top-0 z-30">
          <h2 className="text-lg font-bold text-white tracking-tight">Articles & Savoir</h2>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input 
                placeholder="Rechercher des articles..."
                className="bg-[#111111] border border-[#2a2a2a] rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37] transition-all w-64"
              />
            </div>
            <GoldButton onClick={() => setIsCreating(true)} className="h-9 px-4 text-[10px]">
              <Plus size={16} className="mr-2" /> Écrire
            </GoldButton>
          </div>
        </header>

        <div className="p-6 lg:p-10 max-w-7xl mx-auto w-full">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-96 rounded-3xl bg-[#0D0D0D] border border-[#1A1A1A] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles.map((article) => (
                <Card key={article.id} className="group overflow-hidden flex flex-col hover:border-[#D4AF37]/30 transition-all duration-500">
                  <div className="h-48 overflow-hidden relative">
                    <img 
                      src={article.cover_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop'} 
                      alt="" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute top-4 left-4">
                      <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                        <BookOpen size={12} className="text-[#D4AF37]" />
                        <span className="text-[8px] font-bold text-white uppercase tracking-widest">Article</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-[#1A1A1A] border border-[#2a2a2a]">
                        {article.author?.avatar_url && <img src={article.author.avatar_url} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        Par {article.author?.full_name}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2 leading-tight group-hover:text-[#D4AF37] transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-6 font-medium">
                      {article.subtitle}
                    </p>

                    <div className="mt-auto pt-6 border-t border-[#1A1A1A] flex items-center justify-between text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5"><Eye size={12} /> {article.reads_count}</span>
                        <span className="flex items-center gap-1.5"><Heart size={12} /> {article.likes_count}</span>
                      </div>
                      <span>{formatDistanceToNow(new Date(article.created_at), { addSuffix: true, locale: fr })}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {!loading && articles.length === 0 && (
            <div className="text-center py-20">
              <BookOpen size={48} className="text-gray-800 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Aucun article pour le moment</h3>
              <p className="text-sm text-gray-500 max-w-xs mx-auto mb-8">Soyez le premier à partager votre expertise avec la communauté.</p>
              <GoldButton onClick={() => setIsCreating(true)}>Rédiger un article</GoldButton>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
