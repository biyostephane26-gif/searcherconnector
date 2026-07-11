import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, profile_type, min_score, max_days } = req.method === 'POST' ? req.body : req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    // Récupérer d'abord depuis la DB les opportunités correspondantes
    const { data: dbOpportunities, error: dbErr } = await supabaseAdmin
      .from('opportunities')
      .select('*')
      .eq('user_id', userId)
      .gte('score', min_score || 20);

    if (dbErr) throw dbErr;

    // Filtrer par frais
    let results = dbOpportunities || [];

    if (max_days) {
      const cutoff = new Date(Date.now() - Number(max_days) * 24 * 60 * 60 * 1000).toISOString();
      results = results.filter(o => new Date(o.created_at) > new Date(cutoff));
    }

    if (profile_type) {
      results = results.filter(o => o.profile_type === profile_type);
    }

    // Si pas de résultats dans la DB → lancer un scan en fallback
    let fromFallbackScan = false;
    if (results.length === 0) {
      fromFallbackScan = true;
      const scanRes = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          zone: profile_type === 'investor' ? 'worldwide' : 'continental',
          has_budget: true
        })
      });
      if (scanRes.ok) {
        const scanData = await scanRes.json();
        results = scanData.opportunities || scanData.results || [];
      }
    } else {
      // Incrémenter view_count pour les résultats retournés
      await Promise.all(
        results.map(async (opp: any) => {
          await supabaseAdmin
            .from('opportunities')
            .update({ view_count: (opp.view_count || 0) + 1 })
            .eq('id', opp.id);
        })
      );
    }

    return res.status(200).json({
      results,
      from_cache: results.length > 0 && !fromFallbackScan,
      from_scan: fromFallbackScan
    });

  } catch (err) {
    console.error('Opp search error:', err);
    return res.status(500).json({
      error: 'Erreur recherche opportunités',
      detail: (err as any)?.message
    });
  }
}
