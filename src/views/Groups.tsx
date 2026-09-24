'use client'

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import Card from '../components/ui/Card';
import GoldButton from '../components/ui/GoldButton';
import { Users, Search, Plus, Globe, Lock, ShieldCheck, ChevronRight } from 'lucide-react';
import { Group } from '../types';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function Groups() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'my' | 'discover' | 'create'>('discover');
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<string>('all');

  // Formulaire création
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    category: 'tech',
    visibility: 'public' as 'public' | 'private'
  });

  useEffect(() => {
    fetchGroups();
  }, [activeTab]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      let query = supabase.from('groups').select('*');
      
      if (activeTab === 'my') {
        const { data: myGroupIds } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user?.id);
        
        if (myGroupIds) {
          query = query.in('id', myGroupIds.map(g => g.group_id));
        } else {
          setGroups([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setGroups(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('groups')
        .insert({
          ...newGroup,
          created_by: user.id,
          members_count: 1
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        await supabase.from('group_members').insert({
          group_id: data.id,
          user_id: user.id,
          role: 'admin'
        });
        alert(t('groupsPage.createdSuccess'));
        setActiveTab('my');
      }
    } catch (err) {
      console.error(err);
      alert(t('groupsPage.createError'));
    } finally {
      setLoading(false);
    }
  };

  const joinGroup = async (groupId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('group_members').insert({
        group_id: groupId,
        user_id: user.id,
        role: 'member'
      });
      if (error) throw error;
      alert(t('groupsPage.joinedSuccess'));
      fetchGroups();
    } catch (err) {
      console.error(err);
      alert(t('groupsPage.joinError'));
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <header className="h-16 border-b border-[#1A1A1A] flex items-center justify-between px-6 bg-[#0A0A0A]/50 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-white tracking-tight">{t('groupsPage.title')}</h2>
            <div className="h-4 w-px bg-gray-800 mx-2" />
            <div className="flex gap-1">
              {[
                { id: 'discover', label: t('groupsPage.discover'), icon: Search },
                { id: 'my', label: t('groupsPage.myGroups'), icon: Users },
                { id: 'create', label: t('groupsPage.create'), icon: Plus },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all
                    ${activeTab === tab.id 
                      ? 'bg-[#D4AF37] text-[#0A0A0A]' 
                      : 'text-gray-500 hover:text-white hover:bg-[#111111]'
                    }
                  `}
                >
                  <tab.icon size={12} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="p-6 lg:p-10 max-w-7xl mx-auto w-full">
          {activeTab === 'create' ? (
            <Card className="max-w-2xl mx-auto p-8 border-[#1A1A1A]">
              <h3 className="text-xl font-bold text-white mb-8 tracking-tight">{t('groupsPage.createTitle')}</h3>
              <form onSubmit={handleCreateGroup} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('groupsPage.groupName')}</label>
                  <input
                    required
                    value={newGroup.name}
                    onChange={e => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37] transition-all"
                    placeholder={t('groupsPage.groupNamePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('groupsPage.description')}</label>
                  <textarea
                    rows={4}
                    value={newGroup.description}
                    onChange={e => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37] transition-all resize-none"
                    placeholder={t('groupsPage.descriptionPlaceholder')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('groupsPage.category')}</label>
                    <select
                      value={newGroup.category}
                      onChange={e => setNewGroup(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37] transition-all"
                    >
                      <option value="tech">{t('groupsPage.catTech')}</option>
                      <option value="marketing">{t('groupsPage.catMarketing')}</option>
                      <option value="finance">{t('groupsPage.catFinance')}</option>
                      <option value="freelance">{t('groupsPage.catFreelance')}</option>
                      <option value="investissement">{t('groupsPage.catInvestment')}</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('groupsPage.visibility')}</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNewGroup(prev => ({ ...prev, visibility: 'public' }))}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${newGroup.visibility === 'public' ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-[#2a2a2a] text-gray-500'}`}
                      >
                        <Globe size={14} /> <span className="text-[10px] font-bold uppercase">{t('groupsPage.public')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewGroup(prev => ({ ...prev, visibility: 'private' }))}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${newGroup.visibility === 'private' ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-[#2a2a2a] text-gray-500'}`}
                      >
                        <Lock size={14} /> <span className="text-[10px] font-bold uppercase">{t('groupsPage.private')}</span>
                      </button>
                    </div>
                  </div>
                </div>
                <GoldButton type="submit" loading={loading} className="w-full py-4 mt-4">
                  {t('groupsPage.createGroupBtn')}
                </GoldButton>
              </form>
            </Card>
          ) : (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative max-w-md flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-[#111111] border border-[#2a2a2a] rounded-full pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37] transition-all"
                    placeholder={t('groupsPage.searchPlaceholder')}
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {[
                    { id: 'all', label: t('groupsPage.catAll') },
                    { id: 'tech', label: t('groupsPage.catTech') },
                    { id: 'marketing', label: t('groupsPage.catMarketing') },
                    { id: 'finance', label: t('groupsPage.catFinance') },
                    { id: 'freelance', label: t('groupsPage.catFreelance') },
                    { id: 'investissement', label: t('groupsPage.catInvestment') },
                  ].map(c => (
                    <button
                      key={c.id}
                      onClick={() => setCategory(c.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors ${
                        category === c.id ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-[#111111] text-gray-400 border-[#2a2a2a] hover:text-white'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map(i => <div key={i} className="h-64 bg-[#111111] rounded-2xl animate-pulse" />)}
                </div>
              ) : groups.filter(g => (category === 'all' || g.category === category) && g.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                <div className="text-center py-20 border border-dashed border-[#1A1A1A] rounded-2xl">
                  <Users size={40} className="mx-auto text-gray-700 mb-4" />
                  <p className="text-gray-400 font-semibold text-sm mb-1">{t('groupsPage.noResults')}</p>
                  <p className="text-gray-600 text-xs mb-5">{t('groupsPage.noResultsDesc')}</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="inline-flex items-center gap-2 bg-[#D4AF37] text-black font-bold text-xs px-4 py-2.5 rounded-full hover:bg-[#e0bd4f] transition-colors"
                  >
                    <Plus size={14} /> {t('groupsPage.createGroupCta')}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groups.filter(g => (category === 'all' || g.category === category) && g.name.toLowerCase().includes(searchQuery.toLowerCase())).map((group) => (
                    <Card 
                      key={group.id} 
                      onClick={() => router.push(`/groups/${group.id}`)}
                      className="group overflow-hidden border-[#1A1A1A] hover:border-[#D4AF37]/30 transition-all duration-500 cursor-pointer"
                    >
                      <div className="h-24 bg-gradient-to-r from-[#1A1A1A] to-black relative">
                        {group.cover_url && <img src={group.cover_url} alt="" className="w-full h-full object-cover opacity-50" />}
                        <div className="absolute -bottom-6 left-6">
                          <div className="w-12 h-12 rounded-xl bg-[#111111] border-2 border-[#0A0A0A] flex items-center justify-center text-[#D4AF37] font-bold shadow-2xl">
                            {group.avatar_url ? <img src={group.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" /> : group.name[0].toUpperCase()}
                          </div>
                        </div>
                      </div>
                      <div className="p-6 pt-10">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-bold text-white group-hover:text-[#D4AF37] transition-colors">{group.name}</h4>
                          {group.is_verified && <ShieldCheck size={14} className="text-[#D4AF37]" />}
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-6 h-8">{group.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{group.members_count} {t('groupsPage.members')}</span>
                            <span className="text-[10px] font-bold text-[#D4AF37]/50 uppercase tracking-tighter">{group.category}</span>
                          </div>
                          {activeTab === 'discover' ? (
                            <button 
                              onClick={() => joinGroup(group.id)}
                              className="px-4 py-1.5 rounded-lg border border-[#2a2a2a] text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all"
                            >
                              {t('groupsPage.join')}
                            </button>
                          ) : (
                            <ChevronRight size={16} className="text-gray-800 group-hover:text-[#D4AF37] transition-all" />
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
