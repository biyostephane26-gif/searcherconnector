import { NextApiRequest, NextApiResponse } from 'next';
import { getScaiSessions } from '../../../../lib/mongo';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;
  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required' });
  }

  if (password !== process.env.SCAI_MASTER_PASSWORD) {
    return res.status(401).json({ error: "Mot de passe incorrect." });
  }

  try {
    const idPropre = userId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const sessionsCollection = await getScaiSessions();
    const result = await sessionsCollection.updateOne(
      { userId: idPropre },
      { $set: { messages: [], historique: [] } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }
    
    return res.status(200).json({ success: true, message: "Mémoire de l'utilisateur réinitialisée." });
  } catch (err) {
    console.error("Erreur lors de la réinitialisation de la mémoire :", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
}
