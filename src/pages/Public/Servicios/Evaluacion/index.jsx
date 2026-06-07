import { motion } from 'framer-motion';
import { Brain, Search, ClipboardList, ArrowRight } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

export default function EvaluacionPage() {
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
          <Brain size={40} />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-6">
          Evaluación <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-500">Integral y Psicodiagnóstico</span>
        </h1>
        <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto">
          Diagnósticos precisos basados en evidencia científica para guiar tu tratamiento o presentar ante instituciones.
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="prose prose-lg text-slate-600 mb-16 mx-auto leading-relaxed"
      >
        <p>
          Un buen tratamiento comienza con un diagnóstico diferencial correcto. Muchas patologías comparten síntomas (por ejemplo, la falta de concentración puede deberse a TDAH, a un cuadro de ansiedad, o a una depresión subyacente). La evaluación integral permite despejar estas dudas mediante un enfoque sistemático.
        </p>
        
        <h3>¿En qué consiste el proceso?</h3>
        <ul>
          <li><strong>Entrevistas Clínicas:</strong> Una serie de encuentros donde exploramos en profundidad la historia vital, antecedentes médicos y psiquiátricos, y la configuración sintomatológica actual.</li>
          <li><strong>Aplicación de Test y Escalas:</strong> Utilización de herramientas psicométricas validadas internacionalmente para medir niveles de ansiedad, depresión, rasgos de personalidad y funciones cognitivas.</li>
          <li><strong>Informes Interdisciplinarios:</strong> Redacción de informes detallados para derivaciones, instituciones educativas, licencias laborales o juntas médicas.</li>
        </ul>

        <h3>¿Por qué elegir un diagnóstico con doble mirada?</h3>
        <p>
          Al ser Psiquiatra y Psicólogo Clínico, el Dr. Vargas Rivas tiene la capacidad de evaluar tanto el componente orgánico/neurobiológico de los síntomas, como los factores psicodinámicos y vinculares, ofreciendo un mapa diagnóstico muchísimo más rico y preciso que el de una evaluación estándar.
        </p>
      </motion.div>

      {/* CTA */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="bg-slate-900 rounded-[2rem] p-10 md:p-12 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <h3 className="text-3xl font-black text-white mb-4">Empezá con certezas</h3>
          <p className="text-slate-300 font-medium mb-8 max-w-xl mx-auto">
            Evitá tratamientos genéricos. Agenda una evaluación integral para saber exactamente dónde estás parado y cómo avanzar.
          </p>
          <a
            href={`https://wa.me/${cleanPhone}?text=Hola%2C%20quisiera%20consultar%20por%20una%20Evaluaci%C3%B3n%20Integral`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-xl font-black hover:bg-slate-50 transition-colors"
          >
            Agendar Entrevista
            <ArrowRight size={20} />
          </a>
        </div>
      </motion.div>

    </div>
  );
}
