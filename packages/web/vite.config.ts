import pluginvue from '@vitejs/plugin-vue'
import autoprefixer from 'autoprefixer'
import { fileURLToPath } from 'node:url'
import tailwindcss from 'tailwindcss'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/',
  plugins: [pluginvue()],
  build: {
    outDir: '../srv/dist/public',
    emptyOutDir: true,
    minify: true,
    target: 'ES2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1024,
    rollupOptions: {
      output: {
        manualChunks: inId => {
          if (inId.includes('node_modules')) {
            return 'vendor'
          }
        },
      },
    },
  },
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
  server: {
    host: '::',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:7777',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@src': fileURLToPath(new URL('./src', import.meta.url)),
      '@assets': fileURLToPath(new URL('./assets', import.meta.url)),
    },
  },
})
