import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Registration complete
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  const close = () => {
    setNeedRefresh(false);
  };

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="fixed bottom-4 right-4 z-[99999] w-full max-w-[320px] sm:max-w-sm bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl rounded-2xl p-4 flex gap-4 items-start mx-4 sm:mx-0"
        >
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center shrink-0 border border-[var(--accent-primary)]/20">
            <RefreshCw className="text-[var(--accent-primary)] animate-spin" style={{ animationDuration: '3s' }} size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-[var(--text-primary)] text-sm">Nueva versión disponible</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1 mb-3">Hay nuevas mejoras del sistema listas para instalarse.</p>
            <div className="flex gap-2">
              <button
                onClick={() => updateServiceWorker(true)}
                className="px-3 py-1.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold rounded-lg transition-colors flex-1"
              >
                Actualizar ahora
              </button>
              <button
                onClick={close}
                className="px-3 py-1.5 bg-[var(--bg-main)] hover:bg-slate-200 dark:hover:bg-slate-700 border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-bold rounded-lg transition-colors"
              >
                Más tarde
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
