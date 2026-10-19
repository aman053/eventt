/* EventEase service worker v41 — network-first, query-agnostic offline match */
const CACHE = 'eventease-v41';
const PRECACHE = [
  '/',
  '/index.html',
  '/about.html',
  '/services.html',
  '/contact.html',
  '/login.html',
  '/register.html',
  '/app.html',
  '/settings.html',
  '/invite.html',
  '/css/style.css',
  '/css/liquid-glass.css',
  '/css/obsidian-gold.css',
  '/js/store.js',
  '/js/script.js',
  '/js/auth.js',
  '/js/app.js',
  '/js/workspace.js',
  '/js/transitions.js',
  '/js/settings.js',
  '/js/features.js',
  '/js/budget.js',
  '/js/reminders.js',
  '/js/share.js',
  '/js/i18n.js',
  '/js/planner.js',
  '/js/chatbot.js',
  '/js/enhancements.js',
  '/js/support-bot.js',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
  '/images/auth-bg.jpg',
  '/images/hero.jpg',
  '/images/wedding.jpg',
  '/images/birthday.jpg',
  '/images/corporate.jpg',
  '/images/college.jpg',
  '/images/party.jpg',
  '/images/venue.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then(async (c) => {
        for (const url of PRECACHE) {
          try {
            await c.add(url);
          } catch (err) {
            console.warn('Precache skip', url, err);
          }
        }
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function matchIgnoreQuery(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return undefined;
    url.search = '';
    return (
      (await caches.match(url.href)) ||
      (await caches.match(url.pathname)) ||
      (await caches.match(url.pathname.replace(/^\//, '')))
    );
  } catch {
    return undefined;
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;
  if (url.includes('/api/')) return;

  e.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res && res.ok && url.startsWith(self.location.origin)) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => {
            c.put(req, copy);
            try {
              const u = new URL(url);
              if (u.search) {
                const bare = u.origin + u.pathname;
                c.put(bare, res.clone());
              }
            } catch (_) {}
          });
        }
        return res;
      })
      .catch(async () => {
        const hit = await matchIgnoreQuery(req);
        if (hit) return hit;
        // HTML fallback only for navigations
        if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
          return (await caches.match('/app.html')) || (await caches.match('/index.html'));
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })
  );
});
