// =================================================================
// OPPORTUNITY CREATOR — pipeline persistant des leads
// GET  : liste tous les leads déjà trouvés pour l'utilisateur (l'actif
//        qui grandit dans le temps — voir opportunity-creator.ts)
// PATCH: change le statut d'un lead (new → contacted → replied → won/dead),
//        géré par l'utilisateur comme un mini-CRM.
// =================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId requis' });
    const { data, error } = await supabaseAdmin
      .from('opportunity_leads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ leads: data || [] });
  }

  if (req.method === 'PATCH') {
    const { leadId, status } = req.body;
    if (!leadId || !status) return res.status(400).json({ error: 'leadId et status requis' });
    if (!['new', 'contacted', 'replied', 'won', 'dead'].includes(status)) {
      return res.status(400).json({ error: 'status invalide' });
    }
    const { error } = await supabaseAdmin
      .from('opportunity_leads')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', leadId);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
