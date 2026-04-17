/**
 * Convierte una fecha local a string ISO "YYYY-MM-DD"
 * evitando problemas de timezone/offset.
 */
export function toLocalDateString(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
}

/**
 * Formatea una fecha para display en español
 */
export function formatDate(date, options = {}) {
  const d = new Date(date);
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  });
}

/**
 * Formatea fecha + hora
 */
export function formatDateTime(date) {
  const d = new Date(date);
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formatea hora "HH:MM"
 */
export function formatTime(date) {
  const d = new Date(date);
  return d.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calcula la edad correcta a partir de fecha de nacimiento
 * (considera mes y día, no solo año)
 */
export function calculateAge(birthDate) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null; // Handle Invalid Date
  
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : 0;
}

/**
 * Genera un ID único seguro (usa crypto si está disponible)
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback para entornos sin crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Genera un NHC (Número de Historia Clínica)
 */
export function generateNHC(sequence) {
  const year = new Date().getFullYear();
  const seq = String(sequence).padStart(4, '0');
  return `NHC-${year}-${seq}`;
}

/**
 * Genera un ticket de sala de espera (ej: "A-42")
 */
export function generateWaitTicket() {
  const char = String.fromCharCode(65 + Math.floor(Math.random() * 3));
  const num = Math.floor(Math.random() * 90) + 10;
  return `${char}-${num}`;
}

/**
 * Sanitiza un teléfono para WhatsApp (agrega código país si falta)
 */
export function sanitizePhone(phone, countryCode = '54') {
  const cleaned = phone.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('+')) return cleaned.replace('+', '');
  if (cleaned.startsWith(countryCode)) return cleaned;
  return `${countryCode}${cleaned}`;
}

/**
 * Crea un link de WhatsApp
 */
export function createWhatsAppLink(phone, message = '') {
  const cleanPhone = sanitizePhone(phone);
  const url = `https://wa.me/${cleanPhone}`;
  return message ? `${url}?text=${encodeURIComponent(message)}` : url;
}

/**
 * Redondea minutos al intervalo más cercano
 */
export function roundToInterval(minutes, interval = 15) {
  const remainder = minutes % interval;
  return remainder >= Math.floor(interval / 2)
    ? minutes + (interval - remainder)
    : minutes - remainder;
}
