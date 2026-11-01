import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/bootstrap@4\.5\.3\/dist\/css\/bootstrap\.min\.css$/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'bootstrap-styles',
                            cacheableResponse: { statuses: [0, 200] },
                            expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 * 365 }
                        }
                    }
                ]
            }
        })
    ]
});
