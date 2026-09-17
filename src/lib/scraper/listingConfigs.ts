// =================================================================
// REGISTRE DES CONFIGS DE LECTURE — plateformes verrouillées derrière
// connexion (aucun contenu public : ni RSS, ni API, ni sitemap, ni
// JSON-LD — confirmé un par un le 2026-07-27).
// =================================================================
// L'extension lit la page de résultats déjà rendue dans LA SESSION DE
// L'UTILISATEUR (pas de scraping serveur, pas de mot de passe géré par
// Searcher Connector) et remonte les items trouvés via ces sélecteurs.
//
// ⚠️ Chaque config ne peut être écrite qu'après avoir INSPECTÉ la vraie
// page authentifiée — impossible de deviner des sélecteurs CSS sans y
// avoir accès. Tant qu'une plateforme n'a pas de config ici, l'extension
// ne fait rien dessus (aucun risque de données fausses ou de faux CGU).
//
// Pour ajouter une plateforme : se connecter, ouvrir la page de résultats
// de missions, inspecter le DOM (clic droit → Inspecter sur une carte de
// mission), remplir listingUrlPattern + les 4 sélecteurs ci-dessous.

export interface ListingConfig {
  platform: string;           // doit matcher un `name` de FREELANCE_PLATFORMS_CURATED
  listingUrlPattern: string;  // regex (string) testée contre location.href
  itemSelector: string;       // sélecteur CSS d'une carte de mission
  titleSelector: string;      // sélecteur CSS du titre, relatif à itemSelector
  linkSelector: string;       // sélecteur CSS du lien, relatif à itemSelector (vide = itemSelector est lui-même un <a>)
  dateSelector: string;       // sélecteur CSS de la date, relatif à itemSelector (optionnel, '' si absent)
}

// Registre vide intentionnellement — voir note ci-dessus. Chaque entrée
// est ajoutée après vérification manuelle sur un compte réel.
export const LISTING_CONFIGS: ListingConfig[] = [
  // Vérifié le 2026-09-17 via Claude in Chrome, sur un compte LinkedIn
  // réel connecté (recherche "freelance developer") — 25 cartes trouvées,
  // sélecteurs confirmés par lecture directe du DOM rendu. Les classes
  // "job-card-list__*" et "scaffold-layout__*" sont les classes
  // sémantiques stables de LinkedIn ; les hash CSS-in-JS voisins
  // (générés à chaque build) sont volontairement ignorés — ils changent
  // sans préavis. Pas de date de publication affichée dans la liste
  // (dateSelector vide) : seulement sur la page de détail de l'offre.
  {
    platform: 'LinkedIn',
    listingUrlPattern: 'linkedin\\.com\\/jobs\\/(search|collections)',
    itemSelector: 'li.scaffold-layout__list-item',
    titleSelector: 'a.job-card-list__title--link',
    linkSelector: 'a.job-card-list__title--link',
    dateSelector: '',
  },
  // Vérifié le 2026-09-17 via Claude in Chrome, sur un compte
  // Freelancer.com réel connecté — table statique (pas de virtualisation),
  // 48/50 lignes exploitables au premier instantané. Le lien du projet
  // n'a pas de classe CSS propre (Angular) : ciblé par attribut href
  // plutôt qu'une classe, plus robuste ici.
  {
    platform: 'Freelancer',
    listingUrlPattern: 'freelancer\\.com\\/jobs',
    itemSelector: 'tr.ProjectTable-row',
    titleSelector: 'a[href*="/projects/"]',
    linkSelector: 'a[href*="/projects/"]',
    dateSelector: 'td:nth-child(5)',
  },
  // Vérifié le 2026-09-17 via Claude in Chrome, sur un compte Codeur.com
  // réel connecté — 35/37 cartes exploitables au premier instantané (les
  // 2 restantes sont des encarts non liés à un projet, ignorées sans
  // risque par extractListingItems). Pas de date affichée dans la liste.
  {
    platform: 'Codeur.com',
    listingUrlPattern: 'codeur\\.com\\/projects',
    itemSelector: 'div.card',
    titleSelector: 'h3 a[href*="/projects/"]',
    linkSelector: 'h3 a[href*="/projects/"]',
    dateSelector: '',
  },
];

export function findListingConfig(url: string): ListingConfig | null {
  for (const cfg of LISTING_CONFIGS) {
    try {
      if (new RegExp(cfg.listingUrlPattern, 'i').test(url)) return cfg;
    } catch { /* regex invalide dans un config — ignorée */ }
  }
  return null;
}
