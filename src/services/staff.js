import api from './api';

export const staffService = {
  async getAll() {
    const { data } = await api.get('/staff/');
    return data.staff;
  },

  async create(staffData) {
    const { data } = await api.post('/staff/', staffData);
    return data;
  },

  async update(id, staffData) {
    const { data } = await api.put(`/staff/${id}`, staffData);
    return data;
  },

  async remove(id) {
    await api.delete(`/staff/${id}`);
  },
};
