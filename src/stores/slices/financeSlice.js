import { transactionsService } from '../../services/transactions';
import api from '../../services/api';
import logger from '../../utils/logger';

export const createFinanceSlice = (set, get) => ({
  // ─── Transactions ───
  transactions: [],
  transactionsLoading: false,

  fetchTransactions: async (params) => {
    set({ transactionsLoading: true });
    try {
      const transactions = await transactionsService.getAll(params);
      set({ transactions, transactionsLoading: false });
    } catch {
      set({ transactionsLoading: false });
    }
  },

  createTransaction: async (transactionData) => {
    try {
      const transaction = await transactionsService.create(transactionData);
      if (transaction) {
        set((state) => ({ transactions: [transaction, ...state.transactions] }));
      }
      return transaction;
    } catch (error) {
      logger.error('[Store] Error al crear transacción:', error?.response?.data || error.message, transactionData);
      throw error;
    }
  },
  
  deleteTransaction: async (id) => {
    try {
      await transactionsService.delete(id);
      set((state) => ({
        transactions: state.transactions.filter(t => t.id !== id)
      }));
      return true;
    } catch (err) {
      logger.error('Error deleting transaction:', err);
      throw err;
    }
  },

  updateTransaction: async (id, txData) => {
    try {
      await api.put(`/transactions/${id}`, txData);
      get().fetchTransactions();
    } catch (err) {
      logger.error('Error updating transaction:', err);
      throw err;
    }
  },
});
