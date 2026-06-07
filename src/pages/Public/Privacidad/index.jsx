import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

export default function PrivacidadPage() {
  const { config } = useOutletContext();
  const businessName = config?.businessName || 'IntegrarSalud';

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <div className="w-16 h-16 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
          <ShieldAlert size={32} />
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
          Política de <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-600 to-slate-400">Privacidad</span>
        </h1>
        <p className="text-lg text-slate-500 font-medium">
          Última actualización: {new Date().toLocaleDateString('es-AR')}
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="prose prose-lg text-slate-600 mx-auto"
      >
        <p>
          En <strong>{businessName}</strong>, valoramos profundamente su privacidad y nos comprometemos a proteger sus datos personales. Esta Política de Privacidad explica cómo recopilamos, usamos y resguardamos su información cuando utiliza nuestros servicios médicos y nuestra plataforma web.
        </p>

        <h3>1. Recopilación de Información</h3>
        <p>
          Recopilamos información personal que usted nos proporciona directamente al agendar un turno, completar formularios de contacto o durante las consultas médicas. Esto incluye, pero no se limita a:
        </p>
        <ul>
          <li>Nombre completo, DNI y fecha de nacimiento.</li>
          <li>Información de contacto (correo electrónico, número de teléfono).</li>
          <li>Historia clínica, antecedentes médicos y datos de salud mental (protegidos bajo secreto médico profesional).</li>
        </ul>

        <h3>2. Uso de la Información</h3>
        <p>
          La información recopilada se utiliza exclusivamente para:
        </p>
        <ul>
          <li>Brindar atención médica, diagnóstico y tratamiento psiquiátrico/psicológico.</li>
          <li>Gestionar turnos, recordatorios y comunicaciones administrativas.</li>
          <li>Emitir recetas, certificados y facturación.</li>
        </ul>

        <h3>3. Secreto Profesional Médico</h3>
        <p>
          Toda la información relacionada con su estado de salud, historia clínica y contenido de las sesiones terapéuticas está estrictamente protegida por el secreto profesional médico y la Ley de Protección de Datos Personales (Ley 25.326 de Argentina). No compartiremos su información clínica con terceros sin su consentimiento expreso, excepto cuando la ley lo exija.
        </p>

        <h3>4. Seguridad de los Datos</h3>
        <p>
          Implementamos medidas de seguridad técnicas y organizativas para proteger su información personal contra accesos no autorizados, pérdida, destrucción o alteración. Las videoconsultas se realizan a través de canales encriptados para garantizar la confidencialidad de la sesión.
        </p>

        <h3>5. Sus Derechos</h3>
        <p>
          Usted tiene derecho a solicitar el acceso, rectificación, actualización o supresión de sus datos personales. Para ejercer estos derechos, puede comunicarse con nosotros a través de nuestros canales de atención oficiales.
        </p>

      </motion.div>
    </div>
  );
}
