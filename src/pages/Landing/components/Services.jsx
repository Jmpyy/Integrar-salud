import { Brain, HeartPulse, Users, Star, ArrowRight } from 'lucide-react';

export default function Services() {
  const services = [
    {
      title: "Psicología Clínica",
      description: "Terapia individual, de pareja y para adolescentes. Especialistas en ansiedad, depresión y desarrollo personal.",
      icon: <Brain className="w-8 h-8" />,
      color: "bg-indigo-50 text-indigo-600",
      features: ["Terapia Cognitivo Conductual", "Acompañamiento Empático", "Sesiones Presenciales/Online"]
    },
    {
      title: "Psiquiatría",
      description: "Abordaje médico especializado para el diagnóstico y tratamiento de trastornos de salud mental.",
      icon: <HeartPulse className="w-8 h-8" />,
      color: "bg-emerald-50 text-emerald-600",
      features: ["Diagnóstico Clínico", "Seguimiento Farmacológico", "Evaluación Interdisciplinaria"]
    },
    {
      title: "Grupos de Apoyo",
      description: "Talleres y espacios grupales para el crecimiento compartido y el fortalecimiento de la red social.",
      icon: <Users className="w-8 h-8" />,
      color: "bg-amber-50 text-amber-600",
      features: ["Talleres de Mindfulness", "Grupos Terapéuticos", "Charlas Comunitarias"]
    }
  ];

  return (
    <section id="servicios" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Encabezado */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Nuestras Especialidades</h2>
          <div className="w-20 h-1.5 bg-gradient-to-r from-indigo-600 to-emerald-600 mx-auto rounded-full"></div>
          <p className="text-slate-600 mt-6 max-w-2xl mx-auto">
            Ofrecemos un enfoque integral para tu salud mental, combinando diferentes disciplinas para brindarte la mejor atención.
          </p>
        </div>

        {/* Grid de Servicios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div 
              key={index} 
              className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-indigo-100 transition-all duration-300 group"
            >
              <div className={`w-16 h-16 ${service.color} rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                {service.icon}
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">{service.title}</h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                {service.description}
              </p>
              
              <ul className="space-y-3 mb-8">
                {service.features.map((feature, fIdx) => (
                  <li key={fIdx} className="flex items-center gap-2 text-slate-500 text-sm">
                    <Star size={14} className="text-emerald-500 fill-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => window.location.href = '/login'}
                className="flex items-center gap-2 text-indigo-600 font-bold hover:gap-3 transition-all"
              >
                Saber más <ArrowRight size={18} />
              </button>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-20 bg-indigo-900 rounded-3xl p-8 md:p-12 overflow-hidden relative shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32 blur-3xl"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">Comienza tu proceso hoy mismo</h3>
              <p className="text-indigo-200">Estamos aquí para escucharte y acompañarte.</p>
            </div>
            <a
              href="https://wa.me/5491100000000?text=Hola%2C%20quisiera%20consultar%20por%20un%20turno"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-white text-indigo-900 rounded-2xl font-bold hover:bg-indigo-50 transition-colors shadow-lg inline-flex items-center gap-2"
            >
              Contactar con Recepción
              <ArrowRight size={18} />
            </a>
          </div>
        </div>

      </div>
    </section>
  );
}
