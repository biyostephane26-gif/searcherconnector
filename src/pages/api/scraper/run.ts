import { NextApiRequest, NextApiResponse } from 'next';
import { 
  scrapeRemotive, 
  scrapeRedditJobs, 
  scrapeArbeitnow, 
  scrapeHimalayas,
  scrapeWizbii,
  scrapeAdzuna,
  scrapeHackerNews,
  scrapeGitHub,
  scrapeDevTo,
  scrapeProductHunt
} from '../../../lib/scraper/actors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { actor, keyword } = req.body;
  if (!actor || !keyword) return res.status(400).json({ error: 'actor et keyword requis' });

  try {
    let results: any[] = [];
    switch (actor) {
      case 'remotive':
        results = await scrapeRemotive(keyword);
        break;
      case 'reddit-jobs':
        results = await scrapeRedditJobs(keyword);
        break;
      case 'arbeitnow':
        results = await scrapeArbeitnow(keyword);
        break;
      case 'himalayas':
        results = await scrapeHimalayas(keyword);
        break;
      case 'wizbii':
        results = await scrapeWizbii(keyword);
        break;
      case 'adzuna':
        results = await scrapeAdzuna(keyword);
        break;
      case 'hackernews':
        results = await scrapeHackerNews(keyword);
        break;
      case 'github':
        results = await scrapeGitHub(keyword);
        break;
      case 'devto':
        results = await scrapeDevTo(keyword);
        break;
      case 'producthunt':
        results = await scrapeProductHunt(keyword);
        break;
      default:
        return res.status(404).json({ error: 'Acteur introuvable' });
    }
    return res.status(200).json({ results });
  } catch (err) {
    console.error('Scraper error:', err);
    return res.status(500).json({
      error: 'Erreur scraping',
      detail: (err as any)?.message
    });
  }
}
