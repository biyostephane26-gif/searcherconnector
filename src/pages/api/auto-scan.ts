import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Pour sécurité: vérifier que c'est un appel cron (ex: secret key dans l'header)
  const authSecret = req.headers['x-cron-secret'];
  if (authSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Récupérer tous les utilisateurs avec plan payant
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('users_profiles')
      .select('*')
      .in('plan', ['talent', 'business', 'investor']);

    if (profileError) throw profileError;

    const results = [];

    for (const profile of profiles) {
      try {
        // Déterminer la zone en fonction du plan
        const zone = profile.plan === 'investor' ? 'worldwide' :
                     profile.plan === 'business' ? 'continental' : 'continental';

        // Appeler le scan API pour chaque utilisateur
        const scanRes = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/scan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({
            userId: profile.id,
            zone,
            has_budget: true
          })
        });

        const scanData = await scanRes.json();
        results.push({
          userId: profile.id,
          success: scanRes.ok,
          data: scanData
        });

        // Attendre un peu pour éviter les rate limits
        await new Promise(r => setTimeout(r, 1000));

      } catch (userErr) {
        results.push({
          userId: profile.id,
          success: false,
          error: (userErr as any)?.message || 'Erreur inconnue'
        });
      }
    }

    return res.status(200).json({
      message: 'Auto-scan terminé',
      total: profiles.length,
      results
    });

  } catch (err) {
    console.error('Auto-scan error:', err);
    return res.status(500).json({
      error: 'Erreur auto-scan',
      detail: (err as any)?.message
    });
  }
}
