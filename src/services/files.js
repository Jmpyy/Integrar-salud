import api from './api';

export const filesService = {
  /**
   * Obtiene la lista de archivos de un paciente
   */
  getFiles: async (patientId) => {
    const response = await api.get(`/patients/${patientId}/files`);
    return response.data.files;
  },

  /**
   * Sube un archivo para un paciente
   */
  uploadFile: async (patientId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post(`/patients/${patientId}/files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data.file;
  },

  /**
   * Elimina un archivo
   */
  deleteFile: async (patientId, fileId) => {
    const response = await api.delete(`/patients/${patientId}/files/${fileId}`);
    return response.data;
  }
};
