import api from './api';

export const appointmentsService = {
  async getAll(params = {}) {
    const { data } = await api.get('/appointments/', { params });
    return data.appointments;
  },

  async getByDate(date, doctorId) {
    const params = { dateFrom: date, dateTo: date };
    if (doctorId) params.doctorId = doctorId;
    const { data } = await api.get('/appointments/', { params });
    return data.appointments;
  },

  async getByDateRange(dateFrom, dateTo, filters = {}) {
    const { data } = await api.get('/appointments/', {
      params: { dateFrom, dateTo, ...filters },
    });
    return data.appointments;
  },

  async create(appointmentData) {
    const { data } = await api.post('/appointments/', appointmentData);
    return data.appointments || data.appointment; // puede ser array si es recurrente
  },

  async update(id, appointmentData) {
    const { data } = await api.put(`/appointments/${id}`, appointmentData);
    return data.appointment;
  },

  async remove(id) {
    await api.delete(`/appointments/${id}`);
  },

  async updateStatus(id, attendance) {
    const { data } = await api.patch(`/appointments/${id}/status`, { attendance });
    return data.appointment;
  },

  async updatePayment(id, paymentStatus) {
    const { data } = await api.patch(`/appointments/${id}/payment`, { paymentStatus });
    return data.appointment;
  },
};
