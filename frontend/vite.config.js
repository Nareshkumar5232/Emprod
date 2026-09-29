import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const BACKEND_URL = process.env.VITE_PROXY_TARGET || 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/auth': BACKEND_URL,
      '/analyze-repo': BACKEND_URL,
      '/team-ranking': BACKEND_URL,
      '/repository-health': BACKEND_URL,
      '/recommendations': BACKEND_URL,
      '/top-performer': BACKEND_URL,
      '/risk-analysis': BACKEND_URL,
      '/history': BACKEND_URL,
      '/recent': BACKEND_URL,
      '/stats': BACKEND_URL,
      '/analysis': BACKEND_URL,
      '/contributors': BACKEND_URL,
      '/repositories': BACKEND_URL,
      '/predict': BACKEND_URL,
      '/drift-detection': BACKEND_URL,
      '/drift-report': BACKEND_URL,
      '/retrain': BACKEND_URL,
    }
  },
  preview: {
    port: 3000,
    proxy: {
      '/auth': BACKEND_URL,
      '/analyze-repo': BACKEND_URL,
      '/team-ranking': BACKEND_URL,
      '/repository-health': BACKEND_URL,
      '/recommendations': BACKEND_URL,
      '/top-performer': BACKEND_URL,
      '/risk-analysis': BACKEND_URL,
      '/history': BACKEND_URL,
      '/recent': BACKEND_URL,
      '/stats': BACKEND_URL,
      '/analysis': BACKEND_URL,
      '/contributors': BACKEND_URL,
      '/repositories': BACKEND_URL,
      '/predict': BACKEND_URL,
      '/drift-detection': BACKEND_URL,
      '/drift-report': BACKEND_URL,
      '/retrain': BACKEND_URL,
    }
  }
})
