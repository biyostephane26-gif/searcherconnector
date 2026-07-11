import { NextApiRequest, NextApiResponse } from 'next';
import { addToWaitlist, getWaitlistPosition, getWaitlistStats } from '../../lib/scraper/queue';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Ajouter à la waitlist
    const { email, country } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email requis' });
    }
    try {
      const position = await addToWaitlist(email, country);
      return res.status(200).json({
        success: true,
        message: 'Ajouté à la waitlist !',
        position,
      });
    } catch (err) {
      console.error('Erreur waitlist:', err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  } else if (req.method === 'GET') {
    // Voir la position ou les stats
    const { email, stats } = req.query;
    try {
      if (stats === 'true') {
        const waitlistStats = await getWaitlistStats();
        return res.status(200).json(waitlistStats);
      }
      if (email) {
        const position = await getWaitlistPosition(email as string);
        if (position === null) {
          return res.status(404).json({ error: 'Email pas trouvé dans la waitlist' });
        }
        return res.status(200).json({ email, position });
      }
      return res.status(400).json({ error: 'Paramètre email ou stats requis' });
    } catch (err) {
      console.error('Erreur waitlist:', err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  } else {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
}