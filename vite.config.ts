import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Flappy Hippo is a purely client-side game: no backend, no network calls at runtime. The build is
// a static bundle plus a service worker that precaches it, so the game keeps working offline and
// can be installed to a phone's home screen.
export default defineConfig(({ command, isPreview }) => ({
  // GitHub Pages serves this project site under /flappy-hippo/, and `vite preview` has to use the
  // same prefix or the built HTML's asset paths 404. Dev stays at the root.
  // Set to '/' if you move to a user site or a custom domain.
  base: command === 'build' || isPreview ? '/flappy-hippo/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Flappy Hippo',
        short_name: 'Flappy Hippo',
        description: 'Lass das Nilpferd fliegen und weiche den Hindernissen aus.',
        lang: 'de',
        start_url: '.',
        scope: '.',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'any',
        background_color: '#e5f0ff',
        theme_color: '#006aff',
        categories: ['games', 'entertainment'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Everything is precached; nothing is fetched at runtime, so no network fallbacks.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  build: { outDir: 'dist', sourcemap: true },
}))
