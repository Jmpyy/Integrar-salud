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

// ─── Request Interceptor: adjunta token ───
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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

    // Si es 401 en login o refresh o auth/me, desloguear definitivamente
    if (is401 && (url.includes('auth/me') || url.includes('auth/refresh') || url.includes('auth/login'))) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('refresh_token');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Si es 401 en cualquier otra ruta, intentar refrescar el token de forma transparente
    if (is401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');

      if (!refreshToken) {
        isRefreshing = false;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        
        // Guardar el nuevo token donde estuviera el original
        const storage = localStorage.getItem('refresh_token') ? localStorage : sessionStorage;
        storage.setItem('auth_token', data.token);
        storage.setItem('refresh_token', data.refreshToken);

        api.defaults.headers.common['Authorization'] = 'Bearer ' + data.token;
        originalRequest.headers['Authorization'] = 'Bearer ' + data.token;

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
