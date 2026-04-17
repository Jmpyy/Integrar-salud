import { Link } from 'react-router-dom';
import { Home, ArrowLeft, AlertTriangle } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 sm:p-12 max-w-lg w-full text-center">
        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={40} className="text-indigo-400" />
        </div>
        <h1 className="text-6xl font-black text-slate-900 mb-2">404</h1>
        <h2 className="text-2xl font-bold text-slate-800 mb-3">Página no encontrada</h2>
        <p className="text-slate-500 mb-8 leading-relaxed">
          La página que buscás no existe o fue movida. Volvé al inicio para continuar.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            <Home size={16} /> Ir al Inicio
          </Link>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} /> Volver Atrás
          </button>
        </div>
      </div>
    </div>
  );
}
