import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    copyPublicDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.includes('data/')) {
            return assetInfo.name;
          }
          return `assets/[name]-[hash][extname]`;
        }
      }
    }
  },
  publicDir: 'public',
  server: {
    port: 3000,
    open: true,
    cors: true
  }
}); 