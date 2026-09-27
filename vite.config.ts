import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves this project site under /flappy-hippo/, and `vite preview` has to use the
// same prefix or the built HTML's asset paths 404. Dev stays at the root.
// Set to '/' if you move to a user site or a custom domain — and update the canonical/og URLs in
// index.html to match.
const BASE = '/flappy-hippo/'

// The manifest is static, so it is in English; the interface itself follows the browser language.
const DESCRIPTION =
  'Make the hippo fly and dodge the pipes. Three difficulties, melons and shields, records, ' +
  'medals and achievements. Playable offline, no account, no ads.'

// Flappy Hippo is a purely client-side game: no backend, no network calls at runtime. The build is
// a static bundle plus a service worker that precaches it, so the game keeps working offline and
// installs to a phone's home screen or a desktop like a native app.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? BASE : '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // A new version waits until the player says so — never a reload in the middle of a round.
      // See src/components/UpdatePrompt.tsx.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'mask-icon.svg', 'robots.txt'],
      manifest: {
        id: BASE,
        name: 'Flappy Hippo',
        short_name: 'Flappy Hippo',
        description: DESCRIPTION,
        lang: 'en',
        dir: 'ltr',
        start_url: '.',
        scope: '.',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'any',
        background_color: '#e5f0ff',
        theme_color: '#006aff',
        categories: ['games', 'entertainment'],
        prefer_related_applications: false,
        // A second tap on the icon brings the running game back instead of opening a copy.
        launch_handler: { client_mode: 'navigate-existing' },
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-mono-512.png', sizes: '512x512', type: 'image/png', purpose: 'monochrome' },
        ],
        // Captured from the app itself by scripts/make-screenshots.ts. Chrome shows the wide ones
        // in the desktop install dialog, the narrow ones on Android; one aspect ratio each.
        screenshots: [
          {
            src: 'screenshots/narrow-flight.png',
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'The hippo in flight at night, shielded, between moving pipes and falling flower pots',
          },
          {
            src: 'screenshots/wide-flight.png',
            sizes: '1920x1080',
            type: 'image/png',
            form_factor: 'wide',
            label: 'The hippo in flight by day, shielded, between moving pipes and falling flower pots',
          },
        ],
        shortcuts: [
          {
            name: 'Records',
            short_name: 'Records',
            description: 'Best rounds and statistics',
            url: './?menu=scores',
            icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Achievements',
            short_name: 'Achievements',
            description: 'All achievements and what is still missing',
            url: './?menu=awards',
            icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,txt}'],
        // Store material only: the install dialog and iOS fetch these themselves.
        globIgnores: ['screenshots/**', 'splash/**'],
        // Everything else is precached; nothing is fetched at runtime, so no network fallbacks.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  build: { outDir: 'dist', sourcemap: true },
}))
