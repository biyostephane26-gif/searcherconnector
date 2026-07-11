'use client'

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import { 
  Calendar, ChevronRight, Briefcase,
  Plus, Clock, Sparkles, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function InterviewPreps() {
  const { user } = useAuth();
  const router = useRouter();
  const [preps, setPreps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchPreps();
  }, [user]);

  const fetchPreps = async () => {
    try {
      const { data } = await supabase
        .from('interview_preps')
        .select('*, opportunity:opportunity_id(*)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      if (data) setPreps(data);
    } catch (error) {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleNewPrep = async () => {
    // Redirige vers l'agent pour demander à SCAI de générer une prépa
    router.push('/agent?prompt=Génère+une+préparation+entretien')
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <div className="p-6 max-w-7xl mx-auto w-full space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Préparations d'Entretiens</h1>
              <p className="text-gray-500 uppercase text-xs font-bold tracking-widest">Générées par SCAI</p>
            </div>
            <button
              onClick={handleNewPrep}
              disabled={generating}
              className="flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-black rounded-xl font-bold hover:bg-[#B8962D] transition-all disabled:opacity-50">
              {generating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Nouvelle Prépa
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {preps.length === 0 ? (
              <div className="col-span-full bg-[#111111] p-12 rounded-3xl border border-[#222222] text-center">
                <Sparkles className="mx-auto text-[#D4AF37] mb-4 opacity-20" size={60} />
                <p className="text-gray-500 font-medium mb-4">SCAI génère automatiquement des préparations quand un entretien est détecté dans tes emails.</p>
                <button onClick={handleNewPrep} className="text-[#D4AF37] text-sm hover:underline">
                  Ou demande-le manuellement à SCAI →
                </button>
              </div>
            ) : preps.map((prep) => (
              <Link key={prep.id} href={`/interview-preps/${prep.id}`}
                className="bg-[#111111] rounded-3xl border border-[#222222] p-6 hover:border-[#D4AF37]/50 transition-all group">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 bg-[#1A1A1A] rounded-2xl flex items-center justify-center border border-[#222222] group-hover:border-[#D4AF37]/20">
                    <Briefcase size={28} className="text-[#D4AF37]" />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="px-3 py-1 bg-[#D4AF37]/10 text-[#D4AF37] rounded-full text-[10px] font-bold uppercase tracking-wider mb-2">
                      {prep.interview_type || 'Général'}
                    </span>
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Clock size={12} />
                      <span className="text-[10px] font-bold">
                        {prep.interview_date ? format(new Date(prep.interview_date), 'dd MMM', { locale: fr }) : 'Date à fixer'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-1 mb-6">
                  <h3 className="text-lg font-bold text-white truncate">{prep.opportunity?.company || 'Entreprise'}</h3>
                  <p className="text-sm text-gray-400 truncate">{prep.opportunity?.title || 'Poste'}</p>
                </div>
                <div className="flex items-center justify-between pt-6 border-t border-[#222222]">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Sparkles size={14} className="text-[#D4AF37]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Analyse Complète</span>
                  </div>
                  <ChevronRight size={18} className="text-gray-700 group-hover:text-[#D4AF37] transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}



