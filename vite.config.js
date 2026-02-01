import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const frontendPort = parseInt(env.VITE_PORT) || 3000
  const backendPort = parseInt(env.PORT) || 3001

  return {
    plugins: [react()],
    server: {
      port: frontendPort,
      strictPort: false,  // 允许自动切换端口
      proxy: {
        '/api': {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true
        }
      }
    }
  }
})
