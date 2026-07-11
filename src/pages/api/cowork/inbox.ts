// =================================================================
// SEARCHER CONNECTOR — COWORK / INBOX
// Inbox unifiée : tous les messages classés par opportunité
// Sources : email_threads + whatsapp_messages
// =================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'userId requis' });

  try {
    // Charger emails + whatsapp en parallèle
    const [emailsRes, waRes, oppsRes] = await Promise.all([
      supabaseAdmin.from('email_threads').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      supabaseAdmin.from('whatsapp_messages').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      supabaseAdmin.from('opportunities').select('id,title,company,score,status,source_platform').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
    ]);

    const emails  = emailsRes.data  || [];
    const waMsgs  = waRes.data      || [];
    const opps    = oppsRes.data    || [];

    // Construire un index des opportunités
    const oppMap: Record<string, any> = {};
    opps.forEach(o => { oppMap[o.id] = o; });

    // Unifier et classer par opportunité
    const unified: any[] = [];

    emails.forEach(e => {
      unified.push({
        id:             e.id,
        type:           'email',
        direction:      e.direction,
        from:           e.from_name || e.from_email || '',
        company:        e.company || '',
        subject:        e.subject || '',
        preview:        e.body_preview || '',
        sentiment:      e.sentiment || 'unknown',
        searcher_replied: e.searcher_replied,
        requires_human: e.requires_human,
        opportunity_id: e.opportunity_id || null,
        opportunity:    e.opportunity_id ? oppMap[e.opportunity_id] : null,
        created_at:     e.created_at,
        status:         deriveStatus(e),
      });
    });

    waMsgs.forEach(w => {
      unified.push({
        id:             w.id,
        type:           'whatsapp',
        direction:      w.direction,
        from:           w.from_name || w.from_number || '',
        company:        '',
        subject:        'WhatsApp',
        preview:        w.body || '',
        sentiment:      'unknown',
        searcher_replied: w.searcher_replied,
        requires_human: w.requires_human,
        opportunity_id: w.opportunity_id || null,
        opportunity:    w.opportunity_id ? oppMap[w.opportunity_id] : null,
        created_at:     w.created_at,
        status:         w.searcher_replied ? 'replied' : 'waiting',
      });
    });

    // Trier par date (plus récent en premier)
    unified.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Grouper par opportunité
    const byOpportunity: Record<string, any[]> = {};
    const noOpportunity: any[] = [];
    unified.forEach(m => {
      if (m.opportunity_id) {
        if (!byOpportunity[m.opportunity_id]) byOpportunity[m.opportunity_id] = [];
        byOpportunity[m.opportunity_id].push(m);
      } else {
        noOpportunity.push(m);
      }
    });

    // Compter les non-lus
    const unreplied = unified.filter(m => m.direction === 'incoming' && !m.searcher_replied).length;

    return res.status(200).json({
      success:         true,
      total_messages:  unified.length,
      unreplied_count: unreplied,
      by_opportunity:  byOpportunity,
      no_opportunity:  noOpportunity,
      all_messages:    unified,
    });

  } catch (error: any) {
    return res.status(500).json({ error: 'Erreur inbox', detail: error.message });
  }
}

function deriveStatus(email: any): string {
  if (email.direction === 'outgoing') return 'sent';
  if (email.searcher_replied) return 'replied';
  if (email.sentiment === 'positive') return 'positive_response';
  if (email.sentiment === 'negative') return 'rejected';
  return 'waiting_reply';
}
