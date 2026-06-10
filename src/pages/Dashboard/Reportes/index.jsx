import { useEffect, useState } from 'react';
import { useStore } from '../../../stores/useStore';
import {
  BarChart3, TrendingUp, Users, CalendarDays, Wallet,
  ArrowUpRight, ArrowDownRight, Activity, PieChart,
  Percent, DollarSign, UserCheck, AlertTriangle, CreditCard, Clock
} from 'lucide-react';

export default function ReportesPage() {
  const store = useStore();
  const { appointments, transactions, patients, doctors } = store;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        store.fetchAppointments(),
        store.fetchTransactions(),
        store.fetchPatients(),
        store.fetchDoctors()
      ]);
      setLoading(false);
    };
    loadAll();
  }, []);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const formatMoney = (v) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(v || 0);

  // Stats Helpers
  const getTxMonth = (t) => new Date(t.date);

  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(currentYear, currentMonth - (5 - i), 1);
    return { label: d.toLocaleDateString('es-AR', { month: 'short' }), month: d.getMonth(), year: d.getFullYear() };
  });

  const incomeByMonth = last6Months.map(({ month, year }) =>
    (transactions || [])
      .filter(t => t.type === 'Ingreso' && getTxMonth(t).getMonth() === month && getTxMonth(t).getFullYear() === year)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)
  );

  const thisMonthApps = (appointments || []).filter(a =>
    !a.isBlock &&
    new Date(a.date).getMonth() === currentMonth &&
    new Date(a.date).getFullYear() === currentYear
  );

  const completedApps = thisMonthApps.filter(a => a.attendance === 'finalizado');
  const thisMonthIncome = incomeByMonth[5];
  const lastMonthIncome = incomeByMonth[4] || 0;
  
  const growthRate = lastMonthIncome === 0 
    ? (thisMonthIncome > 0 ? 100 : 0) 
    : Math.round(((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100);

  // BUSINESS METRICS
  const ticketPromedio = completedApps.length > 0 ? (thisMonthIncome / completedApps.length) : 0;
  
  const ausentesApps = thisMonthApps.filter(a => a.attendance === 'ausente');
  const ausentismoRate = thisMonthApps.length > 0 
    ? (ausentesApps.length / thisMonthApps.length * 100).toFixed(1)
    : 0;

  const paidApps = completedApps.filter(a => a.paymentStatus === 'pagado' || a.paymentStatus === 'senado');
  const capacidadCobro = completedApps.length > 0 
    ? Math.round((paidApps.length / completedApps.length) * 100)
    : 0;

  const totalPatients = (patients || []).length;
  const newPatientsThisMonth = (patients || []).filter(p => {
    const d = new Date(p.created_at || new Date());
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

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
  const thisMonthTransactions = (transactions || []).filter(t => t.type === 'Ingreso' && getTxMonth(t).getMonth() === currentMonth && getTxMonth(t).getFullYear() === currentYear);
  const incomeByMethod = thisMonthTransactions.reduce((acc, t) => {
    acc[t.method || 'Efectivo'] = (acc[t.method || 'Efectivo'] || 0) + Number(t.amount || 0);
    return acc;
  }, {});

  // Doctors Profitability (based on REAL transactions)
  const profitabilityByDoc = (doctors || []).map(doc => {
    const docTxs = (transactions || [])
      .filter(t => t.doctor_id === doc.id && t.type === 'Ingreso' && getTxMonth(t).getMonth() === currentMonth && getTxMonth(t).getFullYear() === currentYear);
    
    return {
      name: doc.name,
      income: docTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0),
      count: (appointments || []).filter(a => a.doctorId === doc.id && a.attendance === 'finalizado' && new Date(a.date).getMonth() === currentMonth).length
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
      <div className="flex items-center justify-between flex-wrap gap-4 glass-effect p-6 rounded-[2rem] border border-[var(--glass-border)] shadow-[var(--glass-shadow)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent-light)] rounded-full blur-3xl opacity-10 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-[var(--accent-primary)] rounded-xl shadow-lg shadow-[var(--accent-primary)]/20">
              <BarChart3 size={24} className="text-white" />
            </div>
            Business Intelligence
          </h2>
          <p className="text-sm text-[var(--text-secondary)] font-medium mt-1">Visión estratégica y control de fugas</p>
        </div>
        <div className="flex items-center gap-3 bg-[var(--bg-main)] p-2 rounded-2xl border border-[var(--border-color)] relative z-10">
           <CalendarDays size={18} className="text-[var(--accent-primary)] ml-2" />
           <span className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest pr-2 font-mono">
             {now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
           </span>
        </div>
      </div>

      {/* Primary KPIs - Business Owner Focus */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-premium p-6 border border-[var(--glass-border)] shadow-sm hover:translate-y-[-4px] transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            {growthRate > 0 ? (
              <span className="flex items-center text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
                <ArrowUpRight size={14} className="mr-1" /> +{growthRate}% vs mes anterior
              </span>
            ) : growthRate < 0 ? (
              <span className="flex items-center text-[10px] font-black text-rose-500 bg-rose-500/10 px-2 py-1 rounded-lg">
                <ArrowDownRight size={14} className="mr-1" /> {growthRate}% vs mes anterior
              </span>
            ) : (
              <span className="flex items-center text-[10px] font-black text-slate-500 bg-slate-500/10 px-2 py-1 rounded-lg">
                = Igual al mes pasado
              </span>
            )}
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
            <DollarSign size={24} />
          </div>
          <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-70">Ingresos Mensuales</p>
          <p className="text-2xl font-black text-[var(--text-primary)] mt-1 tracking-tighter">{formatMoney(thisMonthIncome)}</p>
          <p className="text-xs font-bold text-[var(--text-secondary)] mt-1 opacity-80">Caja actual</p>
        </div>

        {[
          { 
            label: 'Ticket Promedio', 
            value: formatMoney(ticketPromedio), 
            sub: 'Por sesión finalizada', 
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
            sub: `Total Histórico: ${totalPatients}`, 
            icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' 
          },
        ].map((kpi, i) => (
          <div key={i} className="card-premium p-6 border border-[var(--glass-border)] shadow-sm hover:translate-y-[-4px] transition-all group">
            <div className={`w-12 h-12 ${kpi.bg} ${kpi.color} rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform`}>
              <kpi.icon size={24} />
            </div>
            <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-70">{kpi.label}</p>
            <p className="text-2xl font-black text-[var(--text-primary)] mt-1 tracking-tighter">{kpi.value}</p>
            <p className="text-xs font-bold text-[var(--text-secondary)] mt-1 opacity-80">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ALERTAS DE FUGA DE DINERO & MEDIOS DE PAGO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas Fuga de Dinero */}
        <div className="bg-rose-500/5 border border-rose-500/20 p-8 rounded-[2rem] shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <h3 className="text-lg font-black text-rose-500 mb-6 flex items-center gap-3 tracking-tight">
            <AlertTriangle size={22} className="animate-pulse" /> Alertas de Fuga de Dinero
          </h3>
          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between p-4 bg-[var(--bg-card)] rounded-2xl border border-rose-500/10 shadow-sm transition-transform hover:scale-[1.02]">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl"><Wallet size={20} /></div>
                <div>
                  <p className="font-bold text-[var(--text-primary)] text-sm">Sesiones sin cobrar</p>
                  <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider opacity-60">
                    {unpaidCompletedApps.length} turnos finalizados impagos
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-rose-500">{formatMoney(fugaDeDinero)}</p>
                <p className="text-[9px] font-black text-rose-500/60 uppercase tracking-widest">En riesgo</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-[var(--bg-card)] rounded-2xl border border-orange-500/10 shadow-sm transition-transform hover:scale-[1.02]">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl"><Clock size={20} /></div>
                <div>
                  <p className="font-bold text-[var(--text-primary)] text-sm">Pérdida por Ausentismo</p>
                  <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider opacity-60">
                    Horas ociosas ({ausentesApps.length} turnos)
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-orange-500">{formatMoney(dineroPerdidoAusencias)}</p>
                <p className="text-[9px] font-black text-orange-500/60 uppercase tracking-widest">Costo oportunidad</p>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Efficiency & Payment Methods */}
        <div className="bg-indigo-950 p-8 rounded-[2rem] text-white shadow-2xl shadow-indigo-500/10 border border-white/5 relative overflow-hidden flex flex-col justify-center">
          <div className="relative z-10">
            <h3 className="text-xl font-black mb-1 tracking-tight flex items-center gap-2">
              <Activity size={22} className="text-indigo-400" /> Estado Operativo
            </h3>
            <p className="text-indigo-300 text-sm font-medium mb-8">Efectividad de cobranza e ingresos por método</p>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-2 opacity-80">
                  <span>Capacidad de Cobro (Eficacia)</span>
                  <span className="font-mono text-emerald-400">{capacidadCobro}%</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full shadow-[0_0_10px_#10b981]/50" style={{ width: `${capacidadCobro}%` }} />
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 opacity-70 mb-4">Desglose de Ingresos por Método</p>
                <div className="grid grid-cols-3 gap-4">
                  {['Efectivo', 'Transferencia', 'Tarjeta'].map(method => {
                    const amount = incomeByMethod[method] || 0;
                    const pct = thisMonthIncome > 0 ? Math.round((amount / thisMonthIncome) * 100) : 0;
                    return (
                      <div key={method} className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center transition-colors hover:bg-white/10">
                        <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest mb-1">{method}</p>
                        <p className="text-sm font-black text-white">{formatMoney(amount)}</p>
                        <p className="text-[9px] font-bold text-indigo-400 mt-1">{pct}% del total</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[var(--accent-primary)] rounded-full blur-[80px] opacity-20 pointer-events-none" />
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500 rounded-full blur-[80px] opacity-10 pointer-events-none" />
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
    </div>
  );
}
