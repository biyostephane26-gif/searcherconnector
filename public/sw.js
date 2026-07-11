// =================================================================
// SEARCHER CONNECTOR — Service Worker
// Cache intelligent + Notifications push
// =================================================================

const CACHE_NAME = 'sc-v1'
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/icon.svg',
  '/logo.svg',
  '/site.webmanifest',
]

// ── Installation ─────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ignore les erreurs de cache au premier install
      })
    })
  )
  self.skipWaiting()
})

// ── Activation ───────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ── Fetch (Network First pour les APIs, Cache First pour les assets) ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // Toujours network pour les APIs
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request).catch(() => new Response('Offline', { status: 503 })))
    return
  }

  // Network first, fallback cache pour les pages
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request).then(cached => cached || new Response('Offline', { status: 503 })))
  )
})

// ── Notifications Push ────────────────────────────────────────────
// Reçoit les notifications envoyées par le serveur (nouvelles opportunités, etc.)
self.addEventListener('push', event => {
  if (!event.data) return

  let data = {}
  try { data = event.data.json() } catch { data = { title: 'Searcher Connector', body: event.data.text() } }

  const options = {
    body:    data.body    || 'Nouvelles opportunités disponibles',
    icon:    '/icon.svg',
    badge:   '/icon.svg',
    tag:     data.tag     || 'sc-notification',
    data:    { url: data.url || '/opportunities' },
    actions: [
      { action: 'open',    title: 'Voir maintenant' },
      { action: 'dismiss', title: 'Plus tard'       },
    ],
    vibrate:   [200, 100, 200],
    renotify:  true,
    requireInteraction: data.urgent || false,
  }

  event.waitUntil(
    self.registration.showNotification(data.title || '⚡ Searcher Connector', options)
  )
})

// ── Clic sur notification ─────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/dashboard'

  if (event.action === 'dismiss') return

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Si l'app est déjà ouverte, focus dessus
      const existing = clients.find(c => c.url.includes(self.location.origin))
      if (existing) {
        existing.focus()
        existing.postMessage({ type: 'NAVIGATE', url: targetUrl })
      } else {
        // Sinon ouvrir une nouvelle fenêtre
        self.clients.openWindow(self.location.origin + targetUrl)
      }
    })
  )
})

// ── Sync en arrière-plan ──────────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-opportunities') {
    event.waitUntil(
      fetch('/api/sync-background').catch(() => {})
    )
  }
})
