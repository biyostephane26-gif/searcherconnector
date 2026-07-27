// =================================================================
// API PUBLIQUES GRATUITES — sans clé, sans quota, sans crédit
// =================================================================
// Ajoutées le 2026-07-27 après la panne sèche de Serper : ces boards
// exposent une API JSON ouverte, donc zéro dépendance à un fournisseur
// payant (Serper/ScrapingBee/ZenRows sont tous à sec ou expirés).
//
// ⚠️ Ce sont des boards MIXTES (majoritairement du salarié). On ne garde
// que les annonces dont la plateforme déclare elle-même le type de contrat
// comme freelance/contrat, via un champ STRUCTURÉ — jamais par heuristique
// sur le titre. Mesuré à l'intégration : ~9 missions freelance réelles sur
// ~400 offres brutes (2%). Le volume est faible mais la précision est celle
// de la plateforme, pas la nôtre : aucun risque de rejouer le mixup
// emploi/freelance que le pivot freelance-only vient d'éliminer.
//
// Chaque schéma a été relevé sur la réponse réelle de l'API, pas deviné.

export const FREE_API_NAMES = ['Remotive', 'Arbeitnow', 'Jobicy', 'Himalayas'] as const;
export type FreeApiName = typeof FREE_API_NAMES[number];

// Un item normalisé, au même format que parseGenericAPIData() pour que la
// suite du pipeline (dédoublonnage, matching, cache) n'ait rien à savoir
// de la provenance.
export interface NormalizedItem {
  title: string; company: string; location: string; link: string;
  snippet: string; date: string; isPremium: boolean; source: string;
}

// Ce que les plateformes déclarent comme mission, tous vocabulaires confondus
// (Arbeitnow renvoie aussi de l'allemand : freiberuflich = freelance).
const CONTRACT_RE = /contract|freelance|freiberuf|contractor|temporaire|interim/i;

function isContractType(raw: unknown): boolean {
  if (!raw) return false;
  const s = Array.isArray(raw) ? raw.join(' ') : String(raw);
  return CONTRACT_RE.test(s);
}

// Les dates arrivent en 3 formats selon la source : ISO, epoch secondes,
// ou epoch millisecondes. On normalise en ISO pour isDateFreshEnough().
function toIso(v: unknown): string {
  if (!v) return '';
  if (typeof v === 'number') {
    // < 1e12 => secondes (sinon millisecondes)
    return new Date(v < 1e12 ? v * 1000 : v).toISOString();
  }
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? '' : d.toISOString();
}

function clean(s: unknown, max = 300): string {
  return String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

// Extrait le tableau d'offres — la clé racine diffère par API.
function rootArray(name: FreeApiName, data: any): any[] {
  const arr = name === 'Arbeitnow' ? data?.data : data?.jobs;
  return Array.isArray(arr) ? arr : (Array.isArray(data) ? data : []);
}

/**
 * Convertit la réponse brute d'une API gratuite en items normalisés,
 * en ne conservant QUE les annonces déclarées freelance/contrat.
 * Ne filtre ni par date ni par mot-clé : c'est le rôle de l'appelant
 * (generators.ts), qui possède déjà cette logique pour toutes les sources.
 */
export function parseFreeApi(name: FreeApiName, data: any): NormalizedItem[] {
  const out: NormalizedItem[] = [];
  for (const j of rootArray(name, data)) {
    let item: NormalizedItem | null = null;

    if (name === 'Remotive') {
      if (!isContractType(j.job_type)) continue;
      item = {
        title: clean(j.title, 200), company: clean(j.company_name, 120),
        location: clean(j.candidate_required_location, 120), link: String(j.url || ''),
        snippet: clean(j.description), date: toIso(j.publication_date),
        isPremium: false, source: 'freeapi:remotive',
      };
    } else if (name === 'Arbeitnow') {
      if (!isContractType(j.job_types)) continue;
      item = {
        title: clean(j.title, 200), company: clean(j.company_name, 120),
        location: clean(j.location, 120), link: String(j.url || ''),
        snippet: clean(j.description), date: toIso(j.created_at),
        isPremium: false, source: 'freeapi:arbeitnow',
      };
    } else if (name === 'Jobicy') {
      if (!isContractType(j.jobType)) continue;
      item = {
        title: clean(j.jobTitle, 200), company: clean(j.companyName, 120),
        location: clean(j.jobGeo, 120), link: String(j.url || ''),
        snippet: clean(j.jobExcerpt || j.jobDescription), date: toIso(j.pubDate),
        isPremium: false, source: 'freeapi:jobicy',
      };
    } else if (name === 'Himalayas') {
      if (!isContractType(j.employmentType)) continue;
      item = {
        title: clean(j.title, 200), company: clean(j.companyName, 120),
        location: clean(j.locationRestrictions, 120), link: String(j.applicationLink || ''),
        snippet: clean(j.excerpt || j.description), date: toIso(j.pubDate),
        isPremium: false, source: 'freeapi:himalayas',
      };
    }

    if (item && item.title && item.link) out.push(item);
  }
  return out;
}
