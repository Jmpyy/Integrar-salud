import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function FloatingWhatsApp({ phone = '541144276312' }) {
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const location = useLocation();

  const cleanPhone = phone.replace(/\D/g, '');

  useEffect(() => {
    // Retrasar la aparición del botón para que no interrumpa la carga inicial
    const timer = setTimeout(() => {
      setIsVisible(true);
      setShowTooltip(true);
      
      // Ocultar el tooltip después de unos segundos
      setTimeout(() => setShowTooltip(false), 5000);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Mensaje personalizado según la ruta
  const getMessage = () => {
    if (location.pathname.includes('/servicios/infanto-juvenil')) {
      return "Hola, quisiera consultar por un turno para Psiquiatría Infanto-Juvenil.";
    }
    if (location.pathname.includes('/servicios/adultos')) {
      return "Hola, quisiera consultar por un turno para Psiquiatría de Adultos.";
    }
    if (location.pathname.includes('/servicios/farmacologia')) {
      return "Hola, quisiera consultar por una evaluación para Tratamiento Farmacológico.";
    }
    if (location.pathname.includes('/servicios/evaluacion')) {
      return "Hola, quisiera consultar por una Evaluación Integral.";
    }
    if (location.pathname.includes('/tramites')) {
      return "Hola, quisiera hacer una consulta sobre Trámites / CUD.";
    }
    return "Hola, quisiera hacer una consulta para reservar un turno.";
  };

  const handleClick = () => {
    const text = encodeURIComponent(getMessage());
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed bottom-6 right-6 z-50 flex items-end justify-end flex-col gap-4">
          
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className="bg-white px-4 py-3 rounded-2xl shadow-xl shadow-black/10 border border-slate-100 relative max-w-[200px]"
              >
                <button 
                  onClick={() => setShowTooltip(false)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-300 hover:text-slate-700 transition-colors"
                >
                  <X size={12} />
                </button>
                <p className="text-sm font-semibold text-slate-700 leading-tight">
                  ¿Necesitás un turno? ¡Escribinos! 👋
                </p>
                <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-b border-r border-slate-100 rotate-45"></div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleClick}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="w-16 h-16 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-lg shadow-[#25D366]/30 hover:shadow-[#25D366]/50 transition-shadow group relative"
          >
            <div className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20"></div>
            <MessageCircle size={32} className="relative z-10" />
          </motion.button>

        </div>
      )}
    </AnimatePresence>
  );
}
