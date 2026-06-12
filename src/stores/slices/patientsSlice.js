import { patientsService } from '../../services/patients';
import { filesService } from '../../services/files';
import logger from '../../utils/logger';

export const createPatientsSlice = (set) => ({
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
      logger.error('Error in createPatient store action:', error);
      throw error;
    }
  },

  setPatients: (patients) => set({ patients }),

  updatePatient: async (id, patientData) => {
    const patient = await patientsService.update(id, patientData);
    set((state) => ({
      patients: state.patients.map((p) => (p.id === id ? { ...p, ...patient } : p)),
    }));
    return patient;
  },

  deletePatient: async (id) => {
    await patientsService.remove(id);
    set((state) => ({
      patients: state.patients.filter((p) => p.id !== id),
    }));
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

  // ─── Clinical History ───
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

  updateHistoryEntry: async (patientId, entryId, entryData) => {
    const entry = await patientsService.updateHistoryEntry(patientId, entryId, entryData);
    set((state) => ({
      patients: state.patients.map((p) => {
        if (p.id === patientId) {
          return {
            ...p,
            history: (p.history || []).map((h) => (h.id === entryId ? entry : h))
          };
        }
        return p;
      })
    }));
    return entry;
  },

  deleteHistoryEntry: async (patientId, entryId) => {
    await patientsService.deleteHistoryEntry(patientId, entryId);
    set((state) => ({
      patients: state.patients.map((p) => {
        if (p.id === patientId) {
          return {
            ...p,
            history: (p.history || []).filter((h) => h.id !== entryId)
          };
        }
        return p;
      })
    }));
  },

  // ─── Medications ───
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
          };
        }
        return p;
      })
    }));
  },
});
