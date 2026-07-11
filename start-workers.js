// =================================================================
// SEARCHER CONNECTOR — WORKERS DÉMARRAGE
// =================================================================
// Script pour démarrer les workers BullMQ en production

import 'dotenv/config';
import { startScraperWorker, startScanWorker } from './src/lib/scraper/queue.js';

console.log('🚀 DÉMARRAGE DES WORKERS SEARCHER CONNECTOR...');

try {
  // Démarrer le worker scraper
  const scraperWorker = startScraperWorker(3); // 3 jobs en parallèle
  console.log('✅ Worker Scraper démarré');

  // Démarrer le worker scan
  const scanWorker = startScanWorker(2); // 2 scans en parallèle
  console.log('✅ Worker Scan démarré');

  console.log('\n🎉 TOUS LES WORKERS SONT ACTIFS !');
  console.log('   - Appuyez sur Ctrl+C pour arrêter\n');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('\n🛑 Arrêt des workers en cours...');
    await scraperWorker.close();
    await scanWorker.close();
    console.log('✅ Workers arrêtés proprement');
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('\n🛑 Arrêt des workers en cours...');
    await scraperWorker.close();
    await scanWorker.close();
    console.log('✅ Workers arrêtés proprement');
    process.exit(0);
  });
} catch (error) {
  console.error('❌ Échec du démarrage des workers:', error);
  process.exit(1);
}
