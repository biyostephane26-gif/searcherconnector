// =================================================================
// SCAI Cowork — liste / suppression des conversations d'un utilisateur
// =================================================================
// GET    : liste les conversations (id, titre, dernière activité),
//          plus récentes d'abord — alimente la liste "Discussions"
//          dans le rail gauche, façon Cowork.
// DELETE : supprime une conversation précise (?conversationId=...).
// =================================================================
import { NextApiRequest, NextApiResponse } from 'next';
import { getScaiSessions } from '../../../../lib/mongo';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required' });
  }
  const idPropre = userId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const sessionsCollection = await getScaiSessions();

  if (req.method === 'GET') {
    try {
      const docs = await sessionsCollection
        .find({ userId: idPropre })
        .project({ conversationId: 1, title: 1, derniereVue: 1, messageCount: 1, createdAt: 1 })
        .sort({ derniereVue: -1 })
        .limit(50)
        .toArray();

      const conversations = docs.map((d: any) => ({
        id: d.conversationId || 'default',
        title: d.title || 'Nouvelle discussion',
        updatedAt: d.derniereVue || d.createdAt || null,
        messageCount: d.messageCount || 0,
      }));

      return res.status(200).json({ success: true, conversations });
    } catch (err) {
      console.error('Erreur liste conversations :', err);
      return res.status(500).json({ error: 'Erreur lecture des conversations' });
    }
  }

  if (req.method === 'DELETE') {
    const conversationId = String(req.query.conversationId || '').slice(0, 100);
    if (!conversationId) return res.status(400).json({ error: 'conversationId requis' });
    try {
      const filter = conversationId === 'default'
        ? { userId: idPropre, $or: [{ conversationId: 'default' }, { conversationId: { $exists: false } }] }
        : { userId: idPropre, conversationId };
      await sessionsCollection.deleteOne(filter);
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Erreur suppression conversation :', err);
      return res.status(500).json({ error: 'Erreur suppression' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
