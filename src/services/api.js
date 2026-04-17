import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

/**
 * Instancia base de Axios con interceptors para auth y errores
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor: adjunta token ───
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: maneja 401 y errores ───
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Solo deslogear si falla la verificación de sesión activa (auth/me)
    // Los 401 en otras rutas (datos) NO deben cerrar la sesión automáticamente
    const url = error.config?.url || '';
    const is401 = error.response?.status === 401;

    if (is401 && (url.includes('auth/me') || url.includes('auth/refresh'))) {
      // Sesión expirada definitivamente → limpiar y redirigir
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Para el resto de errores 401 (datos con token válido pero Apache dropea la cabecera)
    // Solo loguear, NO cerrar sesión
    if (import.meta.env.DEV) {
      console.error(
        `[API Error] ${error.response?.status || 'Network'} — ${error.message}`,
        error.response?.data || error
      );
    }

    return Promise.reject(error);
  }
);

export default api;
