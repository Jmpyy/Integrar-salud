import { motion } from 'framer-motion';
import { HelpCircle, ChevronDown, CalendarCheck, CreditCard, Video } from 'lucide-react';
import { useState } from 'react';

export default function InfoPage() {
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      q: "¿Atienden por Obra Social o Prepagas?",
      a: "La atención es de forma particular. Sin embargo, emitimos factura para que puedas solicitar el reintegro correspondiente en tu Obra Social o Prepaga, si tu plan lo contempla."
    },
    {
      q: "¿Cómo funciona la modalidad de Videoconsulta?",
      a: "Contamos con una plataforma propia (Sala Virtual). Una vez confirmado tu turno, recibirás un 'Acceso Mágico' por WhatsApp. No necesitás descargar ni instalar ninguna aplicación; simplemente hacés clic en el link desde tu celular o computadora y entrás directo a la videollamada."
    },
    {
      q: "¿Qué necesito para la primera consulta?",
      a: "Es recomendable tener a mano estudios médicos previos, historias clínicas anteriores y el listado de cualquier medicación que estés tomando actualmente. También te sugerimos estar en un lugar tranquilo y con buena conexión a internet si la consulta es virtual."
    },
    {
      q: "¿Cómo es la política de cancelación?",
      a: "Te pedimos que si no podés asistir o conectarte a tu turno, nos avises con al menos 24 horas de anticipación. Esto nos permite ofrecerle el espacio a otro paciente que lo necesite."
    }
  ];

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-3xl mx-auto mb-20"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-50 text-indigo-700 text-sm font-bold mb-6 border border-indigo-100/50">
          <HelpCircle size={16} className="text-indigo-500" />
          <span>Información al Paciente</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-6">
          ¿Cómo funciona <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-500">nuestro servicio?</span>
        </h1>
      </motion.div>

      {/* Timeline (Cómo funciona) */}
      <div className="mb-24">
        <h2 className="text-2xl font-black text-slate-900 mb-12 text-center">3 pasos para tu atención</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Línea conectora (solo visible en desktop) */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 z-0"></div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative z-10 bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/20 text-center"
          >
            <div className="w-16 h-16 mx-auto bg-indigo-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-200">
              <CalendarCheck size={32} />
            </div>
            <div className="absolute -top-4 -right-4 w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-lg border-4 border-white">1</div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Reservá tu Turno</h3>
            <p className="text-slate-500 font-medium">Contactanos por WhatsApp para consultar disponibilidad y coordinar el día y horario que mejor te quede.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative z-10 bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/20 text-center"
          >
            <div className="w-16 h-16 mx-auto bg-emerald-500 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-200">
              <CreditCard size={32} />
            </div>
            <div className="absolute -top-4 -right-4 w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-lg border-4 border-white">2</div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Aboná la Consulta</h3>
            <p className="text-slate-500 font-medium">Una vez confirmado, te enviaremos los datos para realizar la transferencia o el link de pago seguro.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative z-10 bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/20 text-center"
          >
            <div className="w-16 h-16 mx-auto bg-sky-500 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-sky-200">
              <Video size={32} />
            </div>
            <div className="absolute -top-4 -right-4 w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-lg border-4 border-white">3</div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Comenzá tu Sesión</h3>
            <p className="text-slate-500 font-medium">Acercate al consultorio físico o entrá al link mágico de nuestra Sala Virtual desde tu celular o PC.</p>
          </motion.div>
        </div>
      </div>

      {/* Preguntas Frecuentes */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-black text-slate-900 mb-8 text-center">Preguntas Frecuentes</h2>
        
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden"
            >
              <button 
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 focus:outline-none"
              >
                <span className="font-bold text-slate-800 text-lg">{faq.q}</span>
                <ChevronDown 
                  className={`text-slate-400 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} 
                  size={20} 
                />
              </button>
              
              {openFaq === index && (
                <div className="px-6 pb-5 text-slate-600 font-medium leading-relaxed border-t border-slate-100/50 pt-4">
                  {faq.a}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

    </div>
  );
}
