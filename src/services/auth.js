import api from './api';

export const authService = {
  async login(email, password, rememberMe = false) {
    const { data } = await api.post('/auth/login', { email, password, rememberMe });
    
    // Si recuerdan sesión, guardamos en localStorage (persiste al cerrar pestaña)
    // Si no, guardamos en sessionStorage (se borra al cerrar la pestaña)
    const storage = rememberMe ? localStorage : sessionStorage;
    
    // Limpiar ambos primero por si había sesión vieja
    localStorage.removeItem('has_session');
    sessionStorage.removeItem('has_session');

    if (data.token) storage.setItem('has_session', 'true');
    
    return data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignorar errores en logout
    } finally {
      localStorage.removeItem('has_session');
      sessionStorage.removeItem('has_session');
    }
  },

  async getSession() {
    const { data } = await api.get('/auth/me');
    return data.user;
  },

  isAuthenticated() {
    return !!(localStorage.getItem('has_session') || sessionStorage.getItem('has_session'));
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
