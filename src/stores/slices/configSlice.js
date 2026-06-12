import api from '../../services/api';
import logger from '../../utils/logger';

export const createConfigSlice = (set, get) => ({
  // ─── Global Config ───
  globalConfig: (() => {
    try {
      const saved = localStorage.getItem('consultorio_config');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  })(),

  setGlobalConfig: async (config) => {
    localStorage.setItem('consultorio_config', JSON.stringify(config));
    set({ globalConfig: config });
    try {
      await api.post('/settings', config);
    } catch (err) {
      logger.error('Error persisting config to server:', err);
    }
  },

  fetchGlobalConfig: async () => {
    // 1. Carga rápida desde localStorage
    try {
      const saved = localStorage.getItem('consultorio_config');
      if (saved) set({ globalConfig: JSON.parse(saved) });
    } catch (err) {
      logger.error('Error fetching local config:', err);
    }

    // 2. Sincronización real desde el servidor
    try {
      const res = await api.get('/settings');
      if (res.data.config && Object.keys(res.data.config).length > 0) {
        set({ globalConfig: res.data.config });
        localStorage.setItem('consultorio_config', JSON.stringify(res.data.config));
      }
    } catch (err) {
      logger.error('Error fetching server config:', err);
    }
  },

  // ─── Dashboard Notes ───
  dashboardNote: '',
  fetchDashboardNote: async () => {
    try {
      const res = await api.get('/notes/');
      set({ dashboardNote: res.data.content || '' });
    } catch (err) {
      logger.error('Error fetching note:', err);
    }
  },

  updateDashboardNote: async (content) => {
    try {
      await api.post('/notes/', { content });
      set({ dashboardNote: content });
    } catch (err) {
      logger.error('Error updating note:', err);
    }
  },

  // ─── Users Management ───
  users: [],
  fetchUsers: async () => {
    try {
      const res = await api.get('/users');
      set({ users: res.data.users });
    } catch (err) {
      logger.error('Error fetching users:', err);
    }
  },

  createUser: async (userData) => {
    await api.post('/users', userData);
    get().fetchUsers();
  },

  updateUser: async (id, data) => {
    await api.put(`/users/${id}`, data);
    get().fetchUsers();
  },

  deleteUser: async (id) => {
    await api.delete(`/users/${id}`);
    get().fetchUsers();
  },
});
