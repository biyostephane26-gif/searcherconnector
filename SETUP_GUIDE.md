# 🚀 GUIDE COMPLET : SETUP SEARCHER CONNECTOR (10,000+ USERS)

---

## 1. REDIS (UPSTASH — GRATUIT)
Pour BullMQ, le cache et les proxies.

### Étape 1 : Créer un compte Upstash
1. Allez sur [console.upstash.com](https://console.upstash.com/)
2. Créez un compte gratuit (pas besoin de carte bancaire)
3. Cliquez sur **Create Database**
4. Choisissez **Redis**
5. Nommez-la `searcher-connector`
6. Choisissez une région proche de vos utilisateurs (ex: EU West pour l'Afrique/Europe)
7. Cliquez sur **Create**

### Étape 2 : Récupérer les identifiants
Sur la page de votre base de données Upstash :
1. Copiez la **Connection String** (elle ressemble à `rediss://default:xxxxxxxxxxxx@xxxxxx.upstash.io:6379`)
2. Ouvrez votre fichier `.env.local` et ajoutez :
```env
# REDIS UPSTASH
REDIS_HOST=xxxxxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=xxxxxxxxxxxx
```

---

## 2. PROXIES (GRATUIT D'ABORD)
Pour éviter les bans sur les sources.

### Étape 1 : Liste de proxies gratuits
Utilisez ces sites pour trouver des proxies HTTP/HTTPS gratuits :
- [Free Proxy List](https://free-proxy-list.net/)
- [SSL Proxies](https://www.sslproxies.org/)
- [US Proxy](https://www.us-proxy.org/)

### Étape 2 : Ajouter les proxies
Les proxies sont gérés via le `ProxyManager`. Vous pouvez ajouter un endpoint API pour ça plus tard, mais pour l'instant, ajoutez-les dans un fichier `proxies.json` (que je vais créer) :
