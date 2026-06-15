import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster, ToastBar, toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import './index.css'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary.jsx'

const CustomToast = ({ t }) => {
  const isDismissed = !t.visible;
  const [exitX, setExitX] = useState(0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ 
        opacity: isDismissed ? 0 : 1, 
        y: isDismissed ? -20 : 0, 
        scale: isDismissed ? 0.9 : 1,
        x: exitX // Si se descarta por arrastre, se queda en la posición final o sale de la pantalla
      }}
      transition={{ duration: 0.2 }}
      drag={!isDismissed ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={(e, { offset, velocity }) => {
        if (Math.abs(offset.x) > 80 || Math.abs(velocity.x) > 300) {
          const dir = offset.x > 0 ? 1 : -1;
          setExitX(dir * window.innerWidth); // Animar hacia afuera
          toast.dismiss(t.id);
        }
      }}
      whileDrag={{ scale: 0.95 }}
      className="cursor-grab active:cursor-grabbing touch-pan-y"
      style={{ pointerEvents: 'auto' }}
    >
      <ToastBar toast={t} style={{ ...t.style, animation: 'none' }} />
    </motion.div>
  );
};

if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
  window.location.replace('/#' + window.location.pathname + window.location.search);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <Toaster
        position="top-right"
        containerStyle={{ zIndex: 999999, top: 16 }}
        toastOptions={{
          duration: 3500,
          style: {
            background: '#1e293b',
            color: '#fff',
            borderRadius: '1rem',
            fontWeight: '600',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      >
        {(t) => <CustomToast t={t} />}
      </Toaster>
    </ErrorBoundary>
  </StrictMode>,
)
