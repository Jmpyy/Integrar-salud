import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster, toast } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary.jsx'
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    toast((t) => (
      <div className="flex flex-col gap-2 p-1">
        <span className="font-bold text-sm">¡Nueva actualización disponible! 🚀</span>
        <span className="text-xs opacity-80">Aplicá los cambios para seguir usando la app sin problemas.</span>
        <button 
          onClick={() => {
            toast.dismiss(t.id);
            updateSW(true);
            // Forzar recarga tras un breve delay para asegurar que el SW se active
            setTimeout(() => {
              window.location.reload();
            }, 500);
          }} 
          className="mt-1 bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-indigo-600 transition-colors w-full uppercase tracking-wider"
        >
          Actualizar Ahora
        </button>
      </div>
    ), { 
      duration: Infinity, 
      position: 'bottom-center',
      style: { border: '1px solid rgba(99, 102, 241, 0.3)' } 
    });
  },
  onOfflineReady() {
    console.log('La aplicación está lista para usarse sin conexión.');
  },
  onRegistered(r) {
    // Revisar actualizaciones en segundo plano cada 60 segundos
    if (r) {
      setInterval(() => {
        r.update();
      }, 60000);
    }
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#1e293b',
            color: '#fff',
            borderRadius: '1rem',
            fontWeight: '600',
            fontSize: '0.875rem',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </ErrorBoundary>
  </StrictMode>,
)
