import { motion } from 'framer-motion';
import { HeartPulse, Activity, Shield, ArrowRight } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

export default function FarmacologiaPage() {
  const { config } = useOutletContext();
  const cleanPhone = config?.phone?.replace(/\D/g, '') || '541144276312';

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-amber-100">
          <HeartPulse size={40} />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-6">
          Tratamiento <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">Farmacológico</span>
        </h1>
        <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto">
          Evaluación precisa, prescripción responsable y seguimiento estricto para recuperar tu estabilidad emocional y química.
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="prose prose-lg text-slate-600 mb-16 mx-auto leading-relaxed"
      >
        <p>
          Existe mucho estigma y miedo alrededor de la medicación psiquiátrica. Frases como "me van a dejar sedado" o "voy a depender de pastillas toda la vida" son preocupaciones muy comunes. El abordaje del Dr. Vargas Rivas se basa en la psicoeducación: explicarte exactamente qué vas a tomar, por qué, y qué esperar.
        </p>
        
        <h3>Mitos vs. Realidades</h3>
        <ul>
          <li><strong>Mito:</strong> La medicación cambia tu personalidad. <br/><strong>Realidad:</strong> La medicación moderna busca restaurar el equilibrio químico de tu cerebro para que vuelvas a ser vos mismo, no para sedarte.</li>
          <li><strong>Mito:</strong> Es un tratamiento de por vida. <br/><strong>Realidad:</strong> Muchos tratamientos son temporales (ej. para superar una crisis depresiva aguda o un pico de estrés) y se retiran gradualmente cuando el paciente adquiere las herramientas terapéuticas necesarias.</li>
        </ul>

        <h3>Seguimiento y Titulación</h3>
        <p>
          Encontrar el medicamento y la dosis exacta para cada paciente es un proceso artesanal ("titulación"). Esto requiere controles médicos periódicos para evaluar la respuesta clínica, monitorear efectos secundarios y hacer ajustes finos hasta alcanzar el bienestar óptimo.
        </p>
        <p>
          Además, contamos con la emisión de <strong>Recetas en formato físico</strong> para facilitar tu tratamiento, las cuales se entregan exclusivamente en el consultorio.
        </p>
      </motion.div>

      {/* CTA */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="bg-slate-900 rounded-[2rem] p-10 md:p-12 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-amber-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <h3 className="text-3xl font-black text-white mb-4">Iniciá tu tratamiento con confianza</h3>
          <p className="text-slate-300 font-medium mb-8 max-w-xl mx-auto">
            Sacate todos los miedos en una consulta de evaluación. Estamos para ayudarte a sentirte bien de nuevo.
          </p>
          <a
            href={`https://wa.me/${cleanPhone}?text=Hola%2C%20quisiera%20consultar%20por%20evaluaci%C3%B3n%20para%20Tratamiento%20Farmacol%C3%B3gico`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-xl font-black hover:bg-slate-50 transition-colors"
          >
            Agendar Evaluación
            <ArrowRight size={20} />
          </a>
        </div>
      </motion.div>

    </div>
  );
}
