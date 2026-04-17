import api from './api';

export const afipService = {
  getConfig: async () => {
    const res = await api.get('/afip/config');
    return res.data.config;
  },

  updateConfig: async (config) => {
    const res = await api.post('/afip/config', config);
    return res.data;
  },

  uploadFile: async (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    const res = await api.post('/afip/upload-cert', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  checkStatus: async () => {
    const res = await api.get('/afip/status');
    return res.data.status;
  },

  emitInvoice: async (transactionId) => {
    const res = await api.post('/afip/emitir', { transaction_id: transactionId });
    return res.data;
  }
};
