import api from './api';

export const authService = {
  async login(email, password, rememberMe = false) {
    const { data } = await api.post('/auth/login', { email, password, rememberMe });
    
    // Si recuerdan sesión, guardamos en localStorage (persiste al cerrar pestaña)
    // Si no, guardamos en sessionStorage (se borra al cerrar la pestaña)
    const storage = rememberMe ? localStorage : sessionStorage;
    
    // Limpiar ambos primero por si había sesión vieja
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('refresh_token');

    if (data.token) storage.setItem('auth_token', data.token);
    if (data.refreshToken) storage.setItem('refresh_token', data.refreshToken);
    
    return data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignorar errores en logout
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('refresh_token');
    }
  },

  async getSession() {
    const { data } = await api.get('/auth/me');
    return data.user;
  },

  isAuthenticated() {
    return !!(localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token'));
  },

  async changePassword(currentPassword, newPassword) {
    const { data } = await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return data;
  },

  async updateProfile(userId, profileData) {
    // Uses self-service endpoint — any authenticated role can call this
    const { data } = await api.put('/auth/update-profile', profileData);
    return data;
  },
};
