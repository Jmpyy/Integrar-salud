import { useEffect, useState } from 'react';
import { useStore } from '../../../stores/useStore';
import {
  BarChart3, TrendingUp, Users, CalendarDays, Wallet,
  ArrowUpRight, ArrowDownRight, Activity, PieChart,
  Percent, DollarSign, UserCheck, AlertTriangle, CreditCard, Clock,
  ChevronLeft, ChevronRight
} from 'lucide-react';

import CustomDateRangePicker from '../../../components/ui/CustomDateRangePicker';

export default function ReportesPage() {
  const store = useStore();
  const { appointments, transactions, patients, doctors } = store;
  const [loading, setLoading] = useState(true);
  
  // Nuevo estado para el filtro de mes/año o rango
  const [filterMode, setFilterMode] = useState('mes'); // 'mes' o 'rango'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [customRange, setCustomRange] = useState({ dateFrom: '', dateTo: '' });

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      
      let dateFrom, dateTo;
      const f = (d) => {
         const dObj = new Date(d);
         dObj.setMinutes(dObj.getMinutes() - dObj.getTimezoneOffset());
         return dObj.toISOString().split('T')[0];
      };

      if (filterMode === 'mes') {
        const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        dateFrom = f(firstDay);
        dateTo = f(lastDay);
      } else if (filterMode === 'rango' && customRange.dateFrom && customRange.dateTo) {
        dateFrom = customRange.dateFrom;
        dateTo = customRange.dateTo;
      } else if (filterMode === 'rango') {
        setLoading(false);
        return; // Esperar selección
      }

      await Promise.all([
        store.fetchAppointments({ dateFrom, dateTo }),
        store.fetchTransactions({ dateFrom, dateTo }),
        store.fetchPatients(),
        store.fetchDoctors()
      ]);
      setLoading(false);
    };
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, filterMode, customRange]);

  const now = new Date();
  
  const isRangeMode = filterMode === 'rango' && customRange.dateFrom && customRange.dateTo;
  
  // Helpers de filtro
  const isInRange = (dStr) => {
     if (!dStr) return false;
     const dStrLocal = dStr.split('T')[0].split(' ')[0];
     if (isRangeMode) {
        return dStrLocal >= customRange.dateFrom && dStrLocal <= customRange.dateTo;
     } else {
        const d = new Date(dStrLocal + 'T12:00:00Z');
        return d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
     }
  };

  const formatMoney = (v) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(v || 0);

  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();

  // Stats Helpers
  const getTxMonth = (t) => {
    const safeDateStr = typeof t.date === 'string' ? t.date.replace(' ', 'T') : t.date;
    return new Date(safeDateStr);
  };

  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(currentYear, currentMonth - (5 - i), 1);
    return { label: d.toLocaleDateString('es-AR', { month: 'short' }), month: d.getMonth(), year: d.getFullYear() };
  });

  const incomeByMonth = last6Months.map(({ month, year }) =>
    (transactions || [])
      .filter(t => t.type === 'Ingreso' && getTxMonth(t).getMonth() === month && getTxMonth(t).getFullYear() === year)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)
  );

  const thisMonthApps = (appointments || []).filter(a => !a.isBlock && isInRange(a.date));

  const completedApps = thisMonthApps.filter(a => a.attendance === 'finalizado');
  
  const thisMonthIncome = (transactions || [])
    .filter(t => t.type === 'Ingreso' && isInRange(t.date))
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
  const lastMonthIncome = isRangeMode ? 0 : (incomeByMonth[4] || 0);
  
  const growthRate = lastMonthIncome === 0 
    ? (thisMonthIncome > 0 ? 100 : 0) 
    : Math.round(((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100);

  // BUSINESS METRICS
  const ticketPromedio = completedApps.length > 0 ? (thisMonthIncome / completedApps.length) : 0;
  
  const ausentesApps = thisMonthApps.filter(a => a.attendance === 'ausente');
  const ausentismoRate = thisMonthApps.length > 0 
    ? (ausentesApps.length / thisMonthApps.length * 100).toFixed(1)
    : 0;

  const paidApps = completedApps.filter(a => a.paymentStatus === 'pagado' || a.paymentStatus === 'señado');
  const capacidadCobro = completedApps.length > 0 
    ? Math.round((paidApps.length / completedApps.length) * 100)
    : 0;

  const totalPatients = (patients || []).length;
  const newPatientsThisMonth = (patients || []).filter(p => isInRange(p.created_at)).length;

  // FUGAS DE DINERO (Alerts)
  const unpaidCompletedApps = completedApps.filter(a => a.paymentStatus !== 'pagado');
  const fugaDeDinero = unpaidCompletedApps.reduce((sum, a) => {
    const total = Number(a.paymentAmount) > 0 ? Number(a.paymentAmount) : 35000;
    const paid = Number(a.paidAmount || 0);
    return sum + (total - paid);
  }, 0);

  const dineroPerdidoAusencias = ausentesApps.reduce((sum, a) => {
    const total = Number(a.paymentAmount) > 0 ? Number(a.paymentAmount) : 35000;
    return sum + total;
  }, 0);

  // MEDIOS DE PAGO
  const thisMonthTransactions = (transactions || []).filter(t => t.type === 'Ingreso' && isInRange(t.date));
  const incomeByMethod = thisMonthTransactions.reduce((acc, t) => {
    acc[t.method || 'Efectivo'] = (acc[t.method || 'Efectivo'] || 0) + Number(t.amount || 0);
    return acc;
  }, {});

  // ABSENTEEISM BY DAY OF WEEK (0 = Sunday, 1 = Monday...)
  const absenteeismByDay = Array(7).fill(0);
  const totalAppsByDay = Array(7).fill(0);
  
  thisMonthApps.forEach(a => {
    const safeDateStr = a.date.split(' ')[0].split('T')[0];
    const d = new Date(safeDateStr + 'T12:00:00Z').getDay();
    totalAppsByDay[d]++;
    if (a.attendance === 'ausente' || a.attendance === 'suspended') {
      absenteeismByDay[d]++;
    }
  });

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const absenteeismRatesByDay = absenteeismByDay.map((abs, i) => ({
    day: dayNames[i],
    rate: totalAppsByDay[i] > 0 ? Math.round((abs / totalAppsByDay[i]) * 100) : 0,
    total: totalAppsByDay[i],
    absent: abs
  }));
  
  const maxAbsenteeismRate = Math.max(...absenteeismRatesByDay.map(d => d.rate), 1);
  const maxIncomeMonth = Math.max(...incomeByMonth, 1);

  // Doctors Profitability (based on REAL transactions)
  const profitabilityByDoc = (doctors || []).map(doc => {
    const docTxs = (transactions || [])
      .filter(t => t.doctor_id === doc.id && t.type === 'Ingreso' && isInRange(t.date));
    
    return {
      name: doc.name,
      income: docTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0),
      count: (appointments || []).filter(a => a.doctorId === doc.id && a.attendance === 'finalizado' && isInRange(a.date)).length
    };
  }).sort((a, b) => b.income - a.income);

  const maxProfit = Math.max(...profitabilityByDoc.map(d => d.income), 1);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-bold animate-pulse">Generando reporte de inteligencia...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-quick pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 glass-effect p-6 rounded-[2rem] border border-[var(--glass-border)] shadow-[var(--glass-shadow)] relative z-[100]">
        <div className="absolute inset-0 rounded-[2rem] overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent-light)] rounded-full blur-3xl opacity-10 -translate-y-1/2 translate-x-1/2"></div>
        </div>
        
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-[var(--accent-primary)] rounded-xl shadow-lg shadow-[var(--accent-primary)]/20">
              <BarChart3 size={24} className="text-white" />
            </div>
            Reportes
          </h2>
          <p className="text-sm text-[var(--text-secondary)] font-medium mt-1">Métricas y estadísticas del consultorio</p>
        </div>
        
        {/* SELECTOR DE FILTRO */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto relative z-10">
           {/* Botones de Modo */}
           <div className="flex bg-[var(--bg-main)] p-1 rounded-2xl border border-[var(--border-color)]">
              <button 
                 onClick={() => setFilterMode('mes')}
                 className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${filterMode === 'mes' ? 'bg-[var(--accent-primary)] text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                 Por Mes
              </button>
              <button 
                 onClick={() => setFilterMode('rango')}
                 className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${filterMode === 'rango' ? 'bg-[var(--accent-primary)] text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                 Rango
              </button>
           </div>

           {/* Selector según modo */}
           {filterMode === 'mes' ? (
              <div className="flex items-center gap-2 bg-[var(--bg-main)] p-1.5 rounded-[1.25rem] border border-[var(--border-color)] shadow-sm animate-fade-in-quick">
                 <button 
                   onClick={() => {
                     const newDate = new Date(selectedDate);
                     newDate.setMonth(newDate.getMonth() - 1);
                     setSelectedDate(newDate);
                   }}
                   className="p-2 rounded-xl hover:bg-[var(--bg-card)] hover:shadow-sm transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                 >
                   <ChevronLeft size={18} />
                 </button>
                 
                 <div className="flex items-center gap-2 px-2 min-w-[140px] justify-center">
                   <CalendarDays size={16} className="text-[var(--accent-primary)]" />
                   <span className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest font-mono">
                     {selectedDate.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}
                   </span>
                 </div>

                 <button 
                   onClick={() => {
                     const newDate = new Date(selectedDate);
                     newDate.setMonth(newDate.getMonth() + 1);
                     if (newDate <= now) {
                       setSelectedDate(newDate);
                     }
                   }}
                   disabled={selectedDate.getMonth() === now.getMonth() && selectedDate.getFullYear() === now.getFullYear()}
                   className={`p-2 rounded-xl transition-all ${
                     selectedDate.getMonth() === now.getMonth() && selectedDate.getFullYear() === now.getFullYear() 
                     ? 'opacity-30 cursor-not-allowed text-[var(--text-secondary)]' 
                     : 'hover:bg-[var(--bg-card)] hover:shadow-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                   }`}
                 >
                   <ChevronRight size={18} />
                 </button>
              </div>
           ) : (
              <div className="min-w-[220px] animate-fade-in-quick">
                 <CustomDateRangePicker 
                    dateFrom={customRange.dateFrom} 
                    dateTo={customRange.dateTo} 
                    onChange={setCustomRange} 
                    className="bg-[var(--bg-main)] border border-[var(--border-color)] shadow-sm text-xs font-bold px-4 py-2.5 rounded-[1.25rem] h-full"
                 />
              </div>
           )}
        </div>
      </div>

      {/* Primary KPIs - Business Owner Focus */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className="card-premium p-4 sm:p-6 border border-[var(--glass-border)] shadow-sm hover:translate-y-[-4px] transition-all group relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-3 sm:p-4">
            {!isRangeMode && (
              growthRate > 0 ? (
                <span className="flex items-center text-[9px] sm:text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
                  <ArrowUpRight size={14} className="mr-1 hidden sm:block" /> +{growthRate}%
                </span>
              ) : growthRate < 0 ? (
                <span className="flex items-center text-[9px] sm:text-[10px] font-black text-rose-500 bg-rose-500/10 px-2 py-1 rounded-lg">
                  <ArrowDownRight size={14} className="mr-1 hidden sm:block" /> {growthRate}%
                </span>
              ) : (
                <span className="flex items-center text-[9px] sm:text-[10px] font-black text-slate-500 bg-slate-500/10 px-2 py-1 rounded-lg">
                  =
                </span>
              )
            )}
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500/10 text-emerald-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 shadow-sm group-hover:scale-110 transition-transform">
            <DollarSign size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-[9px] sm:text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-70">Ingresos Totales</p>
            <p className="text-xl sm:text-2xl font-black text-[var(--text-primary)] mt-1 tracking-tighter truncate">{formatMoney(thisMonthIncome)}</p>
            <p className="text-[10px] sm:text-xs font-bold text-[var(--text-secondary)] mt-1 opacity-80">Caja actual</p>
          </div>
        </div>

        {[
          { 
            label: 'Ticket Promedio', 
            value: formatMoney(ticketPromedio), 
            sub: 'Por sesión', 
            icon: TrendingUp, color: 'text-[var(--accent-primary)]', bg: 'bg-[var(--accent-primary)]/10' 
          },
          { 
            label: 'Tasa Ausentismo', 
            value: `${ausentismoRate}%`, 
            sub: `${ausentesApps.length} turnos perdidos`, 
            icon: Percent, color: 'text-rose-500', bg: 'bg-rose-500/10' 
          },
          { 
            label: 'Nuevos Pacientes', 
            value: newPatientsThisMonth, 
            sub: `Total: ${totalPatients}`, 
            icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' 
          },
        ].map((kpi, i) => (
          <div key={i} className="card-premium p-4 sm:p-6 border border-[var(--glass-border)] shadow-sm hover:translate-y-[-4px] transition-all group flex flex-col justify-between">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 ${kpi.bg} ${kpi.color} rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 shadow-sm group-hover:scale-110 transition-transform`}>
              <kpi.icon size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[9px] sm:text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-70 truncate">{kpi.label}</p>
              <p className="text-xl sm:text-2xl font-black text-[var(--text-primary)] mt-1 tracking-tighter truncate">{kpi.value}</p>
              <p className="text-[10px] sm:text-xs font-bold text-[var(--text-secondary)] mt-1 opacity-80 truncate">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ALERTAS DE FUGA DE DINERO & MEDIOS DE PAGO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas Fuga de Dinero */}
        <div className="bg-gradient-to-br from-rose-500/10 to-rose-900/5 border border-rose-500/20 p-6 sm:p-8 rounded-[2rem] shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <h3 className="text-lg font-black text-rose-500 mb-6 flex items-center gap-3 tracking-tight">
            <AlertTriangle size={22} className="animate-pulse drop-shadow-md" /> Alertas de Cobro
          </h3>
          <div className="space-y-3 sm:space-y-4 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 bg-[var(--bg-card)] rounded-[1.5rem] border border-rose-500/10 shadow-sm transition-transform hover:scale-[1.02] gap-3">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl shadow-inner"><Wallet size={20} /></div>
                <div>
                  <p className="font-bold text-[var(--text-primary)] text-sm leading-tight">Sesiones impagas</p>
                  <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider opacity-60 mt-0.5">
                    {unpaidCompletedApps.length} finalizados sin cobrar
                  </p>
                </div>
              </div>
              <div className="sm:text-right bg-rose-500/5 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                <p className="text-lg font-black text-rose-500">{formatMoney(fugaDeDinero)}</p>
                <p className="text-[9px] font-black text-rose-500/60 uppercase tracking-widest mt-0.5">Dinero en riesgo</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 bg-[var(--bg-card)] rounded-[1.5rem] border border-orange-500/10 shadow-sm transition-transform hover:scale-[1.02] gap-3">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl shadow-inner"><Clock size={20} /></div>
                <div>
                  <p className="font-bold text-[var(--text-primary)] text-sm leading-tight">Pérdida por Ausencias</p>
                  <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider opacity-60 mt-0.5">
                    {ausentesApps.length} turnos desperdiciados
                  </p>
                </div>
              </div>
              <div className="sm:text-right bg-orange-500/5 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                <p className="text-lg font-black text-orange-500">{formatMoney(dineroPerdidoAusencias)}</p>
                <p className="text-[9px] font-black text-orange-500/60 uppercase tracking-widest mt-0.5">Costo oportunidad</p>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Efficiency & Payment Methods */}
        {/* Operational Efficiency & Payment Methods */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 sm:p-8 rounded-[2rem] text-white shadow-2xl shadow-indigo-900/20 border border-indigo-500/20 relative overflow-hidden flex flex-col justify-center">
          <div className="relative z-10">
            <h3 className="text-xl font-black mb-1 tracking-tight flex items-center gap-2">
              <Activity size={22} className="text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]" /> Estado Operativo
            </h3>
            <p className="text-indigo-200/70 text-sm font-medium mb-8">Efectividad de cobranza e ingresos por método</p>
            
            <div className="space-y-8">
              <div className="bg-white/5 p-4 sm:p-5 rounded-[1.5rem] border border-white/5 backdrop-blur-sm">
                <div className="flex justify-between items-end mb-3">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-80">Capacidad de Cobro</span>
                  <span className="font-mono text-xl sm:text-2xl font-black text-emerald-400 leading-none">{capacidadCobro}%</span>
                </div>
                <div className="h-3 sm:h-4 bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.6)] relative overflow-hidden" style={{ width: `${capacidadCobro}%` }}>
                    <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', transform: 'skewX(-20deg)' }} />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 opacity-80 mb-3 ml-1">Desglose de Ingresos</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {['Efectivo', 'Transferencia', 'Tarjeta'].map(method => {
                    const amount = incomeByMethod[method] || 0;
                    const pct = thisMonthIncome > 0 ? Math.round((amount / thisMonthIncome) * 100) : 0;
                    return (
                      <div key={method} className="bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10 text-left sm:text-center transition-all hover:bg-white/10 hover:border-indigo-400/30 group flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-stretch">
                        <p className="text-[10px] sm:text-[9px] font-black text-indigo-200 uppercase tracking-widest mb-0 sm:mb-2 group-hover:text-white transition-colors">{method}</p>
                        <div className="text-right sm:text-center">
                          <p className="text-sm sm:text-base font-black text-white tracking-tight">{formatMoney(amount)}</p>
                          <p className="text-[9px] sm:text-[10px] font-bold text-indigo-400 mt-0.5 sm:mt-1">{pct}% del total</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-10 pointer-events-none" />
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500 rounded-full blur-[80px] opacity-20 pointer-events-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Profitability Column */}
        <div className="card-premium p-8 border border-[var(--glass-border)] shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Rentabilidad por Profesional</h3>
              <p className="text-sm text-[var(--text-secondary)] font-medium">Volumen de ingresos generado este mes (Transacciones reales)</p>
            </div>
            <UserCheck className="text-[var(--text-secondary)] opacity-10" size={32} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-6">
            {profitabilityByDoc.length > 0 ? profitabilityByDoc.map((doc, i) => (
              <div key={i} className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] font-black group-hover:bg-[var(--accent-light)] group-hover:text-[var(--accent-primary)] transition-all shadow-sm">
                      {doc.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-[var(--text-primary)]">{doc.name}</p>
                      <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase opacity-60 tracking-wider font-mono">{doc.count} Sesiones</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-[var(--text-primary)] tracking-tight">{formatMoney(doc.income)}</p>
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Generado</p>
                  </div>
                </div>
                <div className="h-2 bg-[var(--bg-main)] rounded-full overflow-hidden border border-[var(--border-color)]/30">
                  <div 
                    className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-hover)] rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_var(--accent-primary)]/20"
                    style={{ width: `${(doc.income / maxProfit) * 100}%` }}
                  />
                </div>
              </div>
            )) : (
              <div className="col-span-full py-12 text-center text-[var(--text-secondary)] opacity-30">
                <Activity size={48} className="mx-auto mb-4" />
                <p className="font-bold uppercase tracking-widest text-xs">No hay sesiones finalizadas aún</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ADVANCED CHARTS (BUSINESS INTELLIGENCE) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Gráfico de Ingresos de los Últimos 6 Meses */}
        <div className="card-premium p-6 sm:p-8 border border-[var(--glass-border)] shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Evolución de Ingresos</h3>
              <p className="text-xs text-[var(--text-secondary)] font-medium mt-1">Comparativa de los últimos 6 meses</p>
            </div>
            <div className="p-3 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-xl">
              <TrendingUp size={20} />
            </div>
          </div>
          
          <div className="flex-1 flex items-end gap-2 sm:gap-4 h-48 mt-4">
            {last6Months.map((m, i) => {
              const income = incomeByMonth[i] || 0;
              const heightPct = (income / maxIncomeMonth) * 100;
              const isCurrent = i === 5;
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded mb-2 whitespace-nowrap z-10 pointer-events-none shadow-xl">
                    {formatMoney(income)}
                  </div>
                  
                  {/* Bar */}
                  <div className="w-full relative flex items-end justify-center h-full">
                    <div 
                      className={`w-full max-w-[40px] rounded-t-xl transition-all duration-1000 ease-out relative overflow-hidden ${isCurrent ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700 group-hover:bg-indigo-400'}`}
                      style={{ height: `${Math.max(heightPct, 2)}%` }}
                    >
                      {isCurrent && (
                         <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', transform: 'skewX(-20deg)' }} />
                      )}
                    </div>
                  </div>
                  
                  {/* Label */}
                  <p className={`text-[10px] sm:text-xs font-black uppercase mt-3 tracking-widest ${isCurrent ? 'text-emerald-500' : 'text-[var(--text-secondary)]'}`}>
                    {m.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mapa de Calor: Ausentismo por Día */}
        <div className="card-premium p-6 sm:p-8 border border-[var(--glass-border)] shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Ausentismo por Día</h3>
              <p className="text-xs text-[var(--text-secondary)] font-medium mt-1">Qué días de la semana faltan más los pacientes</p>
            </div>
            <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
              <CalendarDays size={20} />
            </div>
          </div>
          
          <div className="flex-1 flex items-end gap-2 sm:gap-4 h-48 mt-4">
            {/* Omitimos Domingo (índice 0) si no trabajan, pero lo renderizamos de Lunes a Sábado */}
            {[1, 2, 3, 4, 5, 6].map(dayIndex => {
              const data = absenteeismRatesByDay[dayIndex];
              const heightPct = (data.rate / maxAbsenteeismRate) * 100 || 0;
              
              // Color base de la barra dependiente del %
              let barColor = 'bg-slate-200 dark:bg-slate-700';
              if (data.rate > 30) barColor = 'bg-rose-500';
              else if (data.rate > 15) barColor = 'bg-orange-400';
              else if (data.rate > 0) barColor = 'bg-amber-400';

              return (
                <div key={dayIndex} className="flex-1 flex flex-col items-center justify-end h-full group">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded mb-2 whitespace-nowrap z-10 pointer-events-none shadow-xl text-center">
                    {data.rate}% <br/>
                    <span className="text-[9px] opacity-70">{data.absent} de {data.total} turnos</span>
                  </div>
                  
                  <div className="w-full relative flex items-end justify-center h-full">
                    <div 
                      className={`w-full max-w-[40px] rounded-t-xl transition-all duration-1000 ease-out ${barColor} group-hover:brightness-110`}
                      style={{ height: `${Math.max(heightPct, 2)}%` }}
                    />
                  </div>
                  
                  <p className="text-[10px] sm:text-xs font-black uppercase mt-3 tracking-widest text-[var(--text-secondary)]">
                    {data.day}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
