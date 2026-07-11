require('dotenv').config({ path: '.env' });
const { MongoClient } = require('mongodb');

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI is not set in environment.');
    return;
  }
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('searcherconnector');
    console.log('Connected to MongoDB database searcherconnector.');
    
    const result = await db.collection('scan_cache').deleteMany({});
    console.log(`Successfully deleted ${result.deletedCount} items from scan_cache.`);
  } catch (error) {
    console.error('Error connecting to MongoDB or deleting cache:', error);
  } finally {
    await client.close();
  }
}

run();
