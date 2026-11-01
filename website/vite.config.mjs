import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

let base = '/';
const offlineCachePlugin = {
    name: 'offline-cache',
    apply: 'build',
    configResolved(config) {
        base = config.base;
    },
    generateBundle(_, bundle) {
        const basePath = base.endsWith('/') ? base : `${base}/`;
        const precacheUrls = [
            `${basePath}index.html`,
            ...Object.keys(bundle).map(file => `${basePath}${file}`),
            ...['favicon.ico', 'manifest.json', 'logo192.png', 'logo512.png', 'robots.txt'].map(file => `${basePath}${file}`)
        ];
        const workerSource = `
const CACHE_NAME = 'livepad-shell-v2';
const PRECACHE_URLS = ${JSON.stringify(precacheUrls)};
const BOOTSTRAP_URL = 'https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/css/bootstrap.min.css';

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(PRECACHE_URLS);
        try {
            await cache.add(BOOTSTRAP_URL);
        } catch {}
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.filter(name => name.startsWith('livepad-') && name !== CACHE_NAME).map(name => caches.delete(name)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    const isNavigation = request.mode === 'navigate';
    const isPrecachedAsset = PRECACHE_URLS.some(path => new URL(path, self.registration.scope).href === request.url);
    if (!isNavigation && !isPrecachedAsset && url.href !== BOOTSTRAP_URL) return;

    event.respondWith((async () => {
        if (!isNavigation) {
            const cachedResponse = await caches.match(request);
            if (cachedResponse) return cachedResponse;
        }

        try {
            const response = await fetch(request);
            if (!isNavigation && (response.ok || response.type === 'opaque')) {
                const cache = await caches.open(CACHE_NAME);
                cache.put(request, response.clone());
            }
            return response;
        } catch (error) {
            if (isNavigation) {
                return caches.match(new URL('index.html', self.registration.scope));
            }
            throw error;
        }
    })());
});
`;

        this.emitFile({ type: 'asset', fileName: 'sw.js', source: workerSource });
    }
};

export default defineConfig({
    plugins: [react(), offlineCachePlugin]
});
