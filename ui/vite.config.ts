import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import wasm from 'vite-plugin-wasm';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte(), wasm()],
  resolve: {
    dedupe: [
      '@holochain-open-dev/elements',
      '@holochain-open-dev/profiles',
      '@holochain-open-dev/stores',
      '@holochain-syn/core',
      'lit',
      '@lit/reactive-element',
    ],
  },
  optimizeDeps: {
    exclude: [
      "svelte-codemirror-editor", 
      "codemirror", 
      "@codemirror/lang-html", 
      "@codemirror/lang-javascript",
      "@holochain-open-dev/elements/dist/elements/display-error.js"
    ],
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

