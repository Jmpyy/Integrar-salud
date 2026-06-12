import { doctorsService } from '../../services/doctors';
import { staffService } from '../../services/staff';

export const createStaffSlice = (set) => ({
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
    // data = { doctor, email, password }
    const data = await doctorsService.create(doctorData);
    set((state) => ({ doctors: [...state.doctors, data.doctor] }));
    return data;
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
    // data = { staff, email, password }
    const data = await staffService.create(staffData);
    set((state) => ({ adminStaff: [...state.adminStaff, data.staff] }));
    return data;
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
});
