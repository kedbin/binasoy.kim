import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readerPlugin } from './scripts/vite-reader-plugin';

export default defineConfig({
  plugins: [react(), readerPlugin()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (/node_modules[\\/]three[\\/]/.test(id)) return 'three';
          if (/node_modules[\\/](@react-three|postprocessing)[\\/]/.test(id)) return 'r3f';
          return undefined;
        },
      },
    },
  },
});
