import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@shared': fileURLToPath(new URL('../shared', import.meta.url)) } },
  // web/ 밖의 shared/를 dev 서버가 읽을 수 있게 허용
  server: { fs: { allow: ['..'] } },
})
