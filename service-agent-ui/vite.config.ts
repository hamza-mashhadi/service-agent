import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
// the server here is added for local development, if you run the app via
// the docker-compose then it is running on production mode and will pick
// the base url from nginx config
  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      proxy: {
        '/request': {
          target: env.VITE_API_BASE_URL || 'http://localhost:3000',
          changeOrigin: true
        }
      }
    }
  }
})