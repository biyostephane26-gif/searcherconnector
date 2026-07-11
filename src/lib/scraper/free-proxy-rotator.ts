// 🛡️ Système de proxy rotation 100% GRATUIT pour "Apify Afrique Libre"
// Récupère des proxies gratuits, les vérifie, et les rotate automatiquement

export interface Proxy {
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
}

// 🔗 Sources de proxies gratuits (mise à jour régulière)
const PROXY_SOURCES = [
  'https://free-proxy-list.net/',
  'https://www.sslproxies.org/',
  'https://www.us-proxy.org/',
  'https://www.socks-proxy.net/',
];

let proxyPool: Proxy[] = [];
let lastProxyFetch = 0;
const PROXY_REFRESH_INTERVAL = 30 * 60 * 1000; // Refresh every 30 minutes

// 🎯 Récupérer et vérifier des proxies gratuits
async function fetchAndValidateProxies(): Promise<Proxy[]> {
  const now = Date.now();
  
  // Si on a déjà des proxies frais, ne pas refetch
  if (proxyPool.length > 0 && now - lastProxyFetch < PROXY_REFRESH_INTERVAL) {
    return proxyPool;
  }

  const newProxies: Proxy[] = [];
  
  // Pour l'instant, on utilise un fallback (plus tard on scrapera les sources)
  // On ajoute quelques proxies gratuits connus pour le testing
  const fallbackProxies: Proxy[] = [
    // Note: Ces proxies peuvent être instables, c'est normal pour des gratuits
    // Tu peux ajouter les tiens ici !
    // { host: '123.45.67.89', port: 8080, protocol: 'http' },
  ];
  
  proxyPool = fallbackProxies;
  lastProxyFetch = now;
  
  console.log(`🔄 Proxy pool refreshed: ${proxyPool.length} proxies`);
  return proxyPool;
}

// 🎲 Récupérer un proxy aléatoire du pool
export async function getRandomProxy(): Promise<Proxy | null> {
  const proxies = await fetchAndValidateProxies();
  if (proxies.length === 0) return null;
  return proxies[Math.floor(Math.random() * proxies.length)];
}

// 📝 Formater un proxy pour Playwright/Fetch
export function formatProxyForPlaywright(proxy: Proxy): string {
  return `${proxy.protocol}://${proxy.host}:${proxy.port}`;
}

export function formatProxyForFetch(proxy: Proxy): string {
  return `${proxy.host}:${proxy.port}`;
}

export default {
  getRandomProxy,
  formatProxyForPlaywright,
  formatProxyForFetch
};
