import { appointmentsService } from '../../services/appointments';
import logger from '../../utils/logger';

export const createAppointmentsSlice = (set, get) => ({
  appointments: [],
  appointmentsLoading: false,
  appointmentsError: null,
  activeCallApp: null,
  isJitsiMaximized: false,

  setActiveCallApp: (app) => set({ activeCallApp: app }),
  setIsJitsiMaximized: (val) => set({ isJitsiMaximized: val }),

  fetchAppointments: async (params = {}) => {
    set({ appointmentsLoading: true, appointmentsError: null });
    
    // Auto-filter by doctorId if user is medico
    const { user, userRole } = get();
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
      logger.error('Error in createAppointment store action:', error);
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
      logger.error('Error in updateAppointment store action:', error);
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
       logger.error('Error in updateAppointmentStatus store action:', error);
       throw error;
    }
  },

  updateAppointmentVideoStatus: async (id, estado_videollamada) => {
    try {
      const updated = await appointmentsService.updateVideoStatus(id, estado_videollamada);
      if (!updated || !updated.id) return null;
      set((state) => ({
        appointments: state.appointments.map((a) => (a.id === id ? updated : a)),
      }));
      return updated;
    } catch (error) {
       logger.error('Error in updateAppointmentVideoStatus store action:', error);
       throw error;
    }
  },

  updateAppointmentPaymentStatus: async (id, paymentData) => {
    try {
      const updated = await appointmentsService.updatePayment(id, paymentData);
      if (!updated || !updated.id) return null;
      set((state) => ({
        appointments: state.appointments.map((a) => (a.id === id ? updated : a)),
      }));
      return updated;
    } catch (error) {
       logger.error('Error in updateAppointmentPaymentStatus store action:', error);
       throw error;
    }
  },

  deleteAppointment: async (id) => {
    await appointmentsService.remove(id);
    set((state) => ({
      appointments: state.appointments.filter((a) => a.id !== id),
    }));
  },
});
