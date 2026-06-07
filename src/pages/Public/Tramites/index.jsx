import { motion } from 'framer-motion';
import { FileSignature, BadgeCheck, Bus, ShieldPlus, Landmark, FileText, Download } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

export default function TramitesPage() {
  const { config } = useOutletContext();
  const cleanPhone = config?.phone?.replace(/\D/g, '') || '541144276312';

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-3xl mx-auto mb-16"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-sky-50 text-sky-700 text-sm font-bold mb-6 border border-sky-100/50">
          <FileSignature size={16} className="text-sky-500" />
          <span>Gestión Administrativa</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-6">
          Trámites Médicos y <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-indigo-600">Certificaciones</span>
        </h1>
        <p className="text-lg text-slate-500 font-medium leading-relaxed">
          Facilitamos toda la documentación necesaria para acompañar tu tratamiento, 
          gestionada de forma rápida, oficial y segura por nuestro equipo médico.
        </p>
      </motion.div>

      {/* CUD Section (Estrella) */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border-2 border-indigo-100 rounded-[3rem] p-8 md:p-12 shadow-2xl shadow-indigo-100/50 mb-12 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-600/30">
              <BadgeCheck size={32} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">
              Certificado Único de Discapacidad (CUD)
            </h2>
            <p className="text-slate-600 text-lg mb-6 leading-relaxed">
              El Dr. Vargas Rivas está capacitado para evaluar, diagnosticar y completar todas las planillas y estudios oficiales requeridos por las juntas médicas para que puedas tramitar tu CUD.
            </p>
            <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
              <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                <ShieldPlus size={20} className="text-indigo-600" /> Beneficios del CUD:
              </h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-slate-700 font-medium">
                  <Bus className="shrink-0 text-indigo-500 mt-0.5" size={18} />
                  Pase libre en transporte público de pasajeros.
                </li>
                <li className="flex items-start gap-3 text-slate-700 font-medium">
                  <Landmark className="shrink-0 text-indigo-500 mt-0.5" size={18} />
                  Cobertura al 100% en las prestaciones para tu discapacidad.
                </li>
                <li className="flex items-start gap-3 text-slate-700 font-medium">
                  <Download className="shrink-0 text-indigo-500 mt-0.5" size={18} />
                  Exenciones de algunos impuestos y asignaciones familiares.
                </li>
              </ul>
            </div>
          </div>
          
          <div className="bg-slate-900 rounded-[2rem] p-8 text-center text-white relative">
            <h3 className="text-xl font-bold mb-4">¿Necesitás iniciar el trámite?</h3>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              Agendá una consulta presencial o virtual para evaluar tu caso clínico. Si corresponde, el doctor preparará la documentación completa para que presentes en tu municipio.
            </p>
            <a
              href={`https://wa.me/${cleanPhone}?text=Hola%2C%20quisiera%20consultar%20por%20un%20turno%20para%20evaluaci%C3%B3n%20CUD`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-black transition-colors"
            >
              Consultar por turno CUD
            </a>
          </div>
        </div>
      </motion.div>

      {/* Otros Trámites */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-50 border border-slate-100 p-8 rounded-[2rem]"
        >
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
            <FileText size={24} />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-3">Renovación de Recetas</h3>
          <p className="text-slate-600 leading-relaxed font-medium mb-4">
            Emisión de recetas para la continuidad de tu tratamiento farmacológico. Las mismas se entregan en formato físico (papel).
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-50 border border-slate-100 p-8 rounded-[2rem]"
        >
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-6">
            <FileSignature size={24} />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-3">Certificados Médicos</h3>
          <p className="text-slate-600 leading-relaxed font-medium mb-4">
            Otorgamos aptos físicos y certificados de salud mental. Por disposición médica, <strong>no emitimos certificados digitales</strong>, todos los certificados se entregan exclusivamente en formato físico en el consultorio.
          </p>
        </motion.div>
      </div>

    </div>
  );
}
