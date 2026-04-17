import api from './api';

export const authService = {
  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    // Guardar tokens
    if (data.token) localStorage.setItem('auth_token', data.token);
    if (data.refreshToken) localStorage.setItem('refresh_token', data.refreshToken);
    return data; // { token, refreshToken, user: { id, name, email, role } }
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignorar errores en logout
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
    }
  },

  async getSession() {
    const { data } = await api.get('/auth/me');
    return data.user;
  },

  isAuthenticated() {
    return !!localStorage.getItem('auth_token');
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
