import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster, toast } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary.jsx'
// Service Worker Registration is now handled by ReloadPrompt component

// Si el usuario ingresa una ruta sin el hash (ej. /a en lugar de /#/a), 
// el servidor devuelve el index.html pero el HashRouter no entiende la ruta y carga el inicio.
// Esto fuerza a que cualquier ruta en la URL (pathname) se mueva al hash para que el Router la maneje y muestre 404 si no existe.
if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
  window.location.replace('/#' + window.location.pathname + window.location.search);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <Toaster
        position="top-right"
        containerStyle={{ zIndex: 999999 }}
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
