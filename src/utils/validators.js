import { z } from 'zod';

// Reutilizable: email
const emailSchema = z.string().email('Email inválido').min(1, 'Email requerido');

// Reutilizable: teléfono
const phoneSchema = z.string()
  .min(6, 'Teléfono muy corto')
  .max(20, 'Teléfono muy largo')
  .regex(/^[0-9+\s()-]+$/, 'Formato de teléfono inválido');

// Reutilizable: DNI
const dniSchema = z.string()
  .min(6, 'DNI muy corto')
  .max(15, 'DNI muy largo')
  .regex(/^[0-9]+$/, 'DNI debe contener solo números');

// Reutilizable: fecha
const dateSchema = z.string().min(1, 'Fecha requerida').refine((val) => {
  const d = new Date(val);
  return !isNaN(d.getTime());
}, 'Fecha inválida');

// Login
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Contraseña requerida'),
});

// Paciente nuevo
export const patientSchema = z.object({
  name: z.string().min(2, 'Nombre requerido').max(100),
  dni: dniSchema.optional().or(z.literal('')),
  birthDate: dateSchema,
  phone: phoneSchema,
  email: emailSchema.optional().or(z.literal('')),
  gender: z.enum(['femenino', 'masculino', 'otro', 'prefiero_no_decir']),
  coverage: z.string().min(1, 'Cobertura requerida'),
  coverageNumber: z.string().optional(),
  plan: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().min(1, 'Contacto de emergencia requerido'),
  allergies: z.string().optional(),
});

// Turno (Appointment)
export const appointmentSchema = z.object({
  title: z.string().min(2, 'Motivo requerido').max(100),
  date: dateSchema,
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (HH:MM)'),
  duration: z.number().min(0.5).max(4),
  doctorId: z.number().min(1, 'Profesional requerido'),
  notes: z.string().max(500).optional(),
  patientId: z.number().min(1).optional(),
  newPatientName: z.string().min(2).optional(),
  newPatientPhone: phoneSchema.optional().or(z.literal('')),
});

// Profesional (Doctor)
export const doctorSchema = z.object({
  name: z.string().min(2, 'Nombre requerido').max(100),
  specialty: z.string().min(2, 'Especialidad requerida'),
  license: z.string().optional(),
  phone: phoneSchema.optional().or(z.literal('')),
  color: z.string(),
  remuneration: z.string().optional(),
  remunerationType: z.enum(['fijo', 'porcentaje']),
});

// Personal administrativo
export const adminStaffSchema = z.object({
  name: z.string().min(2, 'Nombre requerido').max(100),
  role: z.enum(['Recepcionista', 'Secretaría', 'Administración', 'Coordinación']),
  shift: z.enum(['Mañana', 'Tarde', 'Doble Turno']),
  phone: phoneSchema.optional().or(z.literal('')),
  remuneration: z.string().optional(),
  remunerationType: z.enum(['fijo', 'porcentaje']),
});

// Transacción / Gasto
export const transactionSchema = z.object({
  category: z.string().min(1, 'Categoría requerida'),
  amount: z.string().min(1, 'Monto requerido').refine((val) => {
    const n = Number(val);
    return !isNaN(n) && n > 0;
  }, 'Monto debe ser mayor a 0'),
  date: dateSchema,
  method: z.string().min(1, 'Método requerido'),
  receipt: z.string().optional(),
  notes: z.string().optional(),
});

// Nota SOAP (Historia clínica)
export const soapNoteSchema = z.object({
  subjective: z.string().max(2000).optional(),
  objective: z.string().max(2000).optional(),
  analysis: z.string().max(2000).optional(),
  plan: z.string().max(2000).optional(),
}).refine((data) => {
  return data.subjective || data.objective || data.analysis || data.plan;
}, {
  message: 'Al menos un campo SOAP debe completarse',
});

// Aclaración a nota SOAP
export const aclaracionSchema = z.object({
  content: z.string().min(1, 'Contenido requerido').max(2000),
});

// Medicación
export const medicationSchema = z.object({
  drug: z.string().min(1, 'Nombre del fármaco requerido'),
  dose: z.string().min(1, 'Dosis requerida'),
  frequency: z.string().min(1, 'Frecuencia requerida'),
});
