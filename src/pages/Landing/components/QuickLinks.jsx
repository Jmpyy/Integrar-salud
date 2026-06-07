import { motion } from 'framer-motion';
import { User, FileText, Info, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function QuickLinks() {
  const links = [
    {
      title: "Sobre el Profesional",
      description: "Conocé la trayectoria y el enfoque terapéutico del Dr. Leonardo Vargas Rivas.",
      icon: <User className="w-8 h-8" />,
      color: "bg-indigo-50 text-indigo-600 border-indigo-100",
      to: "/profesional"
    },
    {
      title: "Trámites y CUD",
      description: "Información sobre recetas, aptos físicos y evaluación para el Certificado Único de Discapacidad.",
      icon: <FileText className="w-8 h-8" />,
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
      to: "/tramites"
    },
    {
      title: "Información al Paciente",
      description: "¿Cómo agendar? Modalidad virtual, políticas de cancelación y respuestas a dudas frecuentes.",
      icon: <Info className="w-8 h-8" />,
      color: "bg-sky-50 text-sky-600 border-sky-100",
      to: "/info"
    }
  ];

  return (
    <section className="py-20 bg-white relative z-20 -mt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {links.map((link, index) => (
            <Link key={index} to={link.to}>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(79,70,229,0.08)] hover:border-indigo-100 transition-all duration-300 group flex flex-col h-full cursor-pointer"
              >
                <div className={`w-14 h-14 ${link.color} border rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 shrink-0`}>
                  {link.icon}
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-3">{link.title}</h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed mb-6 flex-1">
                  {link.description}
                </p>
                <div className="flex items-center gap-2 text-sm font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0 duration-300">
                  Ver más <ArrowRight size={16} />
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
