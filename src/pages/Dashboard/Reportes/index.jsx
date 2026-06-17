import { useEffect, useState } from 'react';
import { useStore } from '../../../stores/useStore';
import {
  BarChart3, TrendingUp, Users, CalendarDays, Wallet,
  ArrowUpRight, ArrowDownRight, Activity, PieChart,
  Percent, DollarSign, UserCheck, AlertTriangle, CreditCard, Clock,
  ChevronLeft, ChevronRight, Sparkles
} from 'lucide-react';
import CustomDateRangePicker from '../../../components/ui/CustomDateRangePicker';

export default function ReportesPage() {
  const store = useStore();
  const { appointments, transactions, patients, doctors } = store;
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState('mes');
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
        return;
      }

      // Asegurar que las transacciones carguen al menos los últimos 6 meses para la gráfica
      const sixMonthsAgo = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 5, 1);
      const sixMonthsAgoStr = f(sixMonthsAgo);
      const txsDateFrom = dateFrom < sixMonthsAgoStr ? dateFrom : sixMonthsAgoStr;

      await Promise.all([
        store.fetchAppointments({ dateFrom, dateTo }),
        store.fetchTransactions({ dateFrom: txsDateFrom, dateTo }),
        store.fetchPatients(),
        store.fetchDoctors()
      ]);
      setLoading(false);
    };
    loadAll();
  }, [selectedDate, filterMode, customRange]);

  const now = new Date();
  const isRangeMode = filterMode === 'rango' && customRange.dateFrom && customRange.dateTo;

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
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v || 0);

  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();

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

  const thisMonthTransactions = (transactions || []).filter(t => t.type === 'Ingreso' && isInRange(t.date));
  const incomeByMethod = thisMonthTransactions.reduce((acc, t) => {
    acc[t.method || 'Efectivo'] = (acc[t.method || 'Efectivo'] || 0) + Number(t.amount || 0);
    return acc;
  }, {});

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

  // ═══ LOADER ═══
  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="w-14 h-14 border-4 border-[var(--accent-primary)]/20 rounded-full" />
          <div className="w-14 h-14 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
        </div>
        <div className="flex flex-col items-center">
          <p className="text-[var(--text-primary)] font-black text-sm uppercase tracking-widest">Generando Reporte</p>
          <p className="text-[var(--text-secondary)] text-[10px] font-bold opacity-50 uppercase tracking-[0.2em] mt-2">Analizando datos del consultorio...</p>
        </div>
      </div>
    );
  }

  // ═══ KPIs CONFIG ═══
  const kpis = [
    {
      label: 'Ingresos Totales',
      value: formatMoney(thisMonthIncome),
      sub: 'Caja actual',
      icon: DollarSign,
      color: 'emerald',
      growth: !isRangeMode ? growthRate : null
    },
    {
      label: 'Ticket Promedio',
      value: formatMoney(ticketPromedio),
      sub: 'Por sesión',
      icon: TrendingUp,
      color: 'indigo'
    },
    {
      label: 'Tasa Ausentismo',
      value: `${ausentismoRate}%`,
      sub: `${ausentesApps.length} turnos perdidos`,
      icon: Percent,
      color: 'rose'
    },
    {
      label: 'Nuevos Pacientes',
      value: newPatientsThisMonth,
      sub: `Total: ${totalPatients}`,
      icon: Users,
      color: 'blue'
    }
  ];

  const colorMap = {
    emerald: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      border: 'border-emerald-500/20',
      text: 'text-emerald-500 dark:text-emerald-400',
      hover: 'hover:border-emerald-500/30',
      badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    },
    indigo: {
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
      border: 'border-indigo-500/20',
      text: 'text-indigo-500 dark:text-indigo-400',
      hover: 'hover:border-indigo-500/30',
      badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
    },
    rose: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/15',
      border: 'border-rose-500/20',
      text: 'text-rose-500 dark:text-rose-400',
      hover: 'hover:border-rose-500/30',
      badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
    },
    blue: {
      bg: 'bg-blue-500/10 dark:bg-blue-500/15',
      border: 'border-blue-500/20',
      text: 'text-blue-500 dark:text-blue-400',
      hover: 'hover:border-blue-500/30',
      badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-quick pb-8">
      {/* ═══ HEADER ═══ */}
      <div className="glass-effect p-5 sm:p-6 rounded-3xl shadow-[var(--glass-shadow)] border border-[var(--glass-border)] relative group">
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[var(--accent-primary)]/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50 transition-transform duration-1000 group-hover:scale-110"></div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-hover)] rounded-2xl text-white shadow-lg shadow-[var(--accent-primary)]/20 transform group-hover:rotate-6 transition-transform duration-500">
              <BarChart3 size={24} />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
                Reportes <span className="text-[var(--accent-primary)]">Clínicos</span>
              </h2>
              <p className="text-sm text-[var(--text-secondary)] font-medium opacity-70 mt-0.5">
                Métricas y estadísticas del consultorio
              </p>
            </div>
          </div>

          {/* SELECTOR DE FILTRO */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
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

            {filterMode === 'mes' ? (
              <div className="flex items-center gap-2 bg-[var(--bg-main)] p-1.5 rounded-2xl border border-[var(--border-color)] shadow-sm animate-fade-in-quick">
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
                  <span className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider">
                    {selectedDate.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}
                  </span>
                </div>

                <button
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    if (newDate <= now) setSelectedDate(newDate);
                  }}
                  disabled={selectedDate.getMonth() === now.getMonth() && selectedDate.getFullYear() === now.getFullYear()}
                  className={`p-2 rounded-xl transition-all ${selectedDate.getMonth() === now.getMonth() && selectedDate.getFullYear() === now.getFullYear()
                    ? 'opacity-30 cursor-not-allowed text-[var(--text-secondary)]'
                    : 'hover:bg-[var(--bg-card)] hover:shadow-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                >
                  <ChevronRight size={18} />
                </button>

                {/* Botón HOY */}
                {(selectedDate.getMonth() !== now.getMonth() || selectedDate.getFullYear() !== now.getFullYear()) && (
                  <button
                    onClick={() => setSelectedDate(new Date())}
                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white rounded-xl transition-all border border-[var(--accent-primary)]/20"
                  >
                    Hoy
                  </button>
                )}
              </div>
            ) : (
              <div className="min-w-[220px] animate-fade-in-quick">
                <CustomDateRangePicker
                  dateFrom={customRange.dateFrom}
                  dateTo={customRange.dateTo}
                  onChange={setCustomRange}
                  className="bg-[var(--bg-main)] border border-[var(--border-color)] shadow-sm text-xs font-bold px-4 py-2.5 rounded-2xl h-full"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ KPIs - CARRUSEL EN MÓVIL ═══ */}
      <div className="flex md:grid md:grid-cols-4 gap-3 sm:gap-4 overflow-x-auto md:overflow-visible hide-scrollbar py-2 md:py-0 snap-x snap-mandatory">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          const colors = colorMap[kpi.color];

          return (
            <div
              key={i}
              className={`card-premium rounded-2xl p-4 sm:p-5 border border-[var(--glass-border)] ${colors.hover} shrink-0 min-w-[180px] md:min-w-0 snap-start transition-all duration-300 group hover:shadow-md relative overflow-hidden flex flex-col justify-between`}
            >
              {/* Badge de crecimiento */}
              {kpi.growth !== null && kpi.growth !== undefined && (
                <div className="absolute top-3 right-3">
                  {kpi.growth > 0 ? (
                    <span className={`flex items-center gap-0.5 text-[9px] sm:text-[10px] font-black px-2 py-1 rounded-lg ${colorMap.emerald.badge}`}>
                      <ArrowUpRight size={12} /> +{kpi.growth}%
                    </span>
                  ) : kpi.growth < 0 ? (
                    <span className={`flex items-center gap-0.5 text-[9px] sm:text-[10px] font-black px-2 py-1 rounded-lg ${colorMap.rose.badge}`}>
                      <ArrowDownRight size={12} /> {kpi.growth}%
                    </span>
                  ) : (
                    <span className="flex items-center text-[9px] sm:text-[10px] font-black text-[var(--text-secondary)] bg-[var(--bg-main)] px-2 py-1 rounded-lg border border-[var(--border-color)]">
                      =
                    </span>
                  )}
                </div>
              )}

              <div className={`${colors.bg} border ${colors.border} p-2.5 sm:p-3 rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-110 w-fit`}>
                <Icon size={18} className={`${colors.text} sm:w-5 sm:h-5`} />
              </div>

              <div className="mt-3">
                <p className="text-[9px] sm:text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-70 mb-0.5">{kpi.label}</p>
                <h4 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight truncate">{kpi.value}</h4>
                <p className="text-[10px] sm:text-xs font-bold text-[var(--text-secondary)] opacity-60 mt-0.5 truncate">{kpi.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ ALERTAS + ESTADO OPERATIVO ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Alertas de Cobro */}
        <div className="card-premium p-5 sm:p-6 border border-rose-500/20 bg-rose-500/[0.02] dark:bg-rose-500/[0.03] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <h3 className="text-base sm:text-lg font-black text-rose-500 dark:text-rose-400 mb-5 flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-rose-500/10 dark:bg-rose-500/15 rounded-xl border border-rose-500/20">
              <AlertTriangle size={18} className="animate-pulse" />
            </div>
            Alertas de Cobro
          </h3>
          <div className="space-y-3 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[var(--bg-card)] rounded-2xl border border-rose-500/10 shadow-sm transition-all hover:border-rose-500/30 hover:shadow-md gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/10 dark:bg-rose-500/15 text-rose-500 dark:text-rose-400 rounded-xl border border-rose-500/20">
                  <Wallet size={18} />
                </div>
                <div>
                  <p className="font-bold text-[var(--text-primary)] text-sm">Sesiones impagas</p>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider opacity-60 mt-0.5">
                    {unpaidCompletedApps.length} finalizados sin cobrar
                  </p>
                </div>
              </div>
              <div className="sm:text-right">
                <p className="text-lg font-black text-rose-500 dark:text-rose-400">{formatMoney(fugaDeDinero)}</p>
                <p className="text-[9px] font-black text-rose-500/60 dark:text-rose-400/60 uppercase tracking-widest mt-0.5">Dinero en riesgo</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[var(--bg-card)] rounded-2xl border border-orange-500/10 shadow-sm transition-all hover:border-orange-500/30 hover:shadow-md gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-500/10 dark:bg-orange-500/15 text-orange-500 dark:text-orange-400 rounded-xl border border-orange-500/20">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="font-bold text-[var(--text-primary)] text-sm">Pérdida por Ausencias</p>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider opacity-60 mt-0.5">
                    {ausentesApps.length} turnos desperdiciados
                  </p>
                </div>
              </div>
              <div className="sm:text-right">
                <p className="text-lg font-black text-orange-500 dark:text-orange-400">{formatMoney(dineroPerdidoAusencias)}</p>
                <p className="text-[9px] font-black text-orange-500/60 dark:text-orange-400/60 uppercase tracking-widest mt-0.5">Costo oportunidad</p>
              </div>
            </div>
          </div>
        </div>

        {/* Estado Operativo - AHORA CON VARIABLES CSS */}
        <div className="card-premium p-5 sm:p-6 border border-indigo-500/20 bg-indigo-500/[0.02] dark:bg-indigo-500/[0.03] relative overflow-hidden flex flex-col">
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10">
            <h3 className="text-base sm:text-lg font-black text-[var(--text-primary)] mb-1 tracking-tight flex items-center gap-2">
              <div className="p-2 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-xl border border-indigo-500/20">
                <Activity size={18} className="text-indigo-500 dark:text-indigo-400" />
              </div>
              Estado Operativo
            </h3>
            <p className="text-xs text-[var(--text-secondary)] font-medium mb-6 ml-0.5 opacity-70">Efectividad de cobranza e ingresos por método</p>

            <div className="space-y-6">
              {/* Capacidad de Cobro */}
              <div className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-2xl border border-[var(--border-color)]/50">
                <div className="flex justify-between items-end mb-3">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-70">Capacidad de Cobro</span>
                  <span className={`font-black text-xl sm:text-2xl leading-none ${capacidadCobro >= 70 ? 'text-emerald-500' : capacidadCobro >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>
                    {capacidadCobro}%
                  </span>
                </div>
                <div className="h-3 sm:h-4 bg-[var(--bg-main)] rounded-full overflow-hidden border border-[var(--border-color)]/30">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${capacidadCobro >= 70
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                      : capacidadCobro >= 40
                        ? 'bg-gradient-to-r from-amber-500 to-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                        : 'bg-gradient-to-r from-rose-500 to-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                      }`}
                    style={{ width: `${capacidadCobro}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', transform: 'skewX(-20deg)' }} />
                  </div>
                </div>
              </div>

              {/* Desglose de Ingresos */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-70 mb-3 ml-1">Desglose de Ingresos</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { method: 'Efectivo', color: 'emerald' },
                    { method: 'Transferencia', color: 'indigo' },
                    { method: 'Tarjeta', color: 'blue' }
                  ].map(({ method, icon, color }) => {
                    const amount = incomeByMethod[method] || 0;
                    const pct = thisMonthIncome > 0 ? Math.round((amount / thisMonthIncome) * 100) : 0;
                    const colors = colorMap[color];

                    return (
                      <div key={method} className={`bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-color)]/50 text-center transition-all hover:${colors.border} hover:shadow-md group`}>
                        <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1">{method}</p>
                        <p className="text-sm font-black text-[var(--text-primary)] tracking-tight">{formatMoney(amount)}</p>
                        <p className={`text-[10px] font-bold mt-0.5 ${colors.text}`}>{pct}% del total</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ RENTABILIDAD POR PROFESIONAL ═══ */}
      <div className="card-premium p-5 sm:p-8 border border-[var(--glass-border)]">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-2">
              <div className="p-2 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-xl border border-indigo-500/20">
                <UserCheck size={18} className="text-indigo-500 dark:text-indigo-400" />
              </div>
              Rentabilidad por Profesional
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium mt-1 ml-0.5">Volumen de ingresos generado (Transacciones reales)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-6">
          {profitabilityByDoc.length > 0 ? profitabilityByDoc.map((doc, i) => (
            <div key={i} className="group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] font-black group-hover:bg-[var(--accent-light)] group-hover:text-[var(--accent-primary)] group-hover:border-[var(--accent-primary)]/30 transition-all shadow-sm">
                    {doc.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">{doc.name}</p>
                    <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase opacity-60 tracking-wider">{doc.count} Sesiones</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-[var(--text-primary)] tracking-tight">{formatMoney(doc.income)}</p>
                  <p className="text-[9px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-widest">Generado</p>
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
            <div className="col-span-full py-12 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)]/40 flex items-center justify-center">
                <Activity size={36} className="text-[var(--text-secondary)] opacity-30" />
              </div>
              <p className="font-bold text-[var(--text-primary)] opacity-70 uppercase tracking-widest text-xs">No hay sesiones finalizadas aún</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ GRÁFICOS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Evolución de Ingresos */}
        <div className="card-premium p-5 sm:p-8 border border-[var(--glass-border)] flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-base sm:text-lg font-black text-[var(--text-primary)] tracking-tight">Evolución de Ingresos</h3>
              <p className="text-xs text-[var(--text-secondary)] font-medium mt-1">Comparativa de los últimos 6 meses</p>
            </div>
            <div className="p-2.5 bg-[var(--accent-light)] text-[var(--accent-primary)] rounded-xl border border-[var(--accent-primary)]/20">
              <TrendingUp size={18} />
            </div>
          </div>

          <div className="flex-1 flex items-end gap-2 sm:gap-4 h-48 mt-4">
            {last6Months.map((m, i) => {
              const income = incomeByMonth[i] || 0;
              const heightPct = (income / maxIncomeMonth) * 100;
              const isCurrent = i === 5;

              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--bg-card)] text-[var(--text-primary)] text-[10px] font-bold px-2.5 py-1.5 rounded-lg mb-2 whitespace-nowrap z-10 pointer-events-none shadow-lg border border-[var(--border-color)]">
                    {formatMoney(income)}
                  </div>

                  {/* Bar */}
                  <div className="w-full relative flex items-end justify-center h-full">
                    <div
                      className={`w-full max-w-[40px] rounded-t-xl transition-all duration-1000 ease-out relative overflow-hidden ${isCurrent
                        ? 'bg-gradient-to-t from-emerald-500 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                        : 'bg-[var(--bg-main)] border border-[var(--border-color)]/50 group-hover:bg-[var(--accent-light)] group-hover:border-[var(--accent-primary)]/30'
                        }`}
                      style={{ height: `${Math.max(heightPct, 2)}%` }}
                    >
                      {isCurrent && (
                        <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', transform: 'skewX(-20deg)' }} />
                      )}
                    </div>
                  </div>

                  {/* Label */}
                  <p className={`text-[10px] sm:text-xs font-black uppercase mt-3 tracking-widest ${isCurrent ? 'text-emerald-500 dark:text-emerald-400' : 'text-[var(--text-secondary)]'}`}>
                    {m.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ausentismo por Día */}
        <div className="card-premium p-5 sm:p-8 border border-[var(--glass-border)] flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-base sm:text-lg font-black text-[var(--text-primary)] tracking-tight">Ausentismo por Día</h3>
              <p className="text-xs text-[var(--text-secondary)] font-medium mt-1">Qué días faltan más los pacientes</p>
            </div>
            <div className="p-2.5 bg-rose-500/10 dark:bg-rose-500/15 text-rose-500 dark:text-rose-400 rounded-xl border border-rose-500/20">
              <CalendarDays size={18} />
            </div>
          </div>

          <div className="flex-1 flex items-end gap-2 sm:gap-4 h-48 mt-4">
            {[1, 2, 3, 4, 5, 6].map(dayIndex => {
              const data = absenteeismRatesByDay[dayIndex];
              const heightPct = (data.rate / maxAbsenteeismRate) * 100 || 0;

              let barColor, barShadow;
              if (data.rate > 30) {
                barColor = 'bg-gradient-to-t from-rose-500 to-rose-400';
                barShadow = 'shadow-[0_0_15px_rgba(244,63,94,0.3)]';
              } else if (data.rate > 15) {
                barColor = 'bg-gradient-to-t from-orange-500 to-orange-400';
                barShadow = 'shadow-[0_0_15px_rgba(249,115,22,0.3)]';
              } else if (data.rate > 0) {
                barColor = 'bg-gradient-to-t from-amber-500 to-amber-400';
                barShadow = 'shadow-[0_0_15px_rgba(245,158,11,0.3)]';
              } else {
                barColor = 'bg-[var(--bg-main)] border border-[var(--border-color)]/50';
                barShadow = '';
              }

              return (
                <div key={dayIndex} className="flex-1 flex flex-col items-center justify-end h-full group">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--bg-card)] text-[var(--text-primary)] text-[10px] font-bold px-2.5 py-1.5 rounded-lg mb-2 whitespace-nowrap z-10 pointer-events-none shadow-lg border border-[var(--border-color)] text-center">
                    {data.rate}% <br />
                    <span className="text-[9px] opacity-60">{data.absent} de {data.total}</span>
                  </div>

                  <div className="w-full relative flex items-end justify-center h-full">
                    <div
                      className={`w-full max-w-[40px] rounded-t-xl transition-all duration-1000 ease-out ${barColor} ${barShadow} group-hover:brightness-110`}
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
