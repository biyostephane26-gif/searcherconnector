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
      const conversationId = String(req.query.conversationId || 'default').slice(0, 100);

      // 1. RÉCUPÉRATION — même logique de migration douce que /api/scai/chat :
      // "default" retombe sur l'ancien document sans conversationId s'il existe.
      let doc = await sessionsCollection.findOne({ userId: idPropre, conversationId });
      if (!doc && conversationId === 'default') {
        doc = await sessionsCollection.findOne({ userId: idPropre, conversationId: { $exists: false } });
      }

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

  // Ajoute UN message (avec sa pièce jointe éventuelle) à la conversation,
  // sans repasser par l'IA — utilisé pour les résultats d'outils (PDF/image/
  // vidéo/opportunité) générés côté client via runTool(). Avant ce endpoint,
  // ces messages n'étaient jamais sauvegardés en base : ils vivaient
  // uniquement dans l'état React local et disparaissaient du chat dès que
  // l'utilisateur quittait puis revenait sur SCAI Cowork.
  if (req.method === 'POST') {
    try {
      const { role, content, attachment } = req.body || {};
      if (!role || typeof content !== 'string') {
        return res.status(400).json({ error: 'role et content sont requis' });
      }
      const conversationId = String(req.body?.conversationId || 'default').slice(0, 100);

      let doc = await sessionsCollection.findOne({ userId: idPropre, conversationId });
      if (!doc && conversationId === 'default') {
        doc = await sessionsCollection.findOne({ userId: idPropre, conversationId: { $exists: false } });
      }
      // Pas de document existant : rien à rattacher ce message (ne devrait
      // pas arriver en pratique — un outil ne peut être appelé qu'après au
      // moins un échange déjà sauvegardé par /api/scai/chat).
      if (!doc) return res.status(404).json({ error: 'Conversation introuvable' });

      const messages = doc.messages || doc.historique || [];
      const newMessage: any = { role, content };
      if (attachment) newMessage.attachment = attachment;
      messages.push(newMessage);

      const filter = doc._id ? { _id: doc._id } : { userId: idPropre, conversationId };
      await sessionsCollection.updateOne(filter, {
        $set: {
          messages,
          derniereVue: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          messageCount: messages.filter((m: any) => m.role !== 'system').length,
        },
      });

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("Erreur sauvegarde message :", err);
      return res.status(500).json({ error: "Erreur sauvegarde message" });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
