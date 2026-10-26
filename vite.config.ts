import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  /* relative paths, so the built site works from any folder or GitHub Pages repo name */
  base: './',
})
