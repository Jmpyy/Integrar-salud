import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // Habilita acceso en red local
    port: 5173,
  },
  build: {
    target: 'esnext', // Optimiza usando sintaxis moderna (más ligero)
    minify: 'esbuild',
    sourcemap: false, // Quita los sourcemaps en producción (ahorra peso)
    rollupOptions: {
      output: {
        // Divide el código en paquetes separados para que el navegador los guarde en caché.
        // Si actualizas tu código futuro, el cliente no tiene que volver a descargar todo React.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-icons': ['lucide-react'],
          'vendor-utils': ['axios', 'zustand', 'react-hot-toast', 'uuid', 'zod', 'clsx']
        }
      }
    }
  },
  esbuild: {
    // Eliminar todos los console.log en el entorno de producción
    drop: ['console', 'debugger'],
  }
})