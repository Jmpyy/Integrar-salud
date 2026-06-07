import { Brain, HeartPulse, Users, Star, ArrowRight, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function Services({ config }) {
  const phone = config?.phone || '5491100000000';
  // Limpiamos el número para que solo contenga dígitos (WhatsApp lo requiere así)
  const cleanPhone = phone.replace(/\D/g, '');

  const navigate = useNavigate();

  const services = [
    {
      title: "Evaluación Integral",
      description: "Abordaje profesional para todo tipo de patologías y malestares de salud mental, adaptado a cada etapa de la vida.",
      icon: <Brain className="w-8 h-8" />,
      color: "bg-indigo-50 text-indigo-600 border-indigo-100",
      link: "/servicios/evaluacion"
    },
    {
      title: "Psiquiatría Adultos",
      description: "Un espacio seguro y libre de prejuicios para abordar los desafíos de la vida adulta con herramientas clínicas.",
      icon: <User className="w-8 h-8" />,
      color: "bg-indigo-50 text-indigo-600 border-indigo-100",
      link: "/servicios/adultos"
    },
    {
      title: "Psiquiatría Infanto-Juvenil",
      description: "Atención especializada y empática para menores de edad, brindando contención tanto al paciente como a su familia.",
      icon: <Users className="w-8 h-8" />,
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
      link: "/servicios/infanto-juvenil"
    },
    {
      title: "Tratamiento Farmacológico",
      description: "Evaluación precisa, prescripción de medicación y seguimiento continuo del tratamiento con emisión de recetas.",
      icon: <HeartPulse className="w-8 h-8" />,
      color: "bg-amber-50 text-amber-600 border-amber-100",
      link: "/servicios/farmacologia"
    },
    {
      title: "Trámites y Certificaciones",
      description: "Emisión de certificados médicos, evaluación para el CUD y documentación respaldatoria para presentismos.",
      icon: <Star className="w-8 h-8" />,
      color: "bg-sky-50 text-sky-600 border-sky-100",
      link: "/tramites"
    }
  ];

  return (
    <section id="servicios" className="py-32 bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Encabezado */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-24"
        >
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">Nuestros Servicios</h2>
          <div className="w-24 h-2 bg-gradient-to-r from-indigo-600 to-emerald-500 mx-auto rounded-full mb-8 shadow-sm"></div>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto leading-relaxed">
            Ofrecemos un enfoque integral para tu salud mental, combinando diferentes disciplinas para brindarte la mejor atención.
          </p>
        </motion.div>

        {/* Grid de Servicios */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
          {services.map((service, index) => (
            <motion.div 
              key={index} 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="bg-white p-8 lg:p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-slate-100 hover:shadow-[0_40px_80px_rgba(79,70,229,0.12)] hover:border-indigo-100 transition-all duration-500 group relative overflow-hidden flex flex-col h-full"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-slate-50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className={`w-16 h-16 lg:w-20 lg:h-20 ${service.color} border rounded-2xl lg:rounded-3xl flex items-center justify-center mb-6 lg:mb-8 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-sm shrink-0`}>
                {service.icon}
              </div>
              <h3 className="text-xl lg:text-2xl font-black text-slate-900 mb-3 tracking-tight">{service.title}</h3>
              <p className="text-slate-600 mb-8 leading-relaxed font-medium flex-1">
                {service.description}
              </p>

              <button
                onClick={() => {
                  navigate(service.link);
                  window.scrollTo(0, 0);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors mt-auto"
              >
                Ver más detalles
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mt-32 bg-slate-900 rounded-[3rem] p-10 md:p-20 overflow-hidden relative shadow-2xl"
        >
          {/* Enhanced Glassmorphic Background for CTA - Optimized */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/20 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="text-center lg:text-left max-w-xl">
              <h3 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight tracking-tight">
                Comienza tu proceso <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">hoy mismo</span>
              </h3>
              <p className="text-slate-300 text-lg font-medium leading-relaxed">
                Estamos aquí para escucharte y acompañarte en cada paso de tu camino. Tu bienestar es nuestra prioridad.
              </p>
            </div>
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href={`https://wa.me/${cleanPhone}?text=Hola%2C%20quisiera%20consultar%20por%20un%20turno`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-10 py-5 bg-white text-slate-900 rounded-[2rem] font-black hover:bg-slate-50 transition-all shadow-2xl shadow-indigo-900/50 flex items-center justify-center gap-3 text-lg group w-full lg:w-auto"
            >
              Contactar Recepción
              <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
            </motion.a>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
