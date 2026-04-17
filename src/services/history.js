import api from './api';

export const historyService = {
  async getPatientHistory(patientId) {
    const { data } = await api.get(`/patients/${patientId}/history`);
    return data.history;
  },

  async addEntry(patientId, entryData) {
    const { data } = await api.post(`/patients/${patientId}/history`, entryData);
    return data.entry;
  },
};
