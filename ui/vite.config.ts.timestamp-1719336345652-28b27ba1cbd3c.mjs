// vite.config.ts
import { defineConfig } from "file:///home/leo/hApps/tables/node_modules/vite/dist/node/index.js";
import { svelte } from "file:///home/leo/hApps/tables/node_modules/@sveltejs/vite-plugin-svelte/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [svelte()],
  build: {
    minify: false
  },
  server: {
    hmr: {
      host: "localhost"
    },
    watch: {
      usePolling: true
    }
  },
  optimizeDeps: {
    exclude: [
      "codemirror",
      "@codemirror/language-javascript"
      /* ... */
    ]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9sZW8vaEFwcHMvdGFibGVzL3VpXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9sZW8vaEFwcHMvdGFibGVzL3VpL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL2xlby9oQXBwcy90YWJsZXMvdWkvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCB7IHN2ZWx0ZSB9IGZyb20gJ0BzdmVsdGVqcy92aXRlLXBsdWdpbi1zdmVsdGUnO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3N2ZWx0ZSgpXSxcbiAgYnVpbGQ6IHtcbiAgICBtaW5pZnk6IGZhbHNlXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIGhtcjoge1xuICAgICAgICBob3N0OiAnbG9jYWxob3N0JyxcbiAgICB9LFxuICAgIHdhdGNoOiB7XG4gICAgICAgIHVzZVBvbGxpbmc6IHRydWVcbiAgICB9XG4gIH0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGV4Y2x1ZGU6IFtcImNvZGVtaXJyb3JcIiwgXCJAY29kZW1pcnJvci9sYW5ndWFnZS1qYXZhc2NyaXB0XCIgLyogLi4uICovXSxcbiAgfSxcbn0pO1xuXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTZQLFNBQVMsb0JBQW9CO0FBQzFSLFNBQVMsY0FBYztBQUd2QixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsT0FBTyxDQUFDO0FBQUEsRUFDbEIsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLEVBQ1Y7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLEtBQUs7QUFBQSxNQUNELE1BQU07QUFBQSxJQUNWO0FBQUEsSUFDQSxPQUFPO0FBQUEsTUFDSCxZQUFZO0FBQUEsSUFDaEI7QUFBQSxFQUNGO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixTQUFTO0FBQUEsTUFBQztBQUFBLE1BQWM7QUFBQTtBQUFBLElBQTJDO0FBQUEsRUFDckU7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
