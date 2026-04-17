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
};
