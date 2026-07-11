import { NextApiRequest, NextApiResponse } from 'next';
import { getScaiSessions } from '../../../../lib/mongo';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId is required' });
    }

    const idPropre = userId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const sessionsCollection = await getScaiSessions();
    
    // 1. RÉCUPÉRATION
    const doc = await sessionsCollection.findOne({ userId: idPropre });
    
    // Rétrocompatibilité avec l'ancien champ "historique" s'il existe
    const messages = doc && doc.messages ? doc.messages : (doc && doc.historique ? doc.historique : []);
    
    // On retire le system prompt pour ne pas l'afficher dans l'interface UI
    const historyWithoutSystem = messages.filter((m: any) => m.role !== 'system');

    return res.status(200).json({ success: true, history: historyWithoutSystem });
  } catch (err) {
    console.error("Erreur historique :", err);
    return res.status(500).json({ error: "Erreur lecture historique" });
  }
}
