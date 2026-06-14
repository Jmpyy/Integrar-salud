import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://control.integrarsalud.me/api-integrar/api';

/**
 * Instancia base de Axios con interceptors para auth y errores
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true, // Envía cookies HttpOnly automáticamente (auth_token, refresh_token)
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor ───
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ─── Response Interceptor: maneja 401 y errores ───
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url || '';
    const is401 = error.response?.status === 401;

    // Si falla el login (401 o 429), simplemente devolvemos el error al componente
    if (url.includes('auth/login')) {
      return Promise.reject(error);
    }

    // Si es 401 en refresh o auth/me, desloguear definitivamente
    if (is401 && (url.includes('auth/me') || url.includes('auth/refresh'))) {
      localStorage.removeItem('has_session');
      sessionStorage.removeItem('has_session');
      window.location.href = '/#/login';
      return Promise.reject(error);
    }

    // Si es 401 en cualquier otra ruta, intentar refrescar el token de forma transparente
    if (is401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const hasSession = localStorage.getItem('has_session') || sessionStorage.getItem('has_session');

      if (!hasSession) {
        isRefreshing = false;
        localStorage.removeItem('has_session');
        sessionStorage.removeItem('has_session');
        window.location.href = '/#/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        
        // El backend responde con Set-Cookie, así que la sesión se mantiene
        const storage = localStorage.getItem('has_session') ? localStorage : sessionStorage;
        storage.setItem('has_session', 'true');

        // Note: No more Authorization header logic!

        processQueue(null, data.token);
        isRefreshing = false;
        
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        isRefreshing = false;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(err);
      }
    }

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
