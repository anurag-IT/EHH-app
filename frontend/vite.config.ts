import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');

  if (mode === 'production' && !env.VITE_API_URL) {
    throw new Error('VITE_API_URL must be set for production builds');
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    optimizeDeps: { 
      include: ['react', 'react-dom', '@tanstack/react-query'] 
    },
    build: {
      chunkSizeWarningLimit: 800,
      reportCompressedSize: false, // Faster builds — compressed sizes aren't needed for dev
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-motion': ['motion'],
            'vendor-ui': ['lucide-react', 'react-toastify'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-socket': ['socket.io-client'],
            'vendor-charts': ['recharts'],
            'vendor-virtuoso': ['react-virtuoso'],
          },
          // Consistent chunk names for long-term caching
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
        treeshake: {
          moduleSideEffects: false,
          propertyReadSideEffects: false,
        }
      },
      target: 'es2020',
      minify: 'esbuild',
      sourcemap: false,
      cssCodeSplit: true,
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_BUILD_TIME': JSON.stringify(new Date().toLocaleString()),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
        '/admin': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: 'http://localhost:3001',
          ws: true,
          changeOrigin: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
