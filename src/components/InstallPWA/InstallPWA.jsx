import { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../../stores/useStore';

export default function InstallPWA() {
  const globalConfig = useStore(state => state.globalConfig);
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    
    // Si ya está instalada, no mostrar
    if (isStandalone) {
      return;
    }

    // Detección de iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    if (isIOSDevice) {
      setIsIOS(true);
      setSupportsPWA(true);
      return;
    }

    // Android / Desktop Chrome
    const handler = e => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const onClick = evt => {
    evt.preventDefault();
    if (!promptInstall) return;
    promptInstall.prompt();
    promptInstall.userChoice.then(choice => {
      if (choice.outcome === 'accepted') {
        setSupportsPWA(false);
      }
    });
  };

  // Solo mostrar dentro del panel de control (rutas que empiezan con /dashboard)
  if (!supportsPWA || isDismissed || !location.pathname.startsWith('/dashboard')) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] animate-in fade-in slide-in-from-bottom-10 duration-500">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)]/50 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] rounded-2xl p-5 flex flex-col md:flex-row items-center gap-5 w-max max-w-[90vw] md:max-w-[400px] relative overflow-hidden backdrop-blur-xl">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-primary)]/10 rounded-full blur-3xl -z-10" />
        
        <div className="bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-hover)] p-3 rounded-2xl shadow-lg shadow-[var(--accent-primary)]/20 shrink-0">
          <Download className="text-white" size={24} />
        </div>
        
        <div className="flex flex-col gap-1 pr-2 text-center md:text-left">
          <h4 className="font-bold text-[var(--text-primary)] text-sm leading-tight">Instalar App Oficial</h4>
          {isIOS ? (
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed flex items-center justify-center md:justify-start gap-1 flex-wrap mt-1">
              Toca <Share size={12} className="inline text-blue-500" /> en Safari y luego <strong>"Agregar a inicio"</strong>
            </p>
          ) : (
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Obtén acceso directo y notificaciones al instante instalando {globalConfig?.businessName || 'IntegrarSalud'}.
            </p>
          )}
        </div>
        
        <div className="flex flex-row md:flex-col items-center gap-3 md:gap-2 ml-0 md:ml-auto w-full md:w-auto mt-2 md:mt-0">
          {!isIOS && (
            <button 
              onClick={onClick}
              className="px-5 py-2.5 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-hover)] hover:opacity-90 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[var(--accent-primary)]/20 active:scale-95 whitespace-nowrap w-full"
            >
              Instalar Ahora
            </button>
          )}
          <button 
            onClick={() => setIsDismissed(true)}
            className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors w-full"
          >
            Quizás luego
          </button>
        </div>

        {/* Top-right close X */}
        <button 
          onClick={() => setIsDismissed(true)}
          className="absolute top-2 right-2 p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-body)] rounded-lg transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
