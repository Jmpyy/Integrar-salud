import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../../stores/useStore';
import {
   TrendingUp, DollarSign, Wallet, Clock, Users, ChevronDown,
   Briefcase, Activity, ArrowUpRight, ArrowDownRight,
   Download, FileText, Plus, X, List, PieChart, BarChart2, Trash2, Pencil, Landmark
} from 'lucide-react';

export default function FinanzasPage() {
   const store = useStore();
   const doctors = store.doctors;
   const adminStaff = store.adminStaff;
   const userRole = store.userRole;
   const transactions = store.transactions;
   const appointments = store.appointments;
   const [dateRange, setDateRange] = useState('Mes en curso');
   const [activeTab, setActiveTab] = useState('diario'); // 'diario' | 'profesionales'

   const [isAddingExpense, setIsAddingExpense] = useState(false);
   const [newExpense, setNewExpense] = useState({ category: '', amount: '', method: 'Efectivo', date: new Date().toISOString().split('T')[0], receipt: '', notes: '', doctor_id: '' });

   // Estado para Liquidación Rápida
   const [settlementDoctor, setSettlementDoctor] = useState(null);

   // Cargar maestros al montar
   useEffect(() => {
      store.fetchDoctors();
      store.fetchAdminStaff();
   }, []);

   // -- Paginación inteligente: fetch solo del rango de fechas actual --
   useEffect(() => {
      const now = new Date();
      let dateFrom, dateTo;

      const f = (d) => {
         const dObj = new Date(d);
         dObj.setMinutes(dObj.getMinutes() - dObj.getTimezoneOffset());
         return dObj.toISOString().split('T')[0];
      };

      if (dateRange === 'Hoy') {
         dateFrom = f(now);
         dateTo = f(now);
      } else if (dateRange === 'Esta Semana') {
         const weekAgo = new Date(now);
         weekAgo.setDate(now.getDate() - 7);
         dateFrom = f(weekAgo);
         dateTo = f(now);
      } else if (dateRange === 'Mes en curso') {
         const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
         const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
         dateFrom = f(firstDay);
         dateTo = f(lastDay);
      } else if (dateRange === 'Año en curso') {
         const firstDay = new Date(now.getFullYear(), 0, 1);
         const lastDay = new Date(now.getFullYear(), 11, 31);
         dateFrom = f(firstDay);
         dateTo = f(lastDay);
      }

      store.fetchTransactions({ dateFrom, dateTo });
      store.fetchAppointments({ dateFrom, dateTo });
   }, [dateRange]);

   const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);

   // Mensaje Toast Temporal para exportaciones
   const [toastMsg, setToastMsg] = useState('');

   const stats = useMemo(() => {
      const now = new Date();

      // 1. Filtrar transacciones por rango
      const filteredTxs = (transactions || []).filter(t => {
         const txDate = new Date(t.date);
         if (dateRange === 'Hoy') return txDate.toDateString() === now.toDateString();
         if (dateRange === 'Esta Semana') {
            const weekAgo = new Date();
            weekAgo.setDate(now.getDate() - 7);
            return txDate >= weekAgo;
         }
         if (dateRange === 'Mes en curso') {
            return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
         }
         return true;
      });

      const dynamicExpenses = filteredTxs.filter(t => t.type === 'Egreso').reduce((acc, t) => acc + Number(t.amount || 0), 0);
      const dynamicIncome = filteredTxs.filter(t => t.type === 'Ingreso').reduce((acc, t) => acc + Number(t.amount || 0), 0);

      // 2. Calcular Distribución de medios (Donut)
      const methods = ['Transferencia', 'Efectivo', 'Debito', 'Tarjeta'];
      const methodCounts = filteredTxs.reduce((acc, t) => {
         acc[t.method] = (acc[t.method] || 0) + 1;
         return acc;
      }, {});
      const totalCount = filteredTxs.length || 1;
      const distribution = methods.map(m => ({
         label: m,
         pct: Math.round(((methodCounts[m] || 0) / totalCount) * 100)
      }));

      // 3. Flujo Diario (últimos 6 días para el gráfico de barras)
      const dailyFlow = [5, 4, 3, 2, 1, 0].map(daysAgo => {
         const d = new Date();
         d.setDate(d.getDate() - daysAgo);
         const dayStr = d.toDateString();
         const dayTxs = (transactions || []).filter(t => new Date(t.date).toDateString() === dayStr);
         const dayIn = dayTxs.filter(t => t.type === 'Ingreso').reduce((acc, t) => acc + Number(t.amount || 0), 0);
         const dayOut = dayTxs.filter(t => t.type === 'Egreso').reduce((acc, t) => acc + Number(t.amount || 0), 0);

         const maxVal = 200000;
         return {
            lbl: d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', ''),
            in: Math.min(100, Math.round((dayIn / maxVal) * 100)),
            out: Math.min(100, Math.round((dayOut / maxVal) * 100))
         };
      });

      return {
         ingresos: dynamicIncome,
         egresos: dynamicExpenses,
         neta: dynamicIncome - dynamicExpenses,
         distribution,
         dailyFlow,
         totalTxs: filteredTxs.length
      };
   }, [dateRange, transactions]);

   if (userRole !== 'admin') {
      return (
         <div className="flex flex-col items-center justify-center h-full max-h-screen text-slate-500">
            <Briefcase size={48} className="mb-4 text-slate-300" />
            <h2 className="text-xl font-bold text-slate-700">Acceso Denegado</h2>
            <p className="text-sm">El módulo de Business Intelligence es exclusivo para dueños o roles administrativos.</p>
         </div>
      );
   }

   // Manejador del Modal de Gasto
   const handleAddExpense = (e) => {
      e.preventDefault();
      if (!newExpense.amount || !newExpense.category) return;

      const newTx = {
         date: newExpense.date ? new Date(newExpense.date).toISOString() : new Date().toISOString(),
         type: 'Egreso',
         concept: newExpense.category + (newExpense.receipt ? ` (#${newExpense.receipt})` : ''),
         method: newExpense.method || 'Caja Fija',
         amount: Number(newExpense.amount),
         notes: newExpense.notes,
         category: 'Gastos Generales'
      };
      store.createTransaction(newTx);
      setIsAddingExpense(false);
      setNewExpense({ category: '', amount: '', method: 'Efectivo', date: new Date().toISOString().split('T')[0], receipt: '', notes: '', doctor_id: null });
   };

   const handleExport = (type) => {
      if (type === 'CSV') {
         const headers = "ID Ref.;Fecha;Hora;Tipo de Movimiento;Concepto Registrado;Método de Pago;Monto Neto (ARS)\n";
         const csvRows = transactions.map(tx => {
            const dObj = new Date(tx.date);
            const fDate = dObj.toLocaleDateString();
            const fTime = dObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const formatMonto = formatMoney(tx.type === 'Ingreso' ? tx.amount : -tx.amount);
            return `"TX-${tx.id}";"${fDate}";"${fTime}";"${tx.type}";"${tx.concept}";"${tx.method}";"${formatMonto}"`;
         }).join("\n");
         const blob = new Blob(["\uFEFF" + headers + csvRows], { type: 'text/csv;charset=utf-8;' });
         const link = document.createElement('a');
         link.href = URL.createObjectURL(blob);
         link.setAttribute('download', 'Libro_Diario_Finanzas.csv');
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
         setToastMsg('¡Archivo CSV descargado con éxito!');
      } else if (type === 'PDF') {
         setToastMsg('Preparando documento para impresión / PDF...');
         setTimeout(() => window.print(), 800);
      }
      setTimeout(() => setToastMsg(''), 4000);
   };

   const formatMoney = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

   return (
      <div className="flex flex-col h-[calc(100vh-12rem)] print:h-auto animate-fade-in-quick px-2 sm:px-6 py-2 sm:py-4 overflow-y-auto print:overflow-visible custom-scrollbar relative bg-[var(--bg-main)] print:bg-white text-[var(--text-primary)] border border-[var(--border-color)] rounded-[2.5rem]">

         {/* TOAST SYSTEM */}
         {toastMsg && (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-full font-black shadow-2xl z-50 animate-bounce print:hidden">
               {toastMsg}
            </div>
         )}

         {/* MODAL DE EGRESOS AVANZADO */}
         {isAddingExpense && (
            <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in-quick">
               <div className="bg-[var(--bg-card)] rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl maxHeight-[90vh] overflow-y-auto custom-scrollbar border border-[var(--glass-border)]">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-black text-[var(--text-primary)] flex items-center gap-2"><ArrowDownRight className="text-red-500" /> Detalle de Egreso</h3>
                     <button onClick={() => setIsAddingExpense(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"><X size={24} /></button>
                  </div>
                  <form onSubmit={handleAddExpense} className="space-y-4">
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                           <label className="block text-[10px] font-black text-[var(--text-secondary)] mb-1.5 uppercase tracking-widest opacity-70">Categoría *</label>
                           <select required value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/10 transition-all">
                              <option value="" className="bg-[var(--bg-card)]">Seleccionar...</option>
                              <option value="Sueldos y Honorarios" className="bg-[var(--bg-card)]">Sueldos y Honorarios</option>
                              <option value="Insumos Médicos" className="bg-[var(--bg-card)]">Insumos Médicos</option>
                              <option value="Mantenimiento e Infraestructura" className="bg-[var(--bg-card)]">Mantenimiento e Infraestructura</option>
                              <option value="Servicios (Luz/Internet)" className="bg-[var(--bg-card)]">Servicios (Luz/Internet)</option>
                              <option value="Otros Gastos" className="bg-[var(--bg-card)]">Otros Gastos</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-[10px] font-black text-[var(--text-secondary)] mb-1.5 uppercase tracking-widest opacity-70">Monto ($) *</label>
                           <input type="number" required value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-black text-red-500 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/10 transition-all placeholder:text-[var(--text-secondary)]/30" placeholder="Ej: 45000" />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                           <label className="block text-[10px] font-black text-[var(--text-secondary)] mb-1.5 uppercase tracking-widest opacity-70">Fecha</label>
                           <input type="date" required value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] outline-none focus:border-red-400 transition-all" />
                        </div>
                        <div>
                           <label className="block text-[10px] font-black text-[var(--text-secondary)] mb-1.5 uppercase tracking-widest opacity-70">Método de Pago</label>
                           <select value={newExpense.method} onChange={e => setNewExpense({ ...newExpense, method: e.target.value })} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] outline-none focus:border-red-400 transition-all">
                              <option value="Efectivo" className="bg-[var(--bg-card)]">Efectivo</option>
                              <option value="Transferencia" className="bg-[var(--bg-card)]">Transferencia</option>
                              <option value="Tarjeta de Crédito" className="bg-[var(--bg-card)]">Tarjeta de Crédito</option>
                              <option value="Tarjeta de Débito" className="bg-[var(--bg-card)]">Tarjeta de Débito</option>
                              <option value="Cheque" className="bg-[var(--bg-card)]">Cheque</option>
                           </select>
                        </div>
                     </div>

                     <div>
                        <label className="block text-[10px] font-black text-[var(--text-secondary)] mb-1.5 uppercase tracking-widest opacity-70">N° Comprobante / Factura</label>
                        <input type="text" value={newExpense.receipt} onChange={e => setNewExpense({ ...newExpense, receipt: e.target.value })} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] outline-none focus:border-red-400 transition-all placeholder:text-[var(--text-secondary)]/30" placeholder="Opcional. Ej: FC-A-002-14002" />
                     </div>

                     <div>
                        <label className="block text-[10px] font-black text-[var(--text-secondary)] mb-1.5 uppercase tracking-widest opacity-70">Detalles u Observaciones</label>
                        <textarea value={newExpense.notes} onChange={e => setNewExpense({ ...newExpense, notes: e.target.value })} rows="2" className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm font-medium text-[var(--text-primary)] outline-none focus:border-red-400 transition-all resize-none placeholder:text-[var(--text-secondary)]/30" placeholder="Opcional. Motivo del gasto..."></textarea>
                     </div>

                     <div className="pt-2">
                        <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg hover:shadow-red-500/20">
                           Confirmar y Registrar Egreso
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}

         {/* CABECERA (TOP BAR) */}
         <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-8">
            <div>
               <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-3">
                  <div className="p-2 bg-[var(--accent-primary)]/10 rounded-xl">
                     <TrendingUp className="text-[var(--accent-primary)]" />
                  </div>
                  Dashboard de Negocio
               </h2>
               <p className="text-sm font-medium text-[var(--text-secondary)] mt-1 opacity-70">Control activo del flujo de caja, gastos operativos y análisis contable.</p>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 print:hidden">
               <button onClick={() => setIsAddingExpense(true)} className="bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-black uppercase tracking-widest px-5 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all">
                  <Plus size={16} /> Añadir Gasto
               </button>

               <button onClick={() => handleExport('CSV')} className="bg-[var(--bg-card)] text-[var(--accent-primary)] border border-[var(--border-color)] text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-[var(--accent-light)] transition-all">
                  <Download size={16} /> CSV
               </button>
               <button onClick={() => handleExport('PDF')} className="bg-[var(--bg-card)] text-[var(--accent-primary)] border border-[var(--border-color)] text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-[var(--accent-light)] transition-all">
                  <FileText size={16} /> PDF
               </button>

               {/* DATE FILTER */}
               <div className="relative min-w-[170px]">
                  <button onClick={() => setIsDateMenuOpen(!isDateMenuOpen)} className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm text-xs font-black uppercase tracking-widest text-[var(--text-primary)] px-5 py-2.5 rounded-2xl flex items-center justify-between gap-3 hover:border-[var(--accent-primary)]/50 transition-all">
                     {dateRange} <ChevronDown size={14} className={`text-[var(--text-secondary)] transition-transform ${isDateMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isDateMenuOpen && (
                     <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsDateMenuOpen(false)}></div>
                        <div className="absolute right-0 top-14 w-full bg-[var(--bg-card)] border border-[var(--glass-border)] shadow-2xl rounded-2xl p-2 z-20 animate-fade-in-quick backdrop-blur-xl">
                           {['Hoy', 'Esta Semana', 'Mes en curso', 'Año en curso'].map(r => (
                              <button
                                 key={r}
                                 onClick={() => { setDateRange(r); setIsDateMenuOpen(false); }}
                                 className={`block w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${dateRange === r ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-light)] hover:text-[var(--accent-primary)]'}`}
                              >
                                 {r}
                              </button>
                           ))}
                        </div>
                     </>
                  )}
               </div>
            </div>
         </div>

         {/* KPIS DE RENTABILIDAD - RESPONSIVO */}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 print:grid print:grid-cols-3 print:gap-2">
            <div className="bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-hover)] p-6 rounded-[2rem] shadow-xl shadow-[var(--accent-primary)]/10 border border-white/10 relative overflow-hidden group text-white print:bg-white print:text-slate-800 print:border-slate-200 print:shadow-none">
               <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-bl-full -z-0 opacity-50 group-hover:scale-125 transition-transform duration-700 print:hidden"></div>
               <div className="relative z-10 flex items-start gap-4 print:gap-0">
                  <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md print:hidden"><ArrowUpRight size={24} className="text-white" /></div>
                  <div className="min-w-0 flex-1">
                     <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] print:text-[10px] print:text-slate-400 truncate">Ingresos Brutos</p>
                     <h3 className="text-3xl font-black mt-1 print:text-slate-800 print:text-lg print:tracking-tighter truncate leading-none">{formatMoney(stats.ingresos)}</h3>
                  </div>
               </div>
            </div>

            <div className="card-premium p-6 border border-[var(--glass-border)] shadow-sm relative overflow-hidden group print:border-slate-200 print:shadow-none">
               <div className="absolute right-0 top-0 w-32 h-32 bg-red-500/5 rounded-bl-full -z-0 group-hover:scale-125 transition-transform duration-700 print:hidden"></div>
               <div className="relative z-10 flex items-start gap-4 print:gap-0">
                  <div className="bg-red-500/10 p-3 rounded-2xl print:hidden"><ArrowDownRight size={24} className="text-red-500" /></div>
                  <div className="min-w-0 flex-1">
                     <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] opacity-60 print:text-[10px] print:text-slate-400 truncate">Egresos Totales</p>
                     <h3 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter mt-1 print:text-lg print:tracking-tighter truncate leading-none">{formatMoney(stats.egresos)}</h3>
                  </div>
               </div>
            </div>

            <div className="hidden lg:block bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-[2rem] shadow-xl shadow-emerald-500/10 border border-white/10 relative overflow-hidden group text-white print:block print:bg-white print:text-slate-800 print:border-slate-200 print:shadow-none">
               <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-bl-full -z-0 opacity-50 group-hover:scale-125 transition-transform duration-700 print:hidden"></div>
               <div className="relative z-10 flex items-start gap-4 print:gap-0">
                  <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md print:hidden"><Wallet size={24} className="text-white" /></div>
                  <div className="min-w-0 flex-1">
                     <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] print:text-[10px] print:text-slate-400 truncate">Utilidad Neta</p>
                     <h3 className="text-3xl font-black mt-1 print:text-slate-800 print:text-lg print:tracking-tighter truncate leading-none">{formatMoney(stats.neta)}</h3>
                  </div>
               </div>
            </div>
         </div>

         {/* SECCION DE GRAFICOS */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 print:block print:space-y-6">
            <div className="card-premium p-8 border border-[var(--glass-border)] shadow-sm flex flex-col print:border-slate-200 print:shadow-none animate-fade-in-quick group">
               <div className="flex items-center justify-between mb-8">
                  <h4 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2"><BarChart2 size={18} className="text-[var(--accent-primary)]" /> Evolución Financiera</h4>
                  <div className="flex items-center gap-4">
                     <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[var(--accent-primary)]"></div> <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60">Ingresos</span></div>
                     <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-400"></div> <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60">Egresos</span></div>
                  </div>
               </div>
               <div className="flex-1 flex items-end justify-between gap-3 h-48 mt-auto border-b border-[var(--border-color)]/30 pb-4">
                  {stats.dailyFlow.map((day, idx) => (
                     <div key={idx} className="flex flex-col items-center gap-3 w-full group/bar">
                        <div className="w-full flex justify-center gap-1.5 h-40 items-end">
                           <div className="w-full max-w-[14px] bg-[var(--accent-primary)] rounded-t-lg group-hover/bar:brightness-125 transition-all shadow-[0_0_15px_var(--accent-primary)]/10" style={{ height: `${day.in}%` }}>
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[var(--bg-card)] text-[var(--text-primary)] text-[8px] font-black px-1.5 py-0.5 rounded border border-[var(--border-color)] opacity-0 group-hover/bar:opacity-100 transition-opacity">IN</div>
                           </div>
                           <div className="w-full max-w-[14px] bg-red-400 rounded-t-lg group-hover/bar:brightness-125 transition-all shadow-[0_0_15px_red]/10" style={{ height: `${day.out}%` }}>
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[var(--bg-card)] text-[var(--text-primary)] text-[8px] font-black px-1.5 py-0.5 rounded border border-[var(--border-color)] opacity-0 group-hover/bar:opacity-100 transition-opacity">OUT</div>
                           </div>
                        </div>
                        <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-tighter opacity-70 group-hover/bar:text-[var(--accent-primary)] transition-colors">{day.lbl}</span>
                     </div>
                  ))}
               </div>
            </div>

            <div className="card-premium p-8 border border-[var(--glass-border)] shadow-sm flex flex-col print:border-slate-200 print:shadow-none animate-fade-in-quick">
               <h4 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest mb-6 flex items-center gap-2"><PieChart size={18} className="text-sky-500" /> Distribución de Medios</h4>
               <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-10 py-4">
                  <div className="relative w-44 h-44 shrink-0 shadow-2xl rounded-full p-2 border border-[var(--border-color)]/20 animate-spin-slow">
                     <div className="w-full h-full rounded-full" style={{
                        background: `conic-gradient(
                      var(--accent-primary) 0% ${stats.distribution[0].pct}%,
                      #0ea5e9 ${stats.distribution[0].pct} % ${stats.distribution[0].pct + stats.distribution[1].pct} %,
                      #10b981 ${stats.distribution[0].pct + stats.distribution[1].pct} % ${stats.distribution[0].pct + stats.distribution[1].pct + stats.distribution[2].pct} %,
                      var(--border-color) ${stats.distribution[0].pct + stats.distribution[1].pct + stats.distribution[2].pct} % 100%
                    )`
                     }}></div>
                     <div className="absolute inset-0 m-auto w-[7rem] h-[7rem] bg-[var(--bg-card)] rounded-full flex flex-col items-center justify-center border border-[var(--border-color)] shadow-inner animate-none-override">
                        <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-50">Total Txs</span>
                        <span className="text-2xl font-black text-[var(--text-primary)] leading-none mt-1">{stats.totalTxs}</span>
                     </div>
                  </div>
                  <div className="flex flex-col gap-4 w-full sm:w-auto flex-1">
                     {stats.distribution.map((item, i) => (
                        <div key={i} className="flex flex-col group">
                           <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                 <div className={`w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-[var(--accent-primary)]' : i === 1 ? 'bg-sky-500' : i === 2 ? 'bg-emerald-500' : 'bg-[var(--border-color)]'}`}></div>
                                 <span className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-widest group-hover:text-[var(--text-primary)] transition-colors">{item.label}</span>
                              </div>
                              <span className="text-[11px] font-mono font-black text-[var(--text-primary)]">{item.pct}%</span>
                           </div>
                           <div className="h-1 w-full bg-[var(--bg-main)] rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${i === 0 ? 'bg-[var(--accent-primary)]' : i === 1 ? 'bg-sky-500' : i === 2 ? 'bg-emerald-500' : 'bg-[var(--border-color)]'}`} style={{ width: `${item.pct}%` }}></div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>

         {/* SECCIÓN TABLAS */}
         <div className="card-premium border border-[var(--border-color)] shadow-xl rounded-[2rem] flex flex-col overflow-hidden min-h-[600px] print:block">
            <div className="flex border-b border-[var(--border-color)]/50 px-6 pt-6 gap-4 bg-[var(--bg-sidebar)]/30 print:hidden">
               <button onClick={() => setActiveTab('diario')} className={`px-6 py-4 rounded-t-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'diario' ? 'bg-[var(--bg-card)] text-[var(--accent-primary)] shadow-sm border border-[var(--border-color)] border-b-transparent relative top-[1px]' : 'text-[var(--text-secondary)] opacity-60 hover:opacity-100 hover:bg-[var(--bg-main)]'}`}>
                  <List size={16} /> Libro Diario
               </button>
               <button onClick={() => setActiveTab('profesionales')} className={`px-6 py-4 rounded-t-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'profesionales' ? 'bg-[var(--bg-card)] text-[var(--accent-primary)] shadow-sm border border-[var(--border-color)] border-b-transparent relative top-[1px]' : 'text-[var(--text-secondary)] opacity-60 hover:opacity-100 hover:bg-[var(--bg-main)]'}`}>
                  <Users size={16} /> Honorarios Personal
               </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar bg-[var(--bg-card)]">

               {activeTab === 'diario' && (
                  <table className="w-full text-left border-collapse animate-fade-in-quick">
                     <thead>
                        <tr className="border-b border-[var(--border-color)]/50">
                           <th className="py-5 px-3 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60">Fecha / Hora</th>
                           <th className="py-5 px-3 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60">Detalle</th>
                           <th className="py-5 px-3 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 hidden sm:table-cell">Medio</th>
                           <th className="py-5 px-3 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 text-right">Monto Neto</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-[var(--border-color)]/30">
                        {(transactions || []).sort((a, b) => new Date(b.date) - new Date(a.date)).map(tx => (
                           <tr key={tx.id} className="hover:bg-[var(--bg-main)]/50 transition-colors group">
                              <td className="py-5 px-3 text-xs font-bold text-[var(--text-secondary)] font-mono">
                                 {new Date(tx.date).toLocaleDateString()}
                              </td>
                              <td className="py-5 px-3 font-black text-[var(--text-primary)] text-sm">
                                 <div className="flex items-center gap-2">
                                    {tx.concept}
                                    {tx.afip_cae && (
                                       <div className="bg-indigo-500/10 text-indigo-500 p-1 rounded-md cursor-help" title={`Factura AFIP N° ${tx.afip_nro}\nCAE: ${tx.afip_cae}`}>
                                          <Landmark size={12} />
                                       </div>
                                    )}
                                 </div>
                              </td>
                              <td className="py-5 px-3 hidden sm:table-cell"><span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest px-3 py-1.5 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)] group-hover:border-[var(--accent-primary)]/30 transition-colors">{tx.method}</span></td>
                              <td className={`py-5 px-3 text-right text-base font-black ${tx.type === 'Ingreso' ? 'text-[var(--accent-primary)]' : 'text-red-500'}`}>
                                 {tx.type === 'Ingreso' ? '+' : '-'}{formatMoney(tx.amount)}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               )}

               {activeTab === 'profesionales' && (
                  <div className="space-y-12 animate-fade-in-quick">
                     <div>
                        <h4 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-6 flex items-center gap-2 opacity-70">
                           <Activity size={14} className="text-[var(--accent-primary)]" /> Rendimiento Clínico (Médicos)
                        </h4>
                        <table className="w-full text-left border-collapse">
                           <thead>
                              <tr className="border-b border-[var(--border-color)]/50">
                                 <th className="py-4 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 w-1/3">Profesional</th>
                                 <th className="py-4 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 text-center">T. Atendidos</th>
                                 <th className="py-4 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 text-center hidden sm:table-cell">Ocupación</th>
                                 <th className="py-4 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 text-right">Fact. Bruta</th>
                                 <th className="py-4 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 text-right">Hon. Pend.</th>
                                 <th className="py-4 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 text-center w-24">Acción</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-[var(--border-color)]/30">
                              {doctors.map(doc => {
                                 const turnos = appointments.filter(a => a.doctorId === doc.id && (a.attendance === 'confirmado' || a.attendance === 'finalizado')).length;
                                 const facturacion = transactions
                                    .filter(t => t.doctor_id === doc.id && t.type === 'Ingreso')
                                    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
                                 const pagado = transactions
                                    .filter(t => t.doctor_id === doc.id && t.type === 'Egreso' && t.concept.includes('Honorarios'))
                                    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

                                 const porc = doc.remuneration_type === 'porcentaje' ? (Number(doc.remuneration) || 0) : 0;
                                 const honorariosTotales = (facturacion * porc) / 100;
                                 const deuda = doc.remuneration_type === 'porcentaje' ? Math.max(0, honorariosTotales - pagado) : 0;
                                 const occ = turnos > 0 ? `${Math.min(100, Math.round((turnos / 20) * 100))}%` : "0%";

                                 return (
                                    <tr key={doc.id} className="hover:bg-[var(--bg-main)]/50 transition-colors group">
                                       <td className="py-5 px-2">
                                          <div className="flex items-center gap-4">
                                             <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-[var(--accent-primary)] text-sm font-black bg-[var(--accent-light)] border border-[var(--accent-primary)]/20">{doc.name.charAt(0)}</div>
                                             <div>
                                                <div className="text-sm font-black text-[var(--text-primary)]">{doc.name}</div>
                                                <div className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60">{doc.specialty} <span className="text-[var(--accent-primary)] ml-1 font-mono">[{porc}%]</span></div>
                                             </div>
                                          </div>
                                       </td>
                                       <td className="py-5 px-2 text-center text-sm font-black text-[var(--text-primary)]">{turnos}</td>
                                       <td className="py-5 px-2 text-center hidden sm:table-cell text-xs font-bold text-[var(--text-secondary)] font-mono">{occ}</td>
                                       <td className="py-5 px-2 text-right text-sm font-black text-[var(--text-secondary)] tracking-tighter">{formatMoney(facturacion)}</td>
                                       <td className={`py-5 px-2 text-right text-sm font-black ${deuda > 0 ? 'text-red-500' : 'text-emerald-500'} tracking-tighter`}>
                                          {doc.remuneration_type === 'porcentaje' ? formatMoney(deuda) : '-'}
                                       </td>
                                       <td className="py-5 px-2 text-center text-right pr-4">
                                          {doc.remuneration_type === 'porcentaje' && deuda > 0 ? (
                                             <button onClick={() => setSettlementDoctor({ ...doc, pendingAmount: deuda })} className="bg-[var(--accent-primary)] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-[var(--accent-primary)]/20 hover:scale-105 active:scale-95">Liquidar</button>
                                          ) : doc.remuneration_type === 'porcentaje' ? (
                                             <div className="flex items-center justify-center gap-1.5 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Saldado
                                             </div>
                                          ) : <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase opacity-20">-</span>}
                                       </td>
                                    </tr>
                                 );
                              })}
                           </tbody>
                        </table>
                     </div>

                     <div>
                        <h4 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-6 flex items-center gap-2 opacity-70">
                           <Briefcase size={14} className="text-[var(--accent-primary)]" /> Personal Administrativo
                        </h4>
                        <table className="w-full text-left border-collapse">
                           <thead>
                              <tr className="border-b border-[var(--border-color)]/50">
                                 <th className="py-4 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 w-1/3">Empleado/a</th>
                                 <th className="py-4 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 text-center">Función / Rol</th>
                                 <th className="py-4 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 text-right">Costo Operativo</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-[var(--border-color)]/30">
                              {adminStaff.map(emp => (
                                 <tr key={emp.id} className="hover:bg-[var(--bg-main)]/50 transition-colors">
                                    <td className="py-5 px-2 flex items-center gap-4">
                                       <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-[var(--text-secondary)] text-sm font-black bg-[var(--bg-main)] border border-[var(--border-color)]">{emp.name.charAt(0)}</div>
                                       <div className="text-sm font-black text-[var(--text-primary)]">{emp.name}</div>
                                    </td>
                                    <td className="py-5 px-2 text-center text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest italic opacity-70">{emp.role}</td>
                                    <td className="py-5 px-2 text-right text-sm font-black text-[var(--text-primary)]">{emp.remunerationType === 'fijo' ? formatMoney(emp.remuneration) : 'Variable (%)'}</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}
            </div>
         </div>

         {/* MODAL DE LIQUIDACIO */}
         {settlementDoctor && (
            <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in-quick">
               <div className="bg-[var(--bg-card)] rounded-[3rem] w-full max-w-md shadow-2xl relative overflow-hidden border border-[var(--glass-border)] p-10">
                  <div className="w-16 h-16 bg-[var(--accent-light)] rounded-[2rem] flex items-center justify-center mb-8 text-[var(--accent-primary)] shadow-inner"><Wallet size={32} /></div>
                  <h3 className="text-2xl font-black text-[var(--text-primary)] mb-2 tracking-tight">Liquidar Honorarios</h3>
                  <p className="text-sm font-medium text-[var(--text-secondary)] mb-8 leading-relaxed">Estás por registrar el pago de honorarios profesionales para <strong className="text-[var(--text-primary)]">{settlementDoctor.name}</strong>.</p>
                  <div className="bg-[var(--bg-main)] rounded-2xl p-6 border border-[var(--border-color)] mb-10 shadow-inner">
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Importe Pendiente</span>
                        <span className="text-3xl font-black text-red-500 font-mono tracking-tighter">{formatMoney(settlementDoctor.pendingAmount)}</span>
                     </div>
                  </div>
                  <div className="flex gap-4">
                     <button onClick={() => setSettlementDoctor(null)} className="flex-1 py-4 text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest hover:text-[var(--text-primary)] transition-colors">Abortar</button>
                     <button onClick={async () => {
                        await store.createTransaction({
                           date: new Date().toISOString(),
                           type: 'Egreso',
                           concept: `Cierre de Honorarios — ${settlementDoctor.name}`,
                           method: 'Transferencia',
                           amount: Number(settlementDoctor.pendingAmount),
                           category: 'Sueldos',
                           doctor_id: settlementDoctor.id
                        });
                        setSettlementDoctor(null);
                        setToastMsg(`✔  Liquidación de ${settlementDoctor.name} registrada.`);
                        setTimeout(() => setToastMsg(''), 3000);
                     }} className="flex-2 px-8 py-4 bg-[var(--accent-primary)] text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-[var(--accent-primary)]/20 active:scale-95 transition-all">Confirmar Liquidación</button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}
