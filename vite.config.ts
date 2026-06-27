import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // @mediapipe/hands attaches `Hands` to the global scope instead of using
      // real ESM exports, which breaks production builds. Redirect to a shim
      // that re-exports the global as a proper named export.
      {
        find: /^@mediapipe\/hands$/,
        replacement: path.resolve(__dirname, 'src/shims/mediapipeHandsShim.ts'),
      },
    ],
  },
})
