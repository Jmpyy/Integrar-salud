import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary captura errores de React en el árbol de componentes
 * y muestra una UI de recuperación en lugar de pantalla blanca.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    // Log a servicio de errores (Sentry, etc.) en producción
    if (import.meta.env.PROD) {
      console.error('[ErrorBoundary]', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;

      if (fallback) {
        return fallback(this.state.error, this.handleReset);
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl border border-red-100 p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Algo salió mal</h2>
            <p className="text-sm text-slate-500 mb-6">
              Ocurrió un error inesperado. Intentá recargar la página.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left bg-slate-50 rounded-xl p-4 mb-4 text-xs text-slate-600 max-h-40 overflow-auto">
                <summary className="font-bold cursor-pointer mb-1">Detalles técnicos</summary>
                <pre className="whitespace-pre-wrap">{this.state.error.toString()}</pre>
              </details>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw size={16} /> Recargar
              </button>
              <button
                onClick={this.handleReset}
                className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                Ir al Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
