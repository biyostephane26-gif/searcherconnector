'use client'

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, 
  Search, 
  HelpCircle, 
  MessageSquare, 
  Target, 
  AlertCircle, 
  DollarSign,
  Briefcase,
  Building2,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function InterviewPrepDetail() {
  const params = useParams();
  const idParam = params?.['id'];
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const router = useRouter();
  const [prep, setPrep] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchPrep();
  }, [id]);

  const fetchPrep = async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('interview_preps')
        .select(`
          *,
          opportunity:opportunity_id(*)
        `)
        .eq('id', id)
        .single();

      if (data) setPrep(data);
    } catch (error) {
      console.error('Error fetching prep detail:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D4AF37]"></div>
    </div>
  );

  if (!prep) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-bold uppercase text-xs tracking-widest">Retour</span>
      </button>

      {/* Header Card */}
      <div className="bg-[#111111] p-8 rounded-3xl border border-[#222222] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Target size={120} />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center border border-[#D4AF37]/20">
              <Building2 size={40} className="text-[#D4AF37]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{prep.opportunity?.company}</h1>
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5 text-gray-400 text-sm font-medium">
                  <Briefcase size={16} className="text-[#D4AF37]" />
                  {prep.opportunity?.title}
                </span>
                <span className="text-gray-700">|</span>
                <span className="flex items-center gap-1.5 text-gray-400 text-sm font-medium">
                  <Calendar size={16} className="text-[#D4AF37]" />
                  {prep.interview_date ? format(new Date(prep.interview_date), 'eeee dd MMMM', { locale: fr }) : 'Date à fixer'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Company Research */}
          <section className="bg-[#111111] rounded-3xl border border-[#222222] p-8">
            <div className="flex items-center gap-3 mb-6">
              <Search className="text-[#D4AF37]" size={20} />
              <h2 className="text-lg font-bold text-white">Recherche Entreprise</h2>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">
              {prep.company_research}
            </p>
          </section>

          {/* Likely Questions */}
          <section className="bg-[#111111] rounded-3xl border border-[#222222] p-8">
            <div className="flex items-center gap-3 mb-6">
              <HelpCircle className="text-[#D4AF37]" size={20} />
              <h2 className="text-lg font-bold text-white">Questions Probables & Réponses</h2>
            </div>
            <div className="space-y-6">
              {prep.likely_questions?.map((q: string, i: number) => (
                <div key={i} className="space-y-3 p-4 bg-[#161616] rounded-2xl border border-[#222222]">
                  <p className="text-white font-bold text-sm">Q: {q}</p>
                  <p className="text-gray-400 text-sm leading-relaxed italic">
                    💡 {prep.suggested_answers?.[i]}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Talking Points */}
          <section className="bg-[#111111] rounded-3xl border border-[#222222] p-8">
            <div className="flex items-center gap-3 mb-6">
              <MessageSquare className="text-[#D4AF37]" size={20} />
              <h2 className="text-lg font-bold text-white">Points à Aborder</h2>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">
              {prep.talking_points}
            </p>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Salary Strategy */}
          <section className="bg-[#111111] rounded-3xl border border-[#222222] p-6 border-l-4 border-l-green-500/50">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="text-green-500" size={20} />
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">Négociation</h2>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">
              {prep.salary_strategy}
            </p>
          </section>

          {/* Red Flags */}
          <section className="bg-[#111111] rounded-3xl border border-[#222222] p-6 border-l-4 border-l-red-500/50">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-red-500" size={20} />
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">Points de Vigilance</h2>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">
              {prep.red_flags}
            </p>
          </section>

          <div className="p-8 bg-[#D4AF37] rounded-3xl text-black">
            <h3 className="text-lg font-bold mb-2">Besoin d'aide ?</h3>
            <p className="text-sm font-medium opacity-80 mb-6">
              Entraîne-toi avec SCAI en simulation d'entretien. Il joue le recruteur et donne son feedback.
            </p>
            <a href="/agent?prompt=Lance+une+simulation+d+entretien"
              className="block w-full py-4 bg-black text-white rounded-2xl font-bold hover:bg-black/80 transition-all text-center">
              Démarrer le Coaching avec SCAI
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
