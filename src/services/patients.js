import api from './api';

export const patientsService = {
  async getAll(params = {}) {
    const { data } = await api.get('/patients/', { params });
    return data; // { patients, total, page, limit }
  },

  async getById(id) {
    const { data } = await api.get(`/patients/${id}`);
    return data.patient;
  },

  async search(query) {
    const { data } = await api.get('/patients/', { params: { search: query } });
    return data.patients;
  },

  async create(patientData) {
    const { data } = await api.post('/patients/', patientData);
    return data.patient;
  },

  async update(id, patientData) {
    const { data } = await api.put(`/patients/${id}`, patientData);
    return data.patient;
  },

  async remove(id) {
    await api.delete(`/patients/${id}`);
  },

  // Historia clínica
  async getHistory(patientId) {
    const { data } = await api.get(`/patients/${patientId}/history`);
    return data.history;
  },

  async addHistoryEntry(patientId, entryData) {
    const { data } = await api.post(`/patients/${patientId}/history`, entryData);
    return data.entry;
  },

  // Medicación
  async getMedications(patientId) {
    const { data } = await api.get(`/patients/${patientId}/medications`);
    return data.medications;
  },

  async addMedication(patientId, medData) {
    const { data } = await api.post(`/patients/${patientId}/medications`, medData);
    return data.medication;
  },

  async suspendMedication(patientId, medId) {
    const { data } = await api.patch(`/patients/${patientId}/medications/${medId}`, {
      active: false,
    });
    return data.medication;
  },

  // Archivos — TODO: implementar endpoint en backend (/api/patients/{id}/files)
  // getFiles, uploadFile, deleteFile están pendientes de implementación en el backend.
};

