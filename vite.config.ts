import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  // Base path para producción en subdirectorio
  base: '/multiplicacion/',

  // Configuración del servidor de desarrollo
  server: {
    port: 5173,
    open: true
  },

  // Configuración del build
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Generar sourcemaps para debugging en producción si es necesario
    sourcemap: false,
    // Optimizar el tamaño del bundle (usar esbuild en vez de terser)
    minify: 'esbuild',
    // Tamaño máximo de chunk warning
    chunkSizeWarningLimit: 1000
  }
})
