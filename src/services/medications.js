import api from './api';

export const medicationsService = {
  async getPatientMedications(patientId) {
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

  // Vademecum endpoints
  async getAll(params = {}) {
    const { data } = await api.get('/vademecum', { params });
    return data.medications;
  },

  async getActivePrescriptions() {
    const { data } = await api.get('/vademecum/active_prescriptions');
    return data.prescriptions;
  },

  async create(medData) {
    const { data } = await api.post('/vademecum', medData);
    return data.medication;
  },

  async update(id, medData) {
    const { data } = await api.put(`/vademecum/${id}`, medData);
    return data.message;
  },

  async remove(id) {
    const { data } = await api.delete(`/vademecum/${id}`);
    return data.message;
  },
};
