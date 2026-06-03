import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// On GitHub Pages the site is served from /<repo>/, so we set `base` only when
// the GH_PAGES flag is set (in the deploy workflow). Local dev / Vercel use '/'.
export default defineConfig({
  plugins: [react()],
  base: process.env.GH_PAGES === 'true' ? '/ashleigh-korean-quest/' : '/',
})
