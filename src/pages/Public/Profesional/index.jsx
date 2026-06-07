import { motion } from 'framer-motion';
import { Award, BookOpen, Heart, Stethoscope } from 'lucide-react';
import drVargasImg from '../../../assets/img/dr-vargas.jpg';

export default function ProfesionalPage() {
  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[800px] h-[800px] bg-indigo-400/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
        
        {/* Foto Column */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, x: -20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-5 relative"
        >
          <div className="absolute inset-0 bg-indigo-600/10 rounded-[3rem] -rotate-6 translate-x-4 translate-y-4 blur-xl"></div>
          <div className="absolute inset-0 bg-emerald-500/10 rounded-[3rem] rotate-3 -translate-x-2 -translate-y-2 blur-xl"></div>
          
          <div className="relative rounded-[3rem] overflow-hidden shadow-2xl border border-white/50 bg-slate-100 aspect-[4/5] flex items-center justify-center">
            <img 
              src={drVargasImg} 
              alt="Dr. Leonardo Vargas Rivas" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
          </div>
        </motion.div>

        {/* Content Column */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="lg:col-span-7"
        >
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
            Dr. Leonardo <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-500">Vargas Rivas</span>
          </h1>
          
          <p className="text-xl text-slate-500 font-medium mb-8">
            Psiquiatra y Psicólogo Clínico
          </p>

          <div className="prose prose-lg text-slate-600 mb-10 leading-relaxed">
            <p>
              Especialista en el abordaje integral de la salud mental. Al contar con formación tanto en <strong>Psiquiatría</strong> como en <strong>Psicología Clínica</strong>, el Dr. Vargas Rivas ofrece una mirada holística y completa del paciente.
            </p>
            <p>
              Su enfoque busca entender a la persona en toda su complejidad, yendo más allá del síntoma para brindar un tratamiento verdaderamente personalizado, ya sea a través de psicoterapia con enfoque en <strong>Terapia Cognitivo Conductual (TCC)</strong>, tratamiento farmacológico, o una combinación de ambos.
            </p>
          </div>

          {/* Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-12">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <BookOpen className="text-indigo-600 mb-4" size={28} />
              <h3 className="font-black text-slate-900 text-lg mb-2">Doble Formación</h3>
              <p className="text-slate-500 text-sm">Visión médica y analítica combinadas para un diagnóstico más preciso y humano.</p>
            </div>
            <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100/50">
              <Heart className="text-emerald-600 mb-4" size={28} />
              <h3 className="font-black text-slate-900 text-lg mb-2">Trato Empático</h3>
              <p className="text-slate-500 text-sm">Un espacio seguro, de escucha activa y libre de prejuicios para cada paciente.</p>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
