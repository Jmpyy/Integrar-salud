import { motion } from 'framer-motion';
import { Users, Heart, Shield, ArrowRight } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

export default function InfantoJuvenilPage() {
  const { config } = useOutletContext();
  const cleanPhone = config?.phone?.replace(/\D/g, '') || '541144276312';

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-100">
          <Users size={40} />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-6">
          Psiquiatría <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-sky-500">Infanto-Juvenil</span>
        </h1>
        <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto">
          Acompañamos el neurodesarrollo de niños y adolescentes, brindando contención tanto al paciente como a su entorno familiar.
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="prose prose-lg text-slate-600 mb-16 mx-auto leading-relaxed"
      >
        <p>
          La etapa de crecimiento está llena de desafíos. A veces, las dificultades en el aprendizaje, los cambios bruscos de comportamiento o los problemas para socializar requieren de una evaluación profesional para garantizar que los más chicos tengan las mejores herramientas para desarrollarse.
        </p>
        
        <h3>¿En qué podemos ayudar?</h3>
        <ul>
          <li><strong>Neurodesarrollo:</strong> Evaluación y acompañamiento en Trastorno por Déficit de Atención e Hiperactividad (TDAH) y Condiciones del Espectro Autista (CEA).</li>
          <li><strong>Conducta y Emociones:</strong> Manejo de la impulsividad, agresividad, tics, y problemas de adaptación escolar.</li>
          <li><strong>Trastornos en Adolescentes:</strong> Depresión juvenil, ansiedad frente a exámenes, trastornos de la conducta alimentaria (TCA) y autolesiones.</li>
        </ul>

        <h3>El rol de la familia es fundamental</h3>
        <p>
          En la psiquiatría infanto-juvenil, el paciente no es solo el niño o adolescente, sino todo su entorno. Gran parte del tratamiento implica dar pautas psicoeducativas a los padres y trabajar en equipo con el colegio, psicopedagogos y terapeutas ocupacionales.
        </p>
      </motion.div>

      {/* CTA */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="bg-slate-900 rounded-[2rem] p-10 md:p-12 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <h3 className="text-3xl font-black text-white mb-4">Acompañemos su crecimiento</h3>
          <p className="text-slate-300 font-medium mb-8 max-w-xl mx-auto">
            Sacate las dudas y agendá una primera entrevista de orientación para padres o una evaluación directa.
          </p>
          <a
            href={`https://wa.me/${cleanPhone}?text=Hola%2C%20quisiera%20consultar%20por%20un%20turno%20para%20Psiquiatr%C3%ADa%20Infanto-Juvenil`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-xl font-black hover:bg-slate-50 transition-colors"
          >
            Consultar por WhatsApp
            <ArrowRight size={20} />
          </a>
        </div>
      </motion.div>

    </div>
  );
}
