// =================================================================
// SEARCHER CONNECTOR — POPULATE CACHE FROM ALL SOURCES
// =================================================================
// This endpoint scrapes all 200+ sources and stores results in cache

import type { NextApiRequest, NextApiResponse } from 'next';
import { cache } from '@/lib/scraper/cache-manager';
import { fetchAllSources } from '@/lib/scraper/generators';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for secret key for security
  const secret = req.headers['x-sc-secret'] as string;
  const expectedSecret = process.env.SC_CACHE_SECRET || 'dev-secret-123'; // Change in production!
  if (secret !== expectedSecret) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🚀 Starting cache population from all 200+ sources...');

    // Start scraper session
    const session = await cache.startScraperSession();
    console.log('📊 Scraper session started:', session.id);

    // Logs array
    const log: string[] = [];

    // We'll populate cache for several main categories/keywords to get a variety of opportunities
    const keywords = [
      'developer',
      'designer',
      'marketing',
      'product manager',
      'data scientist',
      'freelance',
      'remote',
      'react',
      'node.js',
      'python',
    ];

    let totalOpportunitiesFound = 0;
    let totalOpportunitiesAdded = 0;
    const errors: any[] = [];

    // Process each keyword
    for (const keyword of keywords) {
      try {
        console.log(`🔍 Processing keyword: ${keyword}`);

        // Fetch sources for this keyword
        const results = await fetchAllSources(keyword, log);
        totalOpportunitiesFound += results.length;

        // Add each result to cache
        for (const item of results) {
          try {
            await cache.addOpportunity({
              title: item.title,
              company: item.company,
              location: item.location,
              country: undefined, // We could extract this from location
              salary_min: undefined,
              salary_max: undefined,
              currency: undefined,
              description: item.snippet,
              original_url: item.link,
              source_platform: item.source,
              source_type: 'free', // All these sources are free
              category: 'job', // Default category, could be more specific later
              published_at: item.date ? new Date(item.date) : undefined,
              applicants_count: undefined,
            });
            totalOpportunitiesAdded++;
          } catch (err) {
            errors.push({
              keyword,
              item,
              error: (err as any)?.message,
            });
          }
        }

        console.log(`✅ Processed keyword "${keyword}": ${results.length} opportunities`);
      } catch (err) {
        console.error(`❌ Error processing keyword "${keyword}":`, err);
        errors.push({
          keyword,
          error: (err as any)?.message,
        });
      }
    }

    // Update scraper session with results
    await cache.updateScraperSession(session.id, {
      status: 'completed',
      ended_at: new Date(),
      sources_scanned: 200,
      opportunities_found: totalOpportunitiesFound,
      opportunities_added: totalOpportunitiesAdded,
      errors,
    });

    // Create founder alert
    await cache.createFounderAlert(
      'cache_population',
      'Cache Population Complete',
      `Successfully populated cache with ${totalOpportunitiesAdded} new opportunities from ${totalOpportunitiesFound} found.`,
      'info'
    );

    console.log('✅ Cache population complete!');
    console.log(`📊 Summary: ${totalOpportunitiesFound} found, ${totalOpportunitiesAdded} added`);

    return res.status(200).json({
      success: true,
      summary: {
        keywords_processed: keywords.length,
        opportunities_found: totalOpportunitiesFound,
        opportunities_added: totalOpportunitiesAdded,
        errors_count: errors.length,
      },
      log,
    });
  } catch (error) {
    console.error('❌ Error populating cache:', error);
    
    // Create founder alert for error
    try {
      await cache.createFounderAlert(
        'cache_population_failed',
        'Cache Population Failed',
        `Error: ${(error as any)?.message}`,
        'error'
      );
    } catch {}

    return res.status(500).json({
      error: 'Failed to populate cache',
      message: (error as any)?.message,
    });
  }
}
