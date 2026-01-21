import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import wasm from 'vite-plugin-wasm';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte(), wasm()],
  optimizeDeps: {
    exclude: ["svelte-codemirror-editor", "codemirror", "@codemirror/lang-html", "@codemirror/lang-javascript"],
  },
  build: {
    target: 'esnext',
    minify: false
  },
  server: {
    hmr: {
        host: 'localhost',
    },
    watch: {
        usePolling: true
    }
  }
});

