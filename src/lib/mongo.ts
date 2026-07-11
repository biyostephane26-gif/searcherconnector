// =================================================================
// SEARCHER CONNECTOR — MongoDB Client
// TTL automatique sur les caches de scan (48h)
// Index pour performances
// =================================================================

import { MongoClient, Db, Collection } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;
let _initialized = false;

export async function getDb(): Promise<Db> {
  if (!client) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is not defined in environment');
    client = new MongoClient(uri, {
      maxPoolSize: 10,          // Max connexions simultanées
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    });
    await client.connect();
  }
  if (!db) {
    const dbName = process.env.MONGODB_DB_NAME || 'searcherconnector';
    db = client.db(dbName);
  }

  // Initialiser les index une seule fois au démarrage
  if (!_initialized) {
    _initialized = true;
    try {
      // TTL sur scan_cache — expire automatiquement après 48h
      // Évite que MongoDB se remplisse avec des millions d'entrées
      await db.collection('scan_cache').createIndex(
        { timestamp: 1 },
        { expireAfterSeconds: 172800, background: true } // 48h = 48 * 3600
      );

      // TTL sur monitoring_events — garder seulement 30 jours
      await db.collection('monitoring_events').createIndex(
        { createdAt: 1 },
        { expireAfterSeconds: 2592000, background: true } // 30 jours
      );

      // Index sur scai_sessions pour requêtes rapides
      await db.collection('scai_sessions').createIndex(
        { userId: 1 },
        { background: true }
      );
      await db.collection('scai_sessions').createIndex(
        { derniereVue: -1 },
        { background: true }
      );

      // Index sur scan_cache pour les cache lookups rapides
      await db.collection('scan_cache').createIndex(
        { key: 1 },
        { background: true }
      );

    } catch { /* Index déjà existants — ignorer */ }
  }

  return db;
}

export async function getScaiSessions(): Promise<Collection> {
  const database = await getDb();
  return database.collection('scai_sessions');
}
