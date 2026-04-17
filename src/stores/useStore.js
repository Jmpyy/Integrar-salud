import { create } from 'zustand';
import { authService } from '../services/auth';
import { patientsService } from '../services/patients';
import { appointmentsService } from '../services/appointments';
import { doctorsService } from '../services/doctors';
import { staffService } from '../services/staff';
import { transactionsService } from '../services/transactions';
import { filesService } from '../services/files';
import api from '../services/api';

/**
 * Store global de la aplicación.
 * Reemplaza el prop drilling de App.jsx -> DashboardLayout -> páginas.
 *
 * Cada slice tiene:
 *  - datos (array/valor)
 *  - loading (bool)
 *  - error (string|null)
 *  - acciones para fetch/create/update/delete
 */
export const useStore = create((set, get) => ({
  // ─── Auth ───
  user: null,
  userRole: null, // 'medico' | 'recepcion' | 'admin'
  isAuthenticated: false,
  theme: localStorage.getItem('theme') || 'light',
  globalConfig: (() => {
    try {
      const saved = localStorage.getItem('consultorio_config');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  })(),

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

  // Update user object in store (e.g. after profile name change)
  setUser: (updatedUser) => set({ user: updatedUser }),

  auth: {
    login: async (email, password) => {
      set({ authLoading: true, authError: null });
      try {
        const data = await authService.login(email, password);
        set({
          user: data.user,
          userRole: data.user.role,
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
        set({ user, userRole: user.role, isAuthenticated: true });
      } catch {
        // Token inválido o expirado → limpiar COMPLETAMENTE (estado + localStorage)
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        set({ user: null, userRole: null, isAuthenticated: false });
      }
    },
  },
  authLoading: false,
  authError: null,

  // ─── Patients ───
  patients: [],
  patientsLoading: false,
  patientsError: null,
  patientsPagination: { total: 0, page: 1, limit: 25, pages: 1 },

  fetchPatients: async (params) => {
    set({ patientsLoading: true, patientsError: null });
    try {
      const data = await patientsService.getAll(params);
      const fetchedPatients = (data.patients || data || []).filter(p => p && (p.id || p.name));
      set({
        patients: fetchedPatients,
        patientsLoading: false,
        patientsPagination: {
          total: data.total ?? fetchedPatients.length,
          page:  data.page  ?? 1,
          limit: data.limit ?? 25,
          pages: data.pages ?? 1,
        },
      });
    } catch (error) {
      set({
        patientsLoading: false,
        patientsError: error.response?.data?.message || 'Error al cargar pacientes',
      });
    }
  },

  createPatient: async (patientData) => {
    try {
      const patient = await patientsService.create(patientData);
      if (patient && (patient.id || patient.name)) {
        set((state) => ({ patients: [...state.patients, patient] }));
      }
      return patient;
    } catch (error) {
      console.error('Error in createPatient store action:', error);
      throw error;
    }
  },

  updatePatient: async (id, patientData) => {
    const patient = await patientsService.update(id, patientData);
    set((state) => ({
      patients: state.patients.map((p) => (p.id === id ? patient : p)),
    }));
    return patient;
  },

  // ─── Patient Files ───
  patientFiles: [],
  filesLoading: false,

  fetchFiles: async (patientId) => {
    set({ filesLoading: true });
    try {
      const files = await filesService.getFiles(patientId);
      set({ patientFiles: files, filesLoading: false });
    } catch {
      set({ filesLoading: false });
    }
  },

  uploadFile: async (patientId, file) => {
    const newFile = await filesService.uploadFile(patientId, file);
    set((state) => ({ patientFiles: [newFile, ...state.patientFiles] }));
    return newFile;
  },

  deleteFile: async (patientId, fileId) => {
    await filesService.deleteFile(patientId, fileId);
    set((state) => ({
      patientFiles: state.patientFiles.filter((f) => f.id !== fileId)
    }));
  },

  deletePatient: async (id) => {
    await patientsService.remove(id);
    set((state) => ({
      patients: state.patients.filter((p) => p.id !== id),
    }));
  },

  addHistoryEntry: async (patientId, entryData) => {
    const entry = await patientsService.addHistoryEntry(patientId, entryData);
    set((state) => ({
      patients: state.patients.map((p) => {
        if (p.id === patientId) {
          return { ...p, history: [entry, ...(p.history || [])] };
        }
        return p;
      })
    }));
    return entry;
  },

  addMedication: async (patientId, medData) => {
    const medication = await patientsService.addMedication(patientId, medData);
    set((state) => ({
      patients: state.patients.map((p) => {
        if (p.id === patientId) {
          return { ...p, medications: [medication, ...(p.medications || [])] };
        }
        return p;
      })
    }));
    return medication;
  },

  suspendMedication: async (patientId, medId) => {
    await patientsService.suspendMedication(patientId, medId);
    set((state) => ({
      patients: state.patients.map((p) => {
        if (p.id === patientId) {
          return {
            ...p,
            medications: (p.medications || []).map(m =>
              m.id === medId ? { ...m, active: 0 } : m
            )
            // Nota: el filtrado de activos/inactivos se hace en la UI al renderizar
          };
        }
        return p;
      })
    }));
  },

  // ─── Appointments ───
  appointments: [],
  appointmentsLoading: false,
  appointmentsError: null,

  fetchAppointments: async (params = {}) => {
    set({ appointmentsLoading: true, appointmentsError: null });
    
    // Auto-filter by doctorId if user is medico
    const { user, userRole } = useStore.getState();
    const finalParams = { ...params };
    if (userRole === 'medico' && user?.doctor_id) {
      finalParams.doctorId = user.doctor_id;
    }

    try {
      const data = await appointmentsService.getAll(finalParams);
      const fetchedAppointments = (data.appointments || data || []).filter(a => a && a.id);
      set({ appointments: fetchedAppointments, appointmentsLoading: false });
    } catch (error) {
      set({
        appointmentsLoading: false,
        appointmentsError: error.response?.data?.message || 'Error al cargar turnos',
      });
    }
  },

  createAppointment: async (appointmentData) => {
    try {
      const created = await appointmentsService.create(appointmentData);
      const newApps = (Array.isArray(created) ? created : [created]).filter(app => app && app.id);
      set((state) => ({ appointments: [...state.appointments, ...newApps] }));
      return newApps;
    } catch (error) {
      console.error('Error in createAppointment store action:', error);
      throw error;
    }
  },

  updateAppointment: async (id, appointmentData) => {
    try {
      const updated = await appointmentsService.update(id, appointmentData);
      if (!updated || !updated.id) return null;
      set((state) => ({
        appointments: state.appointments.map((a) => (a.id === id ? updated : a)),
      }));
      return updated;
    } catch (error) {
      console.error('Error in updateAppointment store action:', error);
      throw error;
    }
  },

  updateAppointmentStatus: async (id, attendance) => {
    try {
      const updated = await appointmentsService.updateStatus(id, attendance);
      if (!updated || !updated.id) return null;
      set((state) => ({
        appointments: state.appointments.map((a) => (a.id === id ? updated : a)),
      }));
      return updated;
    } catch (error) {
       console.error('Error in updateAppointmentStatus store action:', error);
       throw error;
    }
  },

  updateAppointmentPaymentStatus: async (id, paymentData) => {
    try {
      // paymentData can be { paymentStatus, paidAmount, paymentMethod, ... }
      const updated = await appointmentsService.updatePayment(id, paymentData);
      if (!updated || !updated.id) return null;
      set((state) => ({
        appointments: state.appointments.map((a) => (a.id === id ? updated : a)),
      }));
      return updated;
    } catch (error) {
       console.error('Error in updateAppointmentPaymentStatus store action:', error);
       throw error;
    }
  },

  deleteAppointment: async (id) => {
    await appointmentsService.remove(id);
    set((state) => ({
      appointments: state.appointments.filter((a) => a.id !== id),
    }));
  },

  // ─── Doctors ───
  doctors: [],
  doctorsLoading: false,

  fetchDoctors: async () => {
    set({ doctorsLoading: true });
    try {
      const data = await doctorsService.getAll();
      const fetchedDoctors = (data.doctors || data || []).filter(d => d && (d.id || d.name));
      set({ doctors: fetchedDoctors, doctorsLoading: false });
    } catch {
      set({ doctorsLoading: false });
    }
  },

  createDoctor: async (doctorData) => {
    // data = { doctor, email, password } — backend genera credenciales automáticamente
    const data = await doctorsService.create(doctorData);
    set((state) => ({ doctors: [...state.doctors, data.doctor] }));
    return data; // devuelve { doctor, email, password } para que la UI pueda mostrarlo
  },

  updateDoctor: async (id, doctorData) => {
    const doctor = await doctorsService.update(id, doctorData);
    set((state) => ({
      doctors: state.doctors.map((d) => (d.id === id ? doctor : d)),
    }));
    return doctor;
  },

  deleteDoctor: async (id) => {
    await doctorsService.remove(id);
    set((state) => ({ doctors: state.doctors.filter((d) => d.id !== id) }));
  },

  // ─── Admin Staff ───
  adminStaff: [],
  adminStaffLoading: false,

  fetchAdminStaff: async () => {
    set({ adminStaffLoading: true });
    try {
      const staff = await staffService.getAll();
      set({ adminStaff: staff, adminStaffLoading: false });
    } catch {
      set({ adminStaffLoading: false });
    }
  },

  createStaff: async (staffData) => {
    // data = { staff, email, password } — backend genera credenciales automáticamente
    const data = await staffService.create(staffData);
    set((state) => ({ adminStaff: [...state.adminStaff, data.staff] }));
    return data; // devuelve { staff, email, password } para que la UI pueda mostrarlo
  },

  updateStaff: async (id, staffData) => {
    const data = await staffService.update(id, staffData);
    const updatedStaff = data.staff || data;
    set((state) => ({
      adminStaff: state.adminStaff.map((s) => (s.id === id ? updatedStaff : s)),
    }));
    return updatedStaff;
  },

  deleteStaff: async (id) => {
    await staffService.remove(id);
    set((state) => ({ adminStaff: state.adminStaff.filter((s) => s.id !== id) }));
  },

  // ─── Transactions ───
  transactions: [],
  transactionsLoading: false,

  fetchTransactions: async (params) => {
    set({ transactionsLoading: true });
    try {
      const transactions = await transactionsService.getAll(params);
      set({ transactions, transactionsLoading: false });
    } catch {
      set({ transactionsLoading: false });
    }
  },

  createTransaction: async (transactionData) => {
    const transaction = await transactionsService.create(transactionData);
    set((state) => ({ transactions: [transaction, ...state.transactions] }));
    return transaction;
  },

  // ─── Dashboard Notes ───
  dashboardNote: '',
  fetchDashboardNote: async () => {
    try {
      const res = await api.get('/notes/');
      set({ dashboardNote: res.data.content || '' });
    } catch (err) {
      console.error('Error fetching note:', err);
    }
  },

  updateDashboardNote: async (content) => {
    try {
      await api.post('/notes/', { content });
      set({ dashboardNote: content });
    } catch (err) {
      console.error('Error updating note:', err);
    }
  },

  // --- USERS MANAGEMENT ---
  users: [],
  fetchUsers: async () => {
    try {
      const res = await api.get('/users');
      set({ users: res.data.users });
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  },

  createUser: async (userData) => {
    try {
      await api.post('/users', userData);
      get().fetchUsers();
    } catch (err) {
      throw err;
    }
  },

  updateUser: async (id, data) => {
    try {
      await api.put(`/users/${id}`, data);
      get().fetchUsers();
    } catch (err) {
      throw err;
    }
  },

  deleteUser: async (id) => {
    try {
      await api.delete(`/users/${id}`);
      get().fetchUsers();
    } catch (err) {
      throw err;
    }
  },

  // --- GLOBAL CONFIG ---
  setGlobalConfig: (config) => {
    localStorage.setItem('consultorio_config', JSON.stringify(config));
    set({ globalConfig: config });
  },

  fetchGlobalConfig: () => {
    try {
      const saved = localStorage.getItem('consultorio_config');
      if (saved) set({ globalConfig: JSON.parse(saved) });
    } catch (err) {
      console.error('Error fetching global config:', err);
    }
  }
}));
