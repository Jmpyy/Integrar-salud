import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Confirmar acción',
  description = '¿Estás seguro de que querés continuar?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger', // 'danger' | 'warning' | 'info'
  isLoading = false,
  showCancel = true,
}) {
  if (!isOpen) return null;

  const variantConfig = {
    danger: {
      bg: 'bg-red-500/10',
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-500',
      confirmBg: 'bg-red-600 hover:bg-red-700 shadow-red-500/20',
      borderColor: 'border-red-500/20',
    },
    warning: {
      bg: 'bg-amber-500/10',
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-500',
      confirmBg: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20',
      borderColor: 'border-amber-500/20',
    },
    info: {
      bg: 'bg-[var(--accent-light)]',
      iconBg: 'bg-[var(--accent-primary)]/20',
      iconColor: 'text-[var(--accent-primary)]',
      confirmBg: 'bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] shadow-[var(--accent-primary)]/20',
      borderColor: 'border-[var(--accent-primary)]/20',
    },
  };

  const cfg = variantConfig[variant] || variantConfig.danger;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in-quick"
        onClick={isLoading ? undefined : onCancel}
      />

      {/* Modal */}
      <div className="relative bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-3xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up">
        {/* Close button */}
        {!isLoading && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={20} />
          </button>
        )}

        {/* Icon */}
        <div className={`w-14 h-14 ${cfg.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
          <AlertTriangle size={28} className={cfg.iconColor} />
        </div>

        {/* Content */}
        <h3 className="text-lg font-black text-[var(--text-primary)] text-center mb-2">{title}</h3>
        <p className="text-sm text-[var(--text-secondary)] text-center leading-relaxed mb-6 opacity-70">{description}</p>

        {/* Actions */}
        <div className="flex gap-3">
          {showCancel && (
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-[var(--bg-main)] text-[var(--text-secondary)] rounded-xl font-bold text-sm hover:bg-[var(--accent-light)] hover:text-[var(--accent-primary)] border border-[var(--border-color)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-3 text-white rounded-xl font-extrabold text-sm transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${cfg.confirmBg}`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Procesando...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
