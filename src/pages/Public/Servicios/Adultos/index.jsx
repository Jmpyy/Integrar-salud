import { motion } from 'framer-motion';
import { User, Activity, Shield, ArrowRight, BrainCircuit } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

export default function AdultosPage() {
  const { config } = useOutletContext();
  const cleanPhone = config?.phone?.replace(/\D/g, '') || '541144276312';

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-indigo-100">
          <User size={40} />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-6">
          Psiquiatría y Psicoterapia para <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-500">Adultos</span>
        </h1>
        <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto">
          Un espacio seguro y libre de prejuicios para abordar los desafíos de la vida adulta con herramientas clínicas y terapéuticas.
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="prose prose-lg text-slate-600 mb-16 mx-auto leading-relaxed"
      >
        <p>
          En la etapa adulta, las presiones laborales, los conflictos vinculares o los cambios vitales pueden desencadenar síntomas que afectan profundamente nuestra calidad de vida. Como profesional con doble formación, el Dr. Vargas Rivas ofrece una evaluación minuciosa que no solo se enfoca en aliviar los síntomas a través de medicación, sino también en brindar herramientas prácticas y concretas mediante la <strong>Terapia Cognitivo Conductual (TCC)</strong>.
        </p>
        
        <h3>¿Qué problemáticas abordamos?</h3>
        <ul>
          <li><strong>Trastornos del Estado de Ánimo:</strong> Depresión, distimia y trastorno bipolar.</li>
          <li><strong>Trastornos de Ansiedad:</strong> Ataques de pánico, ansiedad generalizada, estrés postraumático y fobias.</li>
          <li><strong>Burnout y Estrés Severo:</strong> Agotamiento laboral crónico que requiere reestructuración de hábitos y eventualmente apoyo farmacológico.</li>
          <li><strong>Crisis Vitales:</strong> Duelos, separaciones, y momentos de gran incertidumbre personal.</li>
        </ul>

        <h3>¿Cómo es la primera entrevista?</h3>
        <p>
          El primer encuentro (presencial o virtual) tiene una duración extendida. El objetivo no es salir con una receta inmediatamente, sino construir una historia clínica completa, entender tu contexto actual, tus antecedentes familiares y definir en conjunto un plan de tratamiento que tenga sentido para vos.
        </p>
      </motion.div>

      {/* CTA */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="bg-slate-900 rounded-[2rem] p-10 md:p-12 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <h3 className="text-3xl font-black text-white mb-4">¿Sentís que es momento de consultar?</h3>
          <p className="text-slate-300 font-medium mb-8 max-w-xl mx-auto">
            Dar el primer paso suele ser lo más difícil. Estamos acá para acompañarte. Agendá tu primera entrevista hoy mismo.
          </p>
          <a
            href={`https://wa.me/${cleanPhone}?text=Hola%2C%20quisiera%20consultar%20por%20un%20turno%20para%20Psiquiatr%C3%ADa%20de%20Adultos`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-xl font-black hover:bg-slate-50 transition-colors"
          >
            Contactar por WhatsApp
            <ArrowRight size={20} />
          </a>
        </div>
      </motion.div>

    </div>
  );
}
