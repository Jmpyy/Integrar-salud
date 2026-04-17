import { ArrowRight, Brain, HeartPulse, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <section className="relative pt-20 pb-32 overflow-hidden bg-white">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-indigo-50 rounded-full blur-3xl opacity-50 select-none pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-80 h-80 bg-emerald-50 rounded-full blur-3xl opacity-50 select-none pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge Superior */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-semibold mb-8 border border-indigo-100 animate-fade-in-quick">
            <ShieldCheck size={16} />
            <span>Consultorio Interdisciplinario de Salud Mental</span>
          </div>

          {/* Título Principal */}
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6 animate-fade-in-up">
            Cuidando tu bienestar <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-600">integral</span>
          </h1>

          {/* Descripción */}
          <p className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            En Integrar Salud, combinamos la <strong>Psicología</strong> y la <strong>Psiquiatría</strong> para ofrecerte un acompañamiento humano, profesional y efectivo en tu camino hacia el equilibrio emocional.
          </p>

          {/* Botones de Acción */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <a 
              href="#servicios" 
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              Nuestros Servicios
              <ArrowRight size={20} />
            </a>
            <Link 
              to="/login" 
              className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
            >
              Acceso Staff
            </Link>
          </div>

          {/* Features Rápidas */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-20 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            <div className="flex items-center justify-center gap-3 text-slate-500">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-indigo-600">
                <Brain size={24} />
              </div>
              <span className="font-medium">Psicología</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-slate-500">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-emerald-600">
                <HeartPulse size={24} />
              </div>
              <span className="font-medium">Psiquiatría</span>
            </div>
            <div className="hidden md:flex items-center justify-center gap-3 text-slate-500">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-indigo-500">
                <ShieldCheck size={24} />
              </div>
              <span className="font-medium">Confidencialidad</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
