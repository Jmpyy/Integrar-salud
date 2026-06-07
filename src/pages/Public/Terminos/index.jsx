import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

export default function TerminosPage() {
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
          <FileText size={32} />
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
          Términos de <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-600 to-slate-400">Servicio</span>
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
          Bienvenido a <strong>{businessName}</strong>. Al solicitar nuestros servicios médicos, agendar un turno o utilizar nuestra plataforma web, usted acepta los siguientes Términos de Servicio. Le pedimos que los lea detenidamente.
        </p>

        <h3>1. Naturaleza del Servicio</h3>
        <p>
          Brindamos servicios de atención médica especializada en Psiquiatría y Psicología Clínica de forma presencial y virtual. Las consultas son de carácter privado y particular.
        </p>

        <h3>2. Agendamiento y Asistencia</h3>
        <ul>
          <li>Los turnos deben ser solicitados y confirmados previamente a través de nuestros canales oficiales (WhatsApp).</li>
          <li>Se requiere puntualidad para no afectar la atención de los pacientes posteriores. En caso de llegar tarde, el tiempo de la sesión se reducirá en consecuencia, no siendo posible extenderla más allá del horario pautado.</li>
        </ul>

        <h3>3. Política de Cancelación y Reprogramación</h3>
        <p>
          Si no puede asistir a su turno, le solicitamos que nos avise con un mínimo de <strong>24 horas de anticipación</strong>. Las cancelaciones con menor tiempo de aviso o las inasistencias sin previo aviso podrán implicar el cobro total o parcial del valor de la consulta, o la necesidad de abonar el turno por adelantado para futuras reservas.
        </p>

        <h3>4. Pagos y Reintegros</h3>
        <p>
          Los honorarios de la consulta deberán abonarse mediante los métodos de pago habilitados antes o inmediatamente después de la sesión, según se haya acordado. Emitimos factura por la prestación de servicios, la cual usted podrá presentar ante su Obra Social o Medicina Prepaga para gestionar el reintegro, sujeto a las condiciones de su plan de cobertura.
        </p>

        <h3>5. Emergencias Médicas</h3>
        <p>
          Nuestros canales de comunicación (WhatsApp, correo electrónico) <strong>no son servicios de atención de emergencias</strong>. Si usted o un familiar se encuentra en una situación de riesgo inminente, debe dirigirse a la guardia médica psiquiátrica más cercana o comunicarse con los servicios de emergencia de su localidad (ej. 107 en Argentina).
        </p>

        <h3>6. Recetas y Certificados</h3>
        <p>
          La emisión de recetas y certificados médicos es un acto profesional que requiere evaluación clínica. El médico no está obligado a emitir prescripciones o certificados si considera que no hay criterio clínico que lo justifique.
        </p>

      </motion.div>
    </div>
  );
}
