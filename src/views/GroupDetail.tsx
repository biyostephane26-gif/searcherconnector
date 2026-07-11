'use client'

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import Card from '../components/ui/Card';
import PostCard from '../components/social/PostCard';
import CreatePostBox from '../components/social/CreatePostBox';
import { Users, ShieldCheck, ChevronLeft, Settings, Info, MessageSquare } from 'lucide-react';
import { Group, GroupPost } from '../types';

export default function GroupDetail() {
  const params = useParams();
  const idParam = params?.['id'];
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const router = useRouter();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    category: '',
    visibility: 'public' as 'public' | 'private'
  });

  useEffect(() => {
    if (group) {
      setEditForm({
        name: group.name,
        description: group.description || '',
        category: group.category,
        visibility: group.visibility
      });
    }
  }, [group]);

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      const { error } = await supabase
        .from('groups')
        .update(editForm)
        .eq('id', id);
      
      if (error) throw error;
      setIsEditing(false);
      fetchGroupData();
      alert("Groupe mis à jour !");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la mise à jour");
    }
  };

  useEffect(() => {
    if (id) {
      fetchGroupData();

      // Realtime subscription pour les nouveaux posts du groupe
      const channel = supabase
        .channel(`group_posts_${id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'group_posts',
          filter: `group_id=eq.${id}`
        }, () => {
          fetchGroupData();
        })
        .subscribe();
      
      return () => { supabase.removeChannel(channel); };
    }
  }, [id, user]);

  const fetchGroupData = async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch Group Details
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', id)
        .single();
      
      if (groupError) throw groupError;
      setGroup(groupData);

      // 2. Check Membership
      if (user) {
        const { data: memberData } = await supabase
          .from('group_members')
          .select('role')
          .eq('group_id', id)
          .eq('user_id', user.id)
          .single();
        
        setIsMember(!!memberData);
        setMemberRole(memberData?.role || null);
      }

      // 3. Fetch Posts
      const { data: postsData } = await supabase
        .from('group_posts')
        .select(`
          *,
          author:users_profiles!author_id(
            id, full_name, avatar_url, verification_status, domain
          )
        `)
        .eq('group_id', id)
        .order('created_at', { ascending: false });
      
      setPosts(postsData || []);
    } catch (err) {
      console.error(err);
      router.push('/groups');
    } finally {
      setLoading(false);
    }
  };

  const joinGroup = async () => {
    if (!user || !id) return;
    try {
      const { error } = await supabase.from('group_members').insert({
        group_id: id,
        user_id: user.id,
        role: 'member'
      });
      if (error) throw error;
      fetchGroupData();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'adhésion au groupe");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!group) return null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Cover Header */}
        <div className="h-64 bg-gradient-to-b from-[#1A1A1A] to-black relative">
          {group.cover_url && <img src={group.cover_url} alt="" className="w-full h-full object-cover opacity-50" />}
          <button 
            onClick={() => router.push('/groups')}
            className="absolute top-6 left-6 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black transition-all"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        <div className="px-6 lg:px-10 max-w-7xl mx-auto w-full -mt-16 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Info Column */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="p-6 border-[#1A1A1A] bg-[#0A0A0A]/80 backdrop-blur-xl">
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-24 h-24 rounded-3xl bg-[#111111] border-2 border-[#1A1A1A] flex items-center justify-center text-[#D4AF37] text-3xl font-bold mb-6 shadow-2xl overflow-hidden">
                    {group.avatar_url ? <img src={group.avatar_url} alt="" className="w-full h-full object-cover" /> : group.name[0].toUpperCase()}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-xl font-bold text-white">{group.name}</h1>
                    {group.is_verified && <ShieldCheck size={18} className="text-[#D4AF37]" />}
                  </div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
                    {group.members_count} Membres • {group.category}
                  </div>
                </div>

                <p className="text-sm text-gray-400 leading-relaxed mb-8">{group.description}</p>

                {isMember ? (
                  <div className="flex flex-col gap-2">
                    <div className="w-full py-3 bg-[#111111] border border-[#2a2a2a] rounded-xl text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest text-center">
                      Vous êtes {memberRole}
                    </div>
                    {memberRole === 'admin' && (
                      <button 
                        onClick={() => setIsEditing(!isEditing)}
                        className="flex items-center justify-center gap-2 w-full py-3 text-gray-500 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest"
                      >
                        <Settings size={14} /> {isEditing ? "Fermer les paramètres" : "Paramètres du groupe"}
                      </button>
                    )}
                  </div>
                ) : (
                  <button 
                    onClick={joinGroup}
                    className="w-full py-4 bg-[#D4AF37] text-[#0A0A0A] rounded-xl font-bold uppercase tracking-widest hover:bg-[#F5E6A3] transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                  >
                    Rejoindre la communauté
                  </button>
                )}
              </Card>

              <Card className="p-6 border-[#1A1A1A]">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Info size={12} /> À propos
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Créé le</span>
                    <span className="text-gray-400">{new Date(group.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Visibilité</span>
                    <span className="text-gray-400 capitalize">{group.visibility}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Publications</span>
                    <span className="text-gray-400">{group.posts_count}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Main Posts Feed Column */}
            <div className="lg:col-span-8 space-y-6">
              {isEditing ? (
                <Card className="p-8 border-[#1A1A1A]">
                  <h3 className="text-xl font-bold text-white mb-8 tracking-tight">Paramètres du groupe</h3>
                  <form onSubmit={handleUpdateGroup} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nom du groupe</label>
                      <input
                        required
                        value={editForm.name}
                        onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37] transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Description</label>
                      <textarea
                        rows={4}
                        value={editForm.description}
                        onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37] transition-all resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Catégorie</label>
                        <select
                          value={editForm.category}
                          onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37] transition-all"
                        >
                          <option value="tech">Technologie</option>
                          <option value="marketing">Marketing</option>
                          <option value="finance">Finance</option>
                          <option value="freelance">Freelance</option>
                          <option value="investissement">Investissement</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Visibilité</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditForm(prev => ({ ...prev, visibility: 'public' }))}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${editForm.visibility === 'public' ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-[#2a2a2a] text-gray-500'}`}
                          >
                            <span className="text-[10px] font-bold uppercase">Public</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditForm(prev => ({ ...prev, visibility: 'private' }))}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${editForm.visibility === 'private' ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-[#2a2a2a] text-gray-500'}`}
                          >
                            <span className="text-[10px] font-bold uppercase">Privé</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="flex-1 py-4 border border-[#2a2a2a] text-gray-500 rounded-xl font-bold uppercase tracking-widest hover:bg-[#111111] transition-all"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="flex-2 py-4 bg-[#D4AF37] text-[#0A0A0A] rounded-xl font-bold uppercase tracking-widest hover:bg-[#F5E6A3] transition-all"
                      >
                        Sauvegarder
                      </button>
                    </div>
                  </form>
                </Card>
              ) : isMember ? (
                <>
                  <CreatePostBox groupId={group.id} onPostCreated={fetchGroupData} />
                  <div className="space-y-6">
                    {posts.length === 0 ? (
                      <div className="text-center py-20 bg-[#111111]/30 rounded-3xl border border-dashed border-[#1A1A1A]">
                        <MessageSquare size={48} className="mx-auto text-gray-800 mb-4" />
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Aucune publication pour le moment</p>
                      </div>
                    ) : (
                      posts.map(post => (
                        <PostCard key={post.id} post={post} onUpdate={fetchGroupData} />
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-40 bg-[#111111]/30 rounded-3xl border border-dashed border-[#1A1A1A] backdrop-blur-sm">
                  <ShieldCheck size={64} className="mx-auto text-[#D4AF37]/20 mb-6" />
                  <h3 className="text-lg font-bold text-white mb-2">Contenu réservé aux membres</h3>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto mb-8">Rejoignez cette communauté pour voir les publications et interagir avec les autres membres.</p>
                  <button 
                    onClick={joinGroup}
                    className="px-8 py-3 bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] rounded-xl font-bold uppercase tracking-widest hover:bg-[#D4AF37]/20 transition-all"
                  >
                    Rejoindre maintenant
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
