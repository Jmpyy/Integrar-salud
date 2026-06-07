import { ArrowRight, Brain, HeartPulse, ShieldCheck, Sparkles, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import heroBg from '../../../assets/img/hero-bg.png';

export default function Hero({ config }) {
  const businessName = config?.businessName || 'Integrar Salud';
  const isDefaultName = businessName.toLowerCase().includes('integrar');

  return (
    <section className="relative min-h-[90vh] flex items-center pt-20 pb-20 overflow-hidden bg-slate-50">
      {/* Background Decor - Optimized for Performance */}
      <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[800px] h-[800px] bg-indigo-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-[600px] h-[600px] bg-emerald-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.8)_0%,transparent_100%)] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/80 backdrop-blur-md text-indigo-700 text-sm font-bold mb-8 border border-indigo-100/50 shadow-sm"
            >
              <Sparkles size={16} className="text-indigo-500" />
              <span>Salud Mental Interdisciplinaria</span>
            </motion.div>

            <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] mb-8">
              Cuidado de la Salud Mental, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500">
                a tu medida y en tu idioma.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed max-w-xl">
              Atención psiquiátrica integral para niños, adolescentes y adultos. Consultas presenciales, virtuales o en la comodidad de tu domicilio.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
              <motion.a
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href={`https://wa.me/${config?.phone?.replace(/\D/g, '') || '541144276312'}?text=${encodeURIComponent('Hola, me gustaría agendar un turno.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-8 py-4 sm:py-5 bg-[#25D366] hover:bg-[#1fb355] text-white rounded-[2rem] shadow-2xl shadow-green-500/40 transition-all flex flex-col items-center justify-center gap-1 group border-4 border-white/40 ring-4 ring-green-500/20"
              >
                <div className="flex items-center gap-3">
                  <MessageCircle size={32} fill="currentColor" className="text-white" />
                  <span className="text-xl sm:text-2xl font-black tracking-tight">Sacar Turno por WhatsApp</span>
                </div>
              </motion.a>
            </div>

          </motion.div>

          {/* Image / Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative order-first lg:order-last"
          >
            {/* Multi-layered glow - Optimized */}
            <div className="absolute inset-0 bg-indigo-600/10 rounded-[3rem] lg:rounded-[4rem] -rotate-6 translate-x-4 translate-y-4 blur-xl"></div>
            <div className="absolute inset-0 bg-emerald-500/10 rounded-[3rem] lg:rounded-[4rem] rotate-3 -translate-x-2 -translate-y-2 blur-xl"></div>

            <div className="relative rounded-[2rem] lg:rounded-[3rem] overflow-hidden shadow-2xl border border-white/50 bg-white">
              <img
                src={heroBg}
                alt={`Consultorio ${businessName}`}
                className="w-full h-[350px] lg:h-[650px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/40 via-transparent to-transparent"></div>
            </div>

            {/* Floating Glassmorphic Card */}
            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-8 -left-8 lg:-bottom-12 lg:-left-12 bg-white/70 backdrop-blur-xl p-5 lg:p-6 rounded-3xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] border border-white flex items-center gap-4 lg:gap-5 max-w-[240px] lg:max-w-[320px] hidden sm:flex"
            >
              <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
                <HeartPulse size={24} className="lg:w-8 lg:h-8" />
              </div>
              <div>
                <p className="text-[10px] lg:text-xs font-black text-indigo-600 uppercase tracking-widest mb-1">Cuidado Activo</p>
                <p className="text-sm lg:text-base font-bold text-slate-800 leading-tight">Atención integral y humana en cada sesión</p>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
