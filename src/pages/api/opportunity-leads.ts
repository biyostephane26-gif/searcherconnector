// =================================================================
// OPPORTUNITY CREATOR — pipeline persistant des leads
// GET  : liste tous les leads déjà trouvés pour l'utilisateur (l'actif
//        qui grandit dans le temps — voir opportunity-creator.ts)
// PATCH: change le statut d'un lead (new → contacted → replied → won/dead),
//        géré par l'utilisateur comme un mini-CRM.
// Authentifié par session — avant ce correctif, GET lisait les leads de
// n'importe quel userId passé en query (fuite des messages d'approche
// et audits d'un autre utilisateur), et PATCH changeait le statut de
// N'IMPORTE QUEL lead sans même vérifier à qui il appartenait.
// =================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { requireUserPages } from '../../lib/server/requireUser';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireUserPages(req);
  if (!auth) return res.status(401).json({ error: 'Non authentifié' });
  const userId = auth.user.id;

  if (req.method === 'GET') {
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
    const { data, error } = await supabaseAdmin
      .from('opportunity_leads')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', leadId)
      .eq('user_id', userId) // n'affecte jamais un lead appartenant à quelqu'un d'autre
      .select('id');
    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) return res.status(404).json({ error: 'Lead introuvable' });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
