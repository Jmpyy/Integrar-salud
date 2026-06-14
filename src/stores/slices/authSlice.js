import { authService } from '../../services/auth';

const getNormalizedRole = (role) => {
  if (!role) return 'recepcion';
  const r = role.toLowerCase();
  if (r.includes('admin') || r.includes('coordinación') || r.includes('coordinacion')) return 'admin';
  if (r.includes('secretaría') || r.includes('secretaria') || r.includes('recepción') || r.includes('recepcion') || r.includes('recepcionista')) return 'recepcion';
  if (r.includes('medico') || r.includes('médico') || r.includes('doctor')) return 'medico';
  return role;
};

export const createAuthSlice = (set, get) => ({
  user: null,
  userRole: null, // 'medico' | 'recepcion' | 'admin'
  isAuthenticated: false,
  theme: localStorage.getItem('theme') || 'light',
  authLoading: false,
  authError: null,

  toggleTheme: () => {
    const nextTheme = get().theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    set({ theme: nextTheme });
  },

  initTheme: () => {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },

  setUser: (updatedUser) => set({ user: updatedUser }),

  auth: {
    login: async (email, password, rememberMe) => {
      set({ authLoading: true, authError: null });
      try {
        const data = await authService.login(email, password, rememberMe);
        set({
          user: data.user,
          userRole: getNormalizedRole(data.user.role),
          isAuthenticated: true,
          authLoading: false,
        });
        return data;
      } catch (error) {
        set({
          authLoading: false,
          authError: error.response?.data?.message || 'Error al iniciar sesión',
        });
        throw error;
      }
    },

    logout: async () => {
      await authService.logout();
      set({ user: null, userRole: null, isAuthenticated: false });
    },

    initSession: async () => {
      if (!authService.isAuthenticated()) return;
      try {
        const user = await authService.getSession();
        set({ user, userRole: getNormalizedRole(user.role), isAuthenticated: true });
      } catch {
        // Token inválido o expirado → limpiar COMPLETAMENTE (estado + storage)
        localStorage.removeItem('has_session');
        sessionStorage.removeItem('has_session');
        set({ user: null, userRole: null, isAuthenticated: false });
      }
    },
  },
});
