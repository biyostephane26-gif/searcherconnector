// Script pour vider le cache de scan MongoDB
// Lance : node clear-scan-cache.cjs
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function clearCache() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('searcherconnector');
    const result = await db.collection('scan_cache').deleteMany({});
    console.log(`✅ Cache vidé : ${result.deletedCount} entrées supprimées`);
    const result2 = await db.collection('opportunities').deleteMany({});
    console.log(`✅ Opportunités vidées : ${result2.deletedCount} entrées supprimées`);
  } finally {
    await client.close();
  }
}
clearCache().catch(console.error);
