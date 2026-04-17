import api from './api';

export const doctorsService = {
  async getAll() {
    const { data } = await api.get('/doctors/');
    return data.doctors;
  },

  async getById(id) {
    const { data } = await api.get(`/doctors/${id}`);
    return data.doctor;
  },

  async create(doctorData) {
    const { data } = await api.post('/doctors/', doctorData);
    // data = { doctor, email, password } — backend genera credenciales automáticamente
    return data;
  },

  async update(id, doctorData) {
    const { data } = await api.put(`/doctors/${id}`, doctorData);
    return data.doctor;
  },

  async remove(id) {
    await api.delete(`/doctors/${id}`);
  },
  // Nota: el horario (schedule) viene embebido en cada objeto doctor (GET /doctors/ y GET /doctors/{id}).
  // No existe un endpoint separado /doctors/{id}/schedule.
};

