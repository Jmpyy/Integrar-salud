import { Globe, MapPin, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Features({ config }) {
  const features = [
    {
      title: "Atención Trilingüe",
      description: "Consultas en Español, Inglés y Portugués.",
      icon: <Globe className="w-8 h-8" />,
      color: "text-indigo-600",
      bg: "bg-indigo-50/50",
      border: "border-indigo-100"
    },
    {
      title: "Triple Modalidad",
      description: "Presencial, Videoconsulta o a Domicilio.",
      icon: <MapPin className="w-8 h-8" />,
      color: "text-emerald-600",
      bg: "bg-emerald-50/50",
      border: "border-emerald-100"
    },
    {
      title: "Gestión Integral",
      description: "Recetas, aptos físicos y certificados de discapacidad.",
      icon: <FileText className="w-8 h-8" />,
      color: "text-amber-600",
      bg: "bg-amber-50/50",
      border: "border-amber-100"
    }
  ];

  return (
    <section id="especialistas" className="py-24 bg-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-100 to-transparent"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            Nuestros Diferenciales
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((item, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5 }} 
              className="flex flex-col items-center text-center p-8 rounded-[2rem] border border-slate-100 bg-white shadow-xl shadow-slate-200/20 hover:shadow-2xl hover:shadow-slate-200/40 transition-all group"
            >
              <div className={`w-20 h-20 ${item.bg} ${item.color} ${item.border} border rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform`}>
                {item.icon}
              </div>
              <h4 className="font-black text-slate-900 mb-3 text-xl">{item.title}</h4>
              <p className="text-base text-slate-600 leading-relaxed font-medium">{item.description}</p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
