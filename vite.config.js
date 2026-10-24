import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'LeseDeutsch - Aprende Alemán Leyendo',
        short_name: 'LeseDeutsch',
        description: 'Lector interactivo de alemán con análisis gramatical',
        theme_color: '#4f46e5',
        background_color: '#f8fafc',
        display: 'standalone'
      }
    })
  ],
})