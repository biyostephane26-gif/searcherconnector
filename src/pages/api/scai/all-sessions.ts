// Route fondateur — liste toutes les sessions SCAI pour modération
import type { NextApiRequest, NextApiResponse } from 'next';
import { getScaiSessions } from '../../../lib/mongo';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const FOUNDER_EMAILS = [
  'biyostephane26@gmail.com',
  'stephanenana.pro@gmail.com',
  process.env.NEXT_PUBLIC_FOUNDER_EMAIL || '',
].filter(Boolean).map((e: string) => e.toLowerCase());

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Vérifier que c'est le fondateur
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token) return res.status(401).json({ error: 'Non autorisé' });

  try {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Non autorisé' });

    const { data: profile } = await supabase.from('users_profiles')
      .select('email, role').eq('id', user.id).single();

    const isFounder = FOUNDER_EMAILS.includes((profile?.email || '').toLowerCase())
      || profile?.role === 'founder';

    if (!isFounder) return res.status(403).json({ error: 'Accès réservé au fondateur' });

    const collection = await getScaiSessions();
    const sessions = await collection.find({})
      .sort({ derniereVue: -1 })
      .limit(100)
      .project({ userId: 1, messageCount: 1, lastActive: 1, derniereVue: 1,
        messages: { $slice: -10 } }) // 10 derniers messages seulement pour la liste
      .toArray();

    return res.status(200).json({ success: true, sessions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
