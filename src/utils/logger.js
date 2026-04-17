/**
 * Logger simple con niveles para debug de API calls
 */

const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LEVEL = import.meta.env.DEV ? 'debug' : 'error';

function formatMessage(level, message) {
  const timestamp = new Date().toLocaleTimeString('es-ES');
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
}

export const logger = {
  debug(message, ...args) {
    if (LEVELS[CURRENT_LEVEL] <= LEVELS.debug) {
      console.debug(formatMessage('debug', message), ...args);
    }
  },

  info(message, ...args) {
    if (LEVELS[CURRENT_LEVEL] <= LEVELS.info) {
      console.info(formatMessage('info', message), ...args);
    }
  },

  warn(message, ...args) {
    if (LEVELS[CURRENT_LEVEL] <= LEVELS.warn) {
      console.warn(formatMessage('warn', message), ...args);
    }
  },

  error(message, ...args) {
    if (LEVELS[CURRENT_LEVEL] <= LEVELS.error) {
      console.error(formatMessage('error', message), ...args);
    }
  },
};

export default logger;
