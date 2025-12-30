import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // 強制解析 axios 的 ESM 路徑
      'axios': 'axios/dist/axios.js',
    },
  },
  optimizeDeps: {
    include: ['axios'],
    esbuildOptions: {
      // 確保 axios 被正確處理為 ESM
      mainFields: ['module', 'main'],
    },
  },
  build: {
    commonjsOptions: {
      include: [/axios/, /node_modules/],
    },
    rollupOptions: {
      // 確保 axios 在建置時使用正確的解析邏輯
      external: [],
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/login': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/logout': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/register': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/check_status': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/mode': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/me': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
