// App-wide constants

export const BUSINESS_HOURS = {
  START: 6,
  END: 22,
  PIXELS_PER_HOUR: 96,
};

export const TIME_SLOT_ROUNDING = 15; // minutes

export const APPOINTMENT_DURATIONS = [
  { value: 0.5, label: '30 min' },
  { value: 1, label: '1 hora' },
  { value: 1.5, label: '1h 30min' },
  { value: 2, label: '2 horas' },
];

export const COVERAGE_OPTIONS = [
  'Particular',
  'OSDE',
  'Swiss Medical',
  'Galeno',
  'Sancor Salud',
];

export const ADMIN_ROLES = [
  'Recepcionista',
  'Secretaría',
  'Administración',
  'Coordinación',
];

export const ADMIN_SHIFTS = [
  'Mañana',
  'Tarde',
  'Doble Turno',
];

export const EXPENSE_CATEGORIES = [
  'Sueldos y Honorarios',
  'Insumos Médicos',
  'Mantenimiento e Infraestructura',
  'Servicios (Luz/Internet)',
  'Otros Gastos',
];

export const PAYMENT_METHODS = [
  'Efectivo',
  'Transferencia',
  'Tarjeta de Crédito',
  'Tarjeta de Débito',
  'Cheque',
];

export const DOCTOR_COLORS = [
  { id: 'indigo', bg: 'bg-indigo-500', text: 'text-indigo-700', light: 'bg-indigo-50' },
  { id: 'esmeralda', bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50' },
  { id: 'purpura', bg: 'bg-purple-500', text: 'text-purple-700', light: 'bg-purple-50' },
  { id: 'naranja', bg: 'bg-orange-500', text: 'text-orange-700', light: 'bg-orange-50' },
  { id: 'rojo', bg: 'bg-rose-500', text: 'text-rose-700', light: 'bg-rose-50' },
  { id: 'celeste', bg: 'bg-sky-500', text: 'text-sky-700', light: 'bg-sky-50' },
];

export const APPOINTMENT_STATUS = {
  AGENDADO: 'agendado',
  CONFIRMADO: 'confirmado',
  EN_ESPERA: 'en_espera',
  EN_CURSO: 'en_curso',
  FINALIZADO: 'finalizado',
  AUSENTE: 'ausente',
};

export const GENDER_OPTIONS = [
  'femenino',
  'masculino',
  'otro',
  'prefiero_no_decir',
];

export const REMUNERATION_TYPES = {
  FIJO: 'fijo',
  PORCENTAJE: 'porcentaje',
};

export const USER_ROLES = {
  MEDICO: 'medico',
  RECEPCION: 'recepcion',
  ADMIN: 'admin',
};

export const NHC_YEAR = new Date().getFullYear();

export const WHATSAPP_COUNTRY_CODE = '54';
