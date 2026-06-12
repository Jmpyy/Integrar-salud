import { create } from 'zustand';

import { createAuthSlice } from './slices/authSlice';
import { createPatientsSlice } from './slices/patientsSlice';
import { createAppointmentsSlice } from './slices/appointmentsSlice';
import { createStaffSlice } from './slices/staffSlice';
import { createFinanceSlice } from './slices/financeSlice';
import { createConfigSlice } from './slices/configSlice';

/**
 * Store global de la aplicación.
 * Reemplaza el prop drilling de App.jsx -> DashboardLayout -> páginas.
 *
 * El código ha sido modularizado usando el patrón Slices de Zustand.
 * Todas las entidades (auth, pacientes, turnos, etc.) mantienen su misma API
 * pero se administran en archivos separados dentro de la carpeta /slices.
 */

export const useStore = create((set, get) => ({
  ...createAuthSlice(set, get),
  ...createPatientsSlice(set, get),
  ...createAppointmentsSlice(set, get),
  ...createStaffSlice(set, get),
  ...createFinanceSlice(set, get),
  ...createConfigSlice(set, get),
}));
