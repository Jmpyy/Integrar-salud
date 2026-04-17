import api from './api';

export const transactionsService = {
  async getAll(params = {}) {
    const { data } = await api.get('/transactions/', { params });
    return data.transactions;
  },

  async create(transactionData) {
    const { data } = await api.post('/transactions/', transactionData);
    return data.transaction;
  },

  async getStats(params = {}) {
    const { data } = await api.get('/transactions/stats', { params });
    return data.stats;
  },

  async exportCSV(params = {}) {
    const response = await api.get('/transactions/export', {
      params: { format: 'csv', ...params },
      responseType: 'blob',
    });
    // Crear blob y descargar
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Libro_Diario_Finanzas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // exportPDF — TODO: implementar generación de PDF en el backend.
  // El endpoint actual solo soporta format=csv.
};
