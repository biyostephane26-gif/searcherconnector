export async function scrapeProductHunt(term: string) {
  const results: any[] = [];
  try {
    // ProductHunt a une API mais pour l'instant on peut utiliser un scrape simple ou retourner [] si pas de clé
    // Pour l'instant, on retourne un placeholder (tu pourras ajouter la clé API plus tard)
    console.log('ProductHunt actor placeholder - add API key later');
  } catch (e) {
    console.error('ProductHunt scrape error:', e);
  }
  return results;
}
