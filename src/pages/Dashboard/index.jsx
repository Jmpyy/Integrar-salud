import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Users,
  Sparkles,
  Wallet,
  Plus,
  Clock,
  MoreVertical,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Activity,
  BarChart as BarChartIcon,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { toast } from 'react-hot-toast';
import { useStore } from '../../stores/useStore';
import { nowForAPI } from '../../utils/helpers';

export default function DashboardPage() {
  const store = useStore();
  const navigate = useNavigate();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const appointments = useMemo(() => store.appointments || [], [store.appointments]);
  const doctors = useMemo(() => store.doctors || [], [store.doctors]);
  const transactions = useMemo(() => store.transactions || [], [store.transactions]);
  const patients = useMemo(() => store.patients || [], [store.patients]);
  const userRole = store.userRole;
  const dashboardNote = store.dashboardNote;

  // Estado local para la nota personal (para autosave)
  const [noteContent, setNoteContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Helper de fecha
  const getLocalDayString = (date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };
  const todayString = getLocalDayString(new Date());

  const todaysAppointments = (appointments || [])
    .filter(app => app && app.id && app.date === todayString)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  // Reloj en tiempo real para el Dashboard
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');

    // Rango del mes actual → para turnos y KPIs del día
    const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayCurrentMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const dateFromMonth = `${firstDayCurrentMonth.getFullYear()}-${pad(firstDayCurrentMonth.getMonth() + 1)}-01`;
    const dateTo        = `${lastDayCurrentMonth.getFullYear()}-${pad(lastDayCurrentMonth.getMonth() + 1)}-${pad(lastDayCurrentMonth.getDate())}`;

    // Rango de los últimos 4 meses → para el gráfico histórico de ingresos
    const firstDayChart  = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const dateFromChart  = `${firstDayChart.getFullYear()}-${pad(firstDayChart.getMonth() + 1)}-01`;

    store.fetchAppointments({ dateFrom: dateFromMonth, dateTo });
    store.fetchDoctors();
    if (['admin', 'administracion'].includes(store.userRole)) {
      // Cargamos los últimos 4 meses de transacciones para tener
      // datos históricos disponibles en el gráfico aunque cambie el mes
      store.fetchTransactions({ dateFrom: dateFromChart, dateTo });
    }
    store.fetchPatients();
    store.fetchDashboardNote();

    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync initial note from store only once or when not dirty
  useEffect(() => {
    if (dashboardNote !== undefined && !isDirty) {
      setNoteContent(dashboardNote);
    }
  }, [dashboardNote, isDirty]);

  // Autosave with debounce
  useEffect(() => {
    if (!isDirty) return;

    const timer = setTimeout(async () => {
      setIsSaving(true);
      try {
        await store.updateDashboardNote(noteContent);
        setIsDirty(false);
      } catch (error) {
        console.error("Autosave failed", error);
      } finally {
        setIsSaving(false);
      }
    }, 3000); // 3 seconds of inactivity

    return () => clearTimeout(timer);
  }, [noteContent, isDirty]);

  // Estado del dropdown
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [senasInput, setSenasInput] = useState({ appId: null, value: '' }); // inline seña input
  const [abonadoInput, setAbonadoInput] = useState(null); // inline abonado method selector

  const handleSendWhatsApp = (app) => {
    if (!app) return;
    const patientRecord = store.patients.find(p => p.id === app.patientId || p.name === app.patient);
    const phone = app.phone || patientRecord?.phone || app.patientPhone;
    
    if (!phone) {
      toast.error('El paciente no tiene un teléfono registrado');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('54') ? cleanPhone : `549${cleanPhone}`;

    // Obtener plantilla y datos
    const config = store.globalConfig || {};
    const template = config.whatsappTemplate || "Hola *{patient}*, te recordamos tu turno para el día *{date}* a las *{time}hs*.";
    
    const message = template
      .replace(/{patient}/g, app.patient)
      .replace(/{date}/g, new Date(app.date + 'T12:00:00').toLocaleDateString('es-AR'))
      .replace(/{time}/g, app.time)
      .replace(/{doctor}/g, doctors.find(d => d.id === app.doctorId)?.name || 'Profesional')
      .replace(/{clinic}/g, config.businessName || 'Integrar Salud');

    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Helper para determinar el estado visual del turno basado en la hora
  const getAppointmentStatus = (app) => {
    if (app.attendance === 'suspended') return 'suspended';
    if (app.attendance === 'ausente') return 'suspended';
    
    const [hours, minutes] = app.time.split(':').map(Number);
    const appDate = new Date();
    appDate.setHours(hours, minutes, 0, 0);
    
    const endAppDate = new Date(appDate.getTime() + app.duration * 3600000);

    // If marked explicitly as finished, respect that
    if (app.attendance === 'finalizado') return 'finished';

    if (currentTime > endAppDate) return 'finished';
    if (currentTime >= appDate && currentTime <= endAppDate) return 'in_progress';
    return 'upcoming';
  };

  const todaysPatientAppointments = todaysAppointments.filter(app => !app.isBlock);

  // Cálculos de la barra de progreso (solo turnos de pacientes)
  const completedCount = todaysPatientAppointments.filter(app => getAppointmentStatus(app) === 'finished').length;
  const progressPercentage = todaysPatientAppointments.length > 0 ? Math.round((completedCount / todaysPatientAppointments.length) * 100) : 0;

  // Cálculos dinámicos para Stats
  const formatMoney = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(val);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyIncome = transactions
    .filter(t => t.type === 'Ingreso')
    .filter(t => {
       const d = new Date(t.date);
       return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  const newPatientsThisMonth = patients
    .filter(p => {
       const d = new Date(p.created_at || new Date());
       return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

  const isAdmin = userRole === 'admin';
  const canViewFinances = ['admin', 'administracion'].includes(userRole);

  // Métricas alternativas para no-admins
  const todaysPatientCount = todaysPatientAppointments.length;
  const assistedTodayCount = todaysPatientAppointments.filter(a => a.attendance === 'finalizado').length;

  const stats = [
    { 
      title: "Turnos Hoy", 
      value: todaysPatientCount.toString(), 
      trend: "Hoy", 
      isPositive: true, 
      icon: CalendarDays, 
      color: "bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400 border border-sky-100 dark:border-sky-800" 
    },
    { 
      title: canViewFinances ? "Honorarios Mes" : "Asistencias Hoy", 
      value: canViewFinances ? formatMoney(monthlyIncome) : assistedTodayCount.toString(), 
      trend: canViewFinances ? "Real" : "Clínico", 
      isPositive: true, 
      icon: canViewFinances ? Wallet : CheckCircle2, 
      color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800" 
    },
    { 
      title: "Pacientes Nuevos", 
      value: newPatientsThisMonth.toString(), 
      trend: "Mes", 
      isPositive: true, 
      icon: Users, 
      color: "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-100 dark:border-blue-800" 
    },
    { 
      title: "Consultas Totales", 
      value: appointments.filter(a => !a.isBlock).length.toString(), 
      trend: "Hist.", 
      isPositive: true, 
      icon: Activity, 
      color: "bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 border border-purple-100 dark:border-purple-800" 
    },
  ];

  // Datos para Recharts: Calculamos los últimos 4 meses de forma real
  const chartData = useMemo(() => {
    const months = [];
    const now = new Date();
    
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const monthLabel = d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
      
      const income = (transactions || [])
        .filter(t => t.type === 'Ingreso')
        .filter(t => {
          const td = new Date(t.date);
          return td.getMonth() === m && td.getFullYear() === y;
        })
        .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

      months.push({ 
        name: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1), 
        income: Math.round(income) 
      });
    }
    return months;
  }, [transactions]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in-up">
      {/* HEADER: Welcome & Time */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-effect p-4 sm:p-6 rounded-3xl border border-[var(--accent-primary)]/20 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-primary)]/5 to-transparent pointer-events-none"></div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="relative">
            <div className="absolute inset-0 bg-[var(--accent-primary)] blur-md opacity-30 rounded-full"></div>
            <div className="w-12 h-12 bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 rounded-2xl flex items-center justify-center relative z-10 backdrop-blur-md">
              <Activity className="text-[var(--accent-primary)] w-6 h-6" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">
              Panel <span className="text-[var(--accent-primary)]">Principal</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-primary)]"></span>
              </span>
              <p className="text-[10px] sm:text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                Resumen Operativo
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 relative z-10 bg-[var(--bg-card)]/50 px-5 py-3 rounded-2xl border border-[var(--border-color)]/50 backdrop-blur-xl shadow-inner">
          <Clock className="text-[var(--accent-primary)]" size={20} />
          <div className="flex flex-col items-end">
            <span className="text-lg sm:text-xl font-black font-mono tracking-tighter text-[var(--accent-primary)] uppercase">
              {currentTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}
              <span className="text-xs text-[var(--text-secondary)] font-medium ml-1">HS</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-secondary)]">
              {currentTime.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto lg:overflow-visible snap-x snap-mandatory hide-scrollbar py-2 -mx-3 px-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-4 gap-4 sm:gap-6 relative z-10">
        {stats.map((stat, idx) => (
          <div key={idx} className="min-w-[80vw] sm:min-w-[280px] lg:min-w-0 snap-center shrink-0 relative group overflow-hidden bg-[var(--bg-card)] p-5 sm:p-6 rounded-3xl border border-[var(--border-color)] transition-all duration-300 hover:scale-[1.02] hover:border-[var(--accent-primary)]/50 hover:shadow-[0_0_30px_var(--accent-light)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-[var(--accent-light)] transition-all duration-500"></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className={`w-12 h-12 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-inner border border-white/10 ${stat.color}`}>
                <stat.icon size={24} className="sm:w-6 sm:h-6 drop-shadow-md" />
              </div>
              <div className={`flex items-center gap-1 text-[10px] sm:text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${stat.isPositive ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                {stat.isPositive ? <TrendingUp size={12}/> : <TrendingUp size={12} className="rotate-180"/>}
                {stat.trend}
              </div>
            </div>
            <div className="relative z-10 mt-2">
              <h3 className="text-[var(--text-secondary)] text-xs sm:text-xs font-black uppercase tracking-widest mb-1 opacity-80">{stat.title}</h3>
              <p className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] tracking-tighter drop-shadow-sm">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* NEW: Visual Insights Section */}
      <div className={`grid grid-cols-1 ${canViewFinances ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-6 relative z-10`}>
        {canViewFinances && (
          <div className="glass-effect p-4 sm:p-6 flex flex-col min-h-[350px] rounded-3xl border border-[var(--glass-border)] group hover:border-[var(--accent-primary)]/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4 relative z-10 shrink-0">
              <div>
                <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                  <Activity className="text-[var(--accent-primary)]" size={16} />
                  Flujo de Ingresos
                </h3>
                <p className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest mt-1 opacity-80">Comparativo mensual (Real)</p>
              </div>
            </div>
            <div className="w-full relative z-10 flex-1">
              {isMounted && (
                <ResponsiveContainer width="99%" height={240}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase'}} 
                    dy={10}
                  />
                  <Tooltip 
                    contentStyle={{backgroundColor: 'var(--bg-card)', borderColor: 'var(--accent-primary)', borderRadius: '16px', color: 'var(--text-primary)', boxShadow: '0 0 20px rgba(14,165,233,0.2)'}}
                    itemStyle={{color: 'var(--accent-primary)', fontWeight: 'black', fontSize: '14px'}}
                    formatter={(value) => [formatMoney(value), 'Ingreso']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="income" 
                    stroke="var(--accent-primary)" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorIncome)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        <div className={`glass-effect p-4 sm:p-6 flex flex-col min-h-[350px] rounded-3xl border border-[var(--glass-border)] group hover:border-[var(--accent-primary)]/30 transition-all duration-300`}>
          <div className="flex items-center justify-between mb-4 relative z-10 shrink-0">
            <div>
              <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                <BarChartIcon className="text-[var(--accent-primary)]" size={16} />
                Distribución
              </h3>
              <p className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest mt-1 opacity-80">Por estado de asistencia</p>
            </div>
          </div>
          <div className="w-full relative z-10 flex-1">
            {isMounted && (
              <ResponsiveContainer width="99%" height={240}>
                <BarChart data={[
                { name: 'Agendado', count: appointments.filter(a => a.attendance === 'agendado').length },
                { name: 'En Espera', count: appointments.filter(a => a.attendance === 'en_espera').length },
                { name: 'Finalizado', count: appointments.filter(a => a.attendance === 'finalizado').length },
                { name: 'Ausente', count: appointments.filter(a => a.attendance === 'ausente').length },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 9, fontWeight: 800, textTransform: 'uppercase'}} dy={10} />
                <Tooltip 
                  cursor={{fill: 'var(--accent-light)', opacity: 0.5}} 
                  contentStyle={{backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--accent-primary)', boxShadow: '0 0 20px rgba(14,165,233,0.2)', color: 'var(--text-primary)'}} 
                  itemStyle={{color: 'var(--accent-primary)', fontWeight: 'black', fontSize: '14px'}}
                  formatter={(value) => [value, 'Cantidad']}
                />
                <Bar dataKey="count" radius={[8, 8, 8, 8]}>
                  { [0,1,2,3].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 2 ? 'var(--accent-primary)' : 'var(--text-secondary)'} opacity={index === 2 ? 1 : 0.3} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* MAIN GRID: Doble Columna (Agenda vs Accesos) - ADAPTATIVO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10">
        
        {/* COLUMNA IZQ: Agenda del día */}
        <div className="lg:col-span-2 space-y-6 relative z-20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Agenda de Hoy</h2>
              {/* Barra de Progreso */}
              {todaysAppointments.length > 0 && (
                <div className="mt-2 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">
                    <span>{completedCount} Completados</span>
                    <span className="text-[var(--text-primary)]">{progressPercentage}%</span>
                  </div>
                  <div className="flex-1 h-1.5 bg-[var(--border-color)]/30 rounded-full overflow-hidden w-32 sm:w-48">
                    <div 
                      className="h-full bg-[var(--accent-primary)] rounded-full transition-all duration-1000 ease-in-out" 
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
            
            <button onClick={() => navigate('/dashboard/agenda')} className="text-sm font-bold text-[var(--accent-primary)] hover:text-[var(--accent-hover)] hover:underline">Ver agenda completa</button>
          </div>

          <div className="bg-[var(--bg-card)] rounded-3xl min-h-[100px] overflow-visible border border-[var(--border-color)] shadow-sm">
            <div className="divide-y divide-[var(--border-color)]/30">
              {todaysAppointments.length === 0 ? (
                <div className="p-10 text-center text-[var(--text-secondary)] font-medium flex flex-col items-center gap-3">
                  <CalendarDays size={56} className="opacity-20 mb-2" />
                  <p className="text-sm uppercase tracking-widest font-black opacity-60">Agenda Vacía</p>
                  <p className="text-xs">Hoy no hay turnos programados.</p>
                </div>
              ) : (
                todaysAppointments.map((app) => {
                  const status = getAppointmentStatus(app);
                  const isSuspended = status === 'suspended';
                  const isFinished = status === 'finished';
                  const isInProgress = status === 'in_progress';
                  const isBlock = app.isBlock;
                  const doctorAssigned = (doctors || []).find(d => d.id === app.doctorId) || { name: 'Dr. General' };
                  
                  return (
                  <div key={app.id} className={`p-3 sm:p-6 transition-all duration-300 flex items-center gap-3 sm:gap-6 group relative hover:bg-[var(--accent-primary)]/5 ${isSuspended ? 'opacity-50 grayscale' : ''} ${isBlock ? 'bg-stripes bg-[var(--bg-main)]/50' : ''} ${activeDropdown === app.id ? 'z-50' : 'z-10'}`}>
                    {/* Hora */}
                    <div className="w-10 sm:w-16 text-center shrink-0">
                      <p className={`text-[12px] sm:text-base font-black transition-colors ${isInProgress && !isBlock ? 'text-[var(--accent-primary)]' : (isFinished || isBlock ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)] group-hover:text-[var(--accent-primary)]')}`}>
                        {app.time?.substring(0, 5) || app.time}
                      </p>
                      <p className="text-[8px] font-black text-[var(--text-secondary)] mt-0.5 opacity-50 uppercase tracking-widest">HS</p>
                    </div>
                    
                    {/* Línea de tiempo visual */}
                    <div className="w-1 h-10 sm:h-12 bg-[var(--border-color)]/30 rounded-full relative shrink-0">
                      <div className={`absolute top-0 bottom-0 w-full rounded-full ${isSuspended || isBlock ? 'bg-[var(--text-secondary)]/50' : (isFinished ? 'bg-emerald-500' : 'bg-[var(--accent-primary)]')}`}></div>
                      {isInProgress && !isBlock && (
                        <div className="absolute top-1/2 -left-1 w-3 h-3 bg-[var(--accent-primary)] rounded-full -translate-y-1/2 animate-pulse"></div>
                      )}
                    </div>

                    {/* Info Paciente y Pago */}
                    <div className="flex-1 min-w-0 flex items-center gap-4">
                      {/* Avatar */}
                      <div className={`hidden sm:flex w-10 h-10 sm:w-12 sm:h-12 rounded-2xl font-black items-center justify-center shrink-0 border uppercase transition-transform group-hover:scale-105 shadow-inner ${isBlock ? 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)]' : isFinished ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/30 backdrop-blur-sm'}`}>
                        {isBlock ? <Clock size={18} /> : (isFinished ? <CheckCircle2 size={18} /> : app.patient.charAt(0))}
                      </div>
                      
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm sm:text-base font-bold truncate ${isSuspended ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
                            {isBlock ? app.title : app.patient}
                          </h4>
                          {app.paymentStatus && app.paymentStatus !== 'pendiente' && !isBlock && (
                            <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full shrink-0 ${app.paymentStatus === 'pagado' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                              {app.paymentStatus === 'pagado' ? 'Abonado' : 'Señado'}
                            </span>
                          )}
                        </div>
                        <p className={`text-sm font-medium truncate ${isSuspended ? 'line-through text-slate-400' : 'text-slate-500'}`}>
                          {isBlock ? `${app.duration} Horas` : app.title} • <span className="font-bold">{doctorAssigned.name}</span>
                        </p>
                        {/* Notas Inline */}
                        {app.notes && !isBlock && (
                           <p className="text-xs mt-1 text-slate-400 truncate opacity-80" title={app.notes}>
                             📝 {app.notes}
                           </p>
                        )}
                      </div>
                    </div>

                    {/* Estado y Acciones */}
                    <div className="flex items-center gap-3 shrink-0 relative">
                      {/* Badge Dinámico */}
                      <span className={`hidden sm:inline-flex px-3 py-1 text-[10px] uppercase tracking-widest font-black rounded-lg items-center gap-1.5 border backdrop-blur-md transition-all
                        ${isBlock ? 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]' :
                          isSuspended ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                          isFinished ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                          app.attendance === 'en_curso' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-pulse' :
                          isInProgress ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border-[var(--accent-primary)] shadow-[0_0_10px_var(--accent-light)] animate-pulse' :
                          app.attendance === 'en_espera' ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/30' :
                          app.attendance === 'confirmado' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                          'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]/50'
                        }`}
                      >
                        {isBlock ? 'Bloqueo' : isSuspended ? 'Ausente' : isFinished ? 'Finalizado' : app.attendance === 'en_curso' ? 'En Consulta' : isInProgress ? 'En Curso' : app.attendance === 'en_espera' ? 'En Espera' : app.attendance === 'confirmado' ? 'Confirmado' : 'Agendado'}
                      </span>
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(activeDropdown === app.id ? null : app.id);
                        }}
                        className={`p-2 transition-colors rounded-full ${activeDropdown === app.id ? 'text-[var(--accent-primary)] bg-[var(--accent-light)]' : 'text-[var(--text-secondary)] hover:text-[var(--accent-primary)] bg-[var(--bg-card)] hover:bg-[var(--accent-light)] opacity-100 sm:opacity-0 sm:group-hover:opacity-100'}`}
                      >
                        <MoreVertical size={18} />
                      </button>

                      {/* Dropdown Options */}
                      {activeDropdown === app.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); }}></div>
                          <div className="absolute right-0 top-10 w-48 bg-[var(--bg-card)] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-[var(--border-color)] py-1 z-50 animate-fade-in-quick">
                            {/* WhatsApp */}
                            {(!['medico'].includes(userRole) && store.globalConfig?.whatsappEnabled) && (
                               <>
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setActiveDropdown(null);
                                     handleSendWhatsApp(app);
                                   }}
                                   className="w-full text-left px-4 py-3 text-xs font-bold text-emerald-500 hover:bg-emerald-500/10 transition-colors flex items-center gap-2"
                                 >
                                   <span>💬</span> Enviar WhatsApp
                                 </button>
                                 <div className="h-px bg-[var(--border-color)]/30 w-full"></div>
                               </>
                            )}

                            {/* Dropdown de Estados de Pago Expandido (Solo NO médicos) */}
                            {!['medico'].includes(userRole) && (
                              <div className="pt-2 pb-2">
                                <div className="px-4 pb-1 text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Estado de Pago</div>
                                <button
                                  disabled={app.paymentStatus === 'pagado' || app.paymentStatus === 'señado'}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    store.updateAppointmentPaymentStatus(app.id, { paymentStatus: 'pendiente' });
                                    setActiveDropdown(null);
                                  }}
                                  title={(app.paymentStatus === 'pagado' || app.paymentStatus === 'señado') ? 'El pago ya ingresó en caja. Para deshacer, anúlalo desde Finanzas.' : ''}
                                  className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center justify-between ${
                                    app.paymentStatus === 'pendiente' 
                                      ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10' 
                                      : (app.paymentStatus === 'pagado' || app.paymentStatus === 'señado')
                                        ? 'text-[var(--text-secondary)] opacity-40 cursor-not-allowed'
                                        : 'text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/5'
                                  }`}
                                >
                                  Pendiente
                                  {app.paymentStatus === 'pendiente' && <CheckCircle2 size={14} />}
                                </button>
                                
                                {/* Input de Abonado Dinámico */}
                                {/* Input de Abonado Dinámico */}
                                {abonadoInput !== app.id ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (app.paymentStatus === 'pagado') {
                                        setActiveDropdown(null);
                                        return;
                                      }
                                      setAbonadoInput(app.id);
                                      setSenasInput({ appId: null, value: '' });
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center justify-between ${app.paymentStatus === 'pagado' ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10' : 'text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/5'}`}
                                  >
                                    Abonado
                                    {app.paymentStatus === 'pagado' && <CheckCircle2 size={14} />}
                                  </button>
                                ) : (
                                  <div className="bg-[var(--bg-main)]/30 border-y border-[var(--border-color)]/30 py-1" onClick={e => e.stopPropagation()}>
                                    <div className="px-4 py-1.5 flex items-center justify-between">
                                      <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Medio de Pago</span>
                                      <button onClick={(e) => { e.stopPropagation(); setAbonadoInput(null); }} className="text-[9px] font-bold text-rose-500 hover:underline">Cancelar</button>
                                    </div>
                                    {[
                                      { id: 'Efectivo', color: 'bg-emerald-500' },
                                      { id: 'Tarjeta', color: 'bg-indigo-500' },
                                      { id: 'Transferencia', color: 'bg-sky-500' }
                                    ].map(method => (
                                      <button
                                        key={method.id}
                                        onClick={e => {
                                          e.stopPropagation();
                                          const totalFee = Number(app.paymentAmount || 35000);
                                          store.updateAppointmentPaymentStatus(app.id, { 
                                            paymentStatus: 'pagado',
                                            paidAmount: totalFee,
                                            paymentMethod: method.id
                                          });
                                          if (totalFee > 0) {
                                            store.createTransaction({
                                              id: Date.now(),
                                              date: new Date().toISOString(),
                                              type: 'Ingreso',
                                              concept: `Cobro Total ${app.title} — ${app.patient}`,
                                              method: method.id,
                                              amount: totalFee,
                                              notes: `Desde Dashboard (Turno #${app.id})`,
                                              doctor_id: app.doctorId,
                                              patient_id: app.patientId
                                            });
                                          }
                                          setAbonadoInput(null);
                                          setActiveDropdown(null);
                                        }}
                                        className="w-full text-left px-4 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/10 flex items-center gap-3 transition-colors"
                                      >
                                        <div className={`w-1.5 h-1.5 rounded-full ${method.color}`}></div>
                                        {method.id}
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {/* Input de Señas dinámico integrado sin romper el diseño */}
                                {senasInput.appId !== app.id ? (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSenasInput({ appId: app.id, value: '' });
                                      setAbonadoInput(null);
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center justify-between ${app.paymentStatus === 'señado' ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10' : 'text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/5'}`}
                                  >
                                    Señado
                                    {app.paymentStatus === 'señado' && <CheckCircle2 size={14} />}
                                  </button>
                                ) : (
                                  <div className="bg-[var(--bg-main)]/30 border-y border-[var(--border-color)]/30 py-2 px-3 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center justify-between px-1">
                                      <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Monto de la Seña</span>
                                      <button onClick={(e) => { e.stopPropagation(); setSenasInput({ appId: null, value: '' }); }} className="text-[9px] font-bold text-rose-500 hover:underline">Cancelar</button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">$</span>
                                        <input 
                                          type="number"
                                          autoFocus
                                          value={senasInput.value}
                                          onChange={e => setSenasInput({...senasInput, value: e.target.value})}
                                          onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                              const amount = Number(senasInput.value);
                                              store.updateAppointmentPaymentStatus(app.id, { 
                                                paymentStatus: 'señado', 
                                                paidAmount: amount 
                                              });
                                              if (amount > 0) {
                                                store.createTransaction({
                                                  id: Date.now(),
                                                  date: new Date().toISOString(),
                                                  type: 'Ingreso',
                                                  concept: `Seña ${app.title} — ${app.patient}`,
                                                  method: app.paymentMethod || 'Efectivo',
                                                  amount,
                                                  notes: `Desde Dashboard (Seña #${app.id})`,
                                                  doctor_id: app.doctorId,
                                                  patient_id: app.patientId
                                                });
                                              }
                                              setSenasInput({ appId: null, value: '' });
                                              setActiveDropdown(null);
                                            }
                                            if (e.key === 'Escape') setSenasInput({ appId: null, value: '' });
                                          }}
                                          className="w-full pl-7 pr-3 py-1.5 text-xs font-bold text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg outline-none focus:border-[var(--accent-primary)] shadow-sm"
                                          placeholder="0.00"
                                        />
                                      </div>
                                      <button
                                        onClick={e => {
                                          e.stopPropagation();
                                          const amount = Number(senasInput.value);
                                          store.updateAppointmentPaymentStatus(app.id, { 
                                            paymentStatus: 'señado', 
                                            paidAmount: amount 
                                          });
                                          if (amount > 0) {
                                            store.createTransaction({
                                              id: Date.now(),
                                              date: new Date().toISOString(),
                                              type: 'Ingreso',
                                              concept: `Seña ${app.title} — ${app.patient}`,
                                              method: app.paymentMethod || 'Efectivo',
                                              amount,
                                              notes: `Desde Dashboard (Seña #${app.id})`,
                                              doctor_id: app.doctorId,
                                              patient_id: app.patientId
                                            });
                                          }
                                          setSenasInput({ appId: null, value: '' });
                                          setActiveDropdown(null);
                                        }}
                                        className="px-3 py-1.5 bg-[var(--accent-primary)] text-white text-xs font-black rounded-lg hover:bg-[var(--accent-hover)] transition-colors shadow-sm"
                                      >
                                        OK
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Details Shortcut */}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate('/dashboard/agenda');
                              }}
                              className="w-full text-left px-4 py-3 mt-1 text-xs font-bold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/5 transition-colors"
                            >
                              Ver en la Agenda
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )})
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA DER: Notas y Accesos - RESPONSIVO */}
        {/* COLUMNA DER: Notas y Accesos - RESPONSIVO */}
        <div className="space-y-6 relative z-10">
          <div className="flex flex-col gap-6">
             {/* NOTA DINÁMICA HIBRIDA */}
             <div className="glass-effect overflow-hidden flex flex-col !border-none rounded-3xl border border-[var(--glass-border)] shadow-sm">
                {/* Cabecera: Voz del Sistema */}
                <div className="bg-[var(--bg-main)] p-5 border-b border-[var(--border-color)]/30 relative overflow-hidden group">
                   <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-primary)]/5 to-transparent pointer-events-none group-hover:from-[var(--accent-primary)]/10 transition-all duration-500"></div>
                   <div className="flex items-center gap-3 mb-4 relative z-10">
                      <div className="bg-[var(--accent-primary)]/10 p-2 rounded-xl backdrop-blur-sm border border-[var(--accent-primary)]/20">
                         <Sparkles size={18} className="text-[var(--accent-primary)] animate-pulse" />
                      </div>
                      <h4 className="font-black text-sm uppercase tracking-widest text-[var(--accent-primary)]">Asistente Clínico</h4>
                   </div>
                   <div className="flex flex-col gap-2.5 relative z-10">
                     {(() => {
                       // Identificar el doctor real asociado al usuario logueado
                       const myDoctor = userRole === 'medico' && store.user?.doctor_id
                         ? (doctors.find(d => d && Number(d.id) === Number(store.user.doctor_id)) || null)
                         : (userRole === 'medico' ? doctors.find(d => d && d.name === store.user?.name) : null);

                       // Filtrado inteligente: los médicos solo ven sus turnos, recepción/admin ven toda la clínica
                       const relevantAppointments = userRole === 'medico' && myDoctor
                         ? todaysPatientAppointments.filter(a => Number(a.doctorId) === Number(myDoctor.id))
                         : todaysPatientAppointments;

                       const waiting = relevantAppointments.filter(a => a.attendance === 'en_espera');
                       const missingPayment = relevantAppointments.filter(a => getAppointmentStatus(a) === 'finished' && a.paymentStatus !== 'pagado');
                       
                       // Evoluciones faltantes históricas (no solo de hoy)
                       const missingNotes = appointments.filter(a => {
                         if (a.isBlock || a.hasEvolution) return false;
                         const isFinished = a.attendance === 'finalizado' || (a.date === todayString && getAppointmentStatus(a) === 'finished');
                         if (!isFinished) return false;
                         
                         if (userRole === 'medico' && myDoctor) {
                           return Number(a.doctorId) === Number(myDoctor.id);
                         } else if (userRole === 'admin') {
                           return true; // Admin ve las de todos
                         }
                         return false;
                       });

                       const upcoming = relevantAppointments.filter(a => getAppointmentStatus(a) === 'upcoming' || getAppointmentStatus(a) === 'in_progress').sort((a,b) => (a.time || '').localeCompare(b.time || ''))[0];
                       const cancelled = relevantAppointments.filter(a => a.attendance === 'ausente' || a.attendance === 'suspended');

                       // Identificar pacientes únicos que aún no han sido atendidos
                       const pendingOrWaitingApps = relevantAppointments.filter(a => ['agendado', 'confirmado', 'en_espera'].includes(a.attendance));
                       
                       const birthdays = [];
                       const newPatients = [];
                       const previousDebts = [];
                       const frequentNoShows = [];
                       
                       const seenPatientIds = new Set();
                       pendingOrWaitingApps.forEach(a => {
                         if (seenPatientIds.has(a.patientId || a.patient)) return;
                         seenPatientIds.add(a.patientId || a.patient);
                         
                         const patientRecord = store.patients.find(p => p.id === a.patientId || p.name === a.patient);
                         
                         // Cumpleaños
                         if (patientRecord?.birthDate) {
                           const today = new Date();
                           const [y, m, d] = patientRecord.birthDate.split('-');
                           if (parseInt(m) === today.getMonth() + 1 && parseInt(d) === today.getDate()) {
                             birthdays.push(a);
                           }
                         }

                         // Nuevo Paciente
                         let isNew = false;
                         if (patientRecord?.created_at) {
                           const diffTime = Math.abs(new Date() - new Date(patientRecord.created_at));
                           isNew = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) <= 7;
                         } else {
                           isNew = (a.title || '').toLowerCase().includes('primer');
                         }
                         if (isNew) newPatients.push(a);

                         // Deuda Previa y Faltador Frecuente
                         if (a.patientId) {
                           const pastApps = appointments.filter(past => past.patientId === a.patientId && past.date < todayString && past.attendance !== 'suspended');
                           
                           // Deuda
                           const unpaidPast = pastApps.filter(past => past.attendance === 'finalizado' && past.paymentStatus !== 'pagado');
                           if (unpaidPast.length > 0) {
                             const totalDebt = unpaidPast.reduce((sum, past) => sum + Math.max(0, Number(past.paymentAmount || 0) - Number(past.paidAmount || 0)), 0);
                             if (totalDebt > 0) {
                               previousDebts.push({ app: a, debt: totalDebt, count: unpaidPast.length });
                             }
                           }

                           // Faltador
                           if (pastApps.length >= 2) {
                             const absences = pastApps.filter(past => past.attendance === 'ausente').length;
                             if (absences / pastApps.length >= 0.3) {
                               frequentNoShows.push({ app: a, absences, total: pastApps.length });
                             }
                           }
                         }
                       });
                       
                       // Identificar demoras en sala de espera (> 20 mins)
                       const delayedPatients = [];
                       waiting.forEach(a => {
                         if (!a.time) return;
                         const [hours, minutes] = a.time.split(':').map(Number);
                         const appDate = new Date();
                         appDate.setHours(hours, minutes, 0, 0);
                         
                         // Calcular diferencia en minutos desde la hora pactada del turno
                         const diffMinutes = Math.floor((new Date() - appDate) / 60000);
                         if (diffMinutes >= 20) {
                           delayedPatients.push({ app: a, delay: diffMinutes });
                         }
                       });

                       const cards = [];

                       // Saludo/Resumen de la jornada
                       cards.push(
                         <p key="header" className="text-sm font-bold leading-relaxed text-[var(--text-secondary)] mb-2">
                           {relevantAppointments.length > 0 
                             ? userRole === 'medico' 
                               ? `Tienes ${relevantAppointments.length} turnos programados hoy.`
                               : `La clínica tiene ${relevantAppointments.length} turnos hoy.`
                             : 'No hay actividad programada para hoy.'}
                         </p>
                       );

                       // Ritmo de la jornada (Progreso)
                       if (relevantAppointments.length > 0) {
                         const completedCount = relevantAppointments.filter(a => a.attendance === 'finalizado' || a.attendance === 'ausente').length;
                         const progress = Math.round((completedCount / relevantAppointments.length) * 100);
                         if (progress > 0 && progress < 100) {
                           cards.push(
                             <div key="progress" className="bg-[var(--bg-main)] border border-[var(--border-color)]/50 rounded-xl p-3 flex flex-col gap-2 mb-2">
                               <div className="flex justify-between items-center text-xs font-bold">
                                 <span className="text-[var(--text-secondary)]">Ritmo de la Jornada</span>
                                 <span className="text-[var(--accent-primary)]">{progress}%</span>
                               </div>
                               <div className="w-full bg-[var(--border-color)]/30 rounded-full h-1.5 overflow-hidden">
                                 <div className="bg-[var(--accent-primary)] h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                               </div>
                             </div>
                           );
                         } else if (progress === 100) {
                           cards.push(
                             <div key="progress-done" className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3 animate-fade-in-up mb-2">
                               <div className="p-2 bg-emerald-500/20 text-emerald-600 rounded-lg shrink-0">🏅</div>
                               <div>
                                 <p className="text-xs font-bold text-emerald-600">¡Jornada Completada!</p>
                                 <p className="text-[10px] font-bold text-[var(--text-secondary)] opacity-80 mt-0.5">Has finalizado el 100% de los turnos programados.</p>
                               </div>
                             </div>
                           );
                         }
                       }

                       // Alertas de Deuda Previa (Prioridad alta para Recepción/Admin)
                       if (userRole !== 'medico' && previousDebts.length > 0) {
                         cards.push(
                           <div key="debt" onClick={() => navigate('/dashboard/tareas?filter=deudas')} className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-3 animate-fade-in-up cursor-pointer hover:bg-red-500/20 transition-colors">
                             <div className="p-2 bg-red-500/20 text-red-500 rounded-lg shrink-0 mt-0.5"><Wallet size={16} /></div>
                             <div>
                               <p className="text-xs font-bold text-red-500">Deudas Previas Detectadas</p>
                               <div className="text-[10px] font-bold text-[var(--text-secondary)] opacity-80 mt-1 space-y-0.5">
                                 {previousDebts.slice(0, 3).map(({app, debt}, i) => (
                                   <p key={i}>• Cobrar a {app.patient}: ${debt.toLocaleString()}</p>
                                 ))}
                                 {previousDebts.length > 3 && <p>• Y {previousDebts.length - 3} más...</p>}
                               </div>
                             </div>
                           </div>
                         );
                       }

                       // Alertas de Faltador Frecuente
                       if (frequentNoShows.length > 0) {
                         cards.push(
                           <div key="noshow" onClick={() => navigate('/dashboard/tareas?filter=faltadores')} className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex items-start gap-3 animate-fade-in-up cursor-pointer hover:bg-orange-500/20 transition-colors">
                             <div className="p-2 bg-orange-500/20 text-orange-500 rounded-lg shrink-0 mt-0.5"><Users size={16} /></div>
                             <div>
                               <p className="text-xs font-bold text-orange-500">Atención: Faltadores Frecuentes</p>
                               <div className="text-[10px] font-bold text-[var(--text-secondary)] opacity-80 mt-1 space-y-0.5">
                                 {frequentNoShows.slice(0, 3).map(({app, absences, total}, i) => (
                                   <p key={i}>• {app.patient} faltó a {absences} de sus últimos {total} turnos.</p>
                                 ))}
                                 {frequentNoShows.length > 3 && <p>• Y {frequentNoShows.length - 3} más...</p>}
                               </div>
                             </div>
                           </div>
                         );
                       }

                       // 1. Alertas de Cumpleaños
                       if (birthdays.length > 0) {
                         cards.push(
                           <div key="bdays" onClick={() => navigate('/dashboard/tareas?filter=cumpleanos')} className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-3 flex items-start gap-3 animate-fade-in-up cursor-pointer hover:bg-pink-500/20 transition-colors">
                             <div className="p-2 bg-pink-500/20 text-pink-500 rounded-lg shrink-0 mt-0.5">🎂</div>
                             <div>
                               <p className="text-xs font-bold text-pink-500">{birthdays.length === 1 ? '¡Un cumpleaños hoy!' : `¡${birthdays.length} cumpleaños hoy!`}</p>
                               <div className="text-[10px] font-bold text-[var(--text-secondary)] opacity-80 mt-1 space-y-0.5">
                                 {birthdays.slice(0, 3).map((app, i) => (
                                   <p key={i}>• Felicita a {app.patient} ({app.time}hs)</p>
                                 ))}
                                 {birthdays.length > 3 && <p>• Y {birthdays.length - 3} más...</p>}
                               </div>
                             </div>
                           </div>
                         );
                       }

                       // 2. Alerta de Paciente Nuevo
                       if (newPatients.length > 0) {
                         cards.push(
                           <div key="newp" onClick={() => navigate('/dashboard/tareas?filter=primeras')} className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 flex items-start gap-3 animate-fade-in-up cursor-pointer hover:bg-purple-500/20 transition-colors">
                             <div className="p-2 bg-purple-500/20 text-purple-500 rounded-lg shrink-0 mt-0.5">🌟</div>
                             <div>
                               <p className="text-xs font-bold text-purple-500">{newPatients.length === 1 ? 'Primera Visita' : `${newPatients.length} Primeras Visitas`}</p>
                               <div className="text-[10px] font-bold text-[var(--text-secondary)] opacity-80 mt-1 space-y-0.5">
                                 {newPatients.slice(0, 3).map((app, i) => (
                                   <p key={i}>• Dale la bienvenida a {app.patient}</p>
                                 ))}
                                 {newPatients.length > 3 && <p>• Y {newPatients.length - 3} más...</p>}
                               </div>
                             </div>
                           </div>
                         );
                       }

                       // 3. Ausencias (Para recepción)
                       if (cancelled.length > 0 && userRole !== 'medico') {
                         cards.push(
                           <div key="cancelled" className="bg-slate-500/10 border border-slate-500/20 rounded-xl p-3 flex items-center gap-3 animate-fade-in-up">
                             <div className="p-2 bg-slate-500/20 text-slate-400 rounded-lg shrink-0"><Users size={16} /></div>
                             <div>
                               <p className="text-xs font-bold text-slate-400">Turnos Cancelados</p>
                               <p className="text-[10px] font-bold text-[var(--text-secondary)] opacity-80 mt-0.5">Hubo {cancelled.length} cancelación/ausencia hoy. ¿Llamamos a la lista de espera?</p>
                             </div>
                           </div>
                         );
                       }

                       // Alerta Demoras en Sala
                       if (delayedPatients.length > 0) {
                         cards.push(
                           <div key="delay" onClick={() => navigate('/dashboard/tareas?filter=demoras')} className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-3 animate-fade-in-up cursor-pointer hover:bg-rose-500/20 transition-colors">
                             <div className="p-2 bg-rose-500/20 text-rose-500 rounded-lg shrink-0 mt-0.5"><Clock size={16} /></div>
                             <div>
                               <p className="text-xs font-bold text-rose-500">{delayedPatients.length === 1 ? 'Demora en Sala' : `${delayedPatients.length} Pacientes Demorados`}</p>
                               <div className="text-[10px] font-bold text-[var(--text-secondary)] opacity-80 mt-1 space-y-0.5">
                                 {delayedPatients.slice(0, 3).map(({app, delay}, i) => (
                                   <p key={i}>• {app.patient} aguarda hace {delay} min.</p>
                                 ))}
                                 {delayedPatients.length > 3 && <p>• Y {delayedPatients.length - 3} más...</p>}
                               </div>
                             </div>
                           </div>
                         );
                       }

                       if (waiting.length > 0) {
                         cards.push(
                           <div key="waiting" className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3 flex items-center gap-3 animate-fade-in-up">
                             <div className="p-2 bg-sky-500/20 text-sky-500 rounded-lg shrink-0"><Users size={16} /></div>
                             <div>
                               <p className="text-xs font-bold text-sky-500">Pacientes en espera</p>
                               <p className="text-[10px] font-bold text-[var(--text-secondary)] opacity-80 mt-0.5">Hay {waiting.length} paciente(s) aguardando en sala.</p>
                             </div>
                           </div>
                         );
                       }
                       if (missingPayment.length > 0 && userRole !== 'medico') {
                         cards.push(
                           <div key="payment" className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-center gap-3 animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                             <div className="p-2 bg-rose-500/20 text-rose-500 rounded-lg shrink-0"><Wallet size={16} /></div>
                             <div>
                               <p className="text-xs font-bold text-rose-500">Pagos Pendientes</p>
                               <p className="text-[10px] font-bold text-[var(--text-secondary)] opacity-80 mt-0.5">Faltan cobrar {missingPayment.length} turno(s) finalizado(s).</p>
                             </div>
                           </div>
                         );
                       }
                       if (missingNotes.length > 0 && ['medico', 'admin'].includes(userRole)) {
                         cards.push(
                           <div key="notes" onClick={() => navigate('/dashboard/tareas?filter=evoluciones')} className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3 animate-fade-in-up cursor-pointer hover:bg-amber-500/20 transition-colors" style={{animationDelay: '0.2s'}}>
                             <div className="p-2 bg-amber-500/20 text-amber-500 rounded-lg shrink-0"><Activity size={16} /></div>
                             <div>
                               <p className="text-xs font-bold text-amber-500">Evoluciones Faltantes</p>
                               <p className="text-[10px] font-bold text-[var(--text-secondary)] opacity-80 mt-0.5">Falta redactar {missingNotes.length} historia(s) clínica(s).</p>
                             </div>
                           </div>
                         );
                       }
                       
                       // 4. Próximo turno + Videollamada
                       if (upcoming && waiting.length === 0) {
                         const isCurrent = getAppointmentStatus(upcoming) === 'in_progress';
                         cards.push(
                           <div key="upcoming" className="bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 rounded-xl p-3 flex flex-col gap-2 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
                             <div className="flex items-center gap-3">
                               <div className="p-2 bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] rounded-lg shrink-0"><Clock size={16} /></div>
                               <div>
                                 <p className="text-xs font-bold text-[var(--text-primary)]">
                                   {isCurrent ? `Turno Actual: ${upcoming.time?.substring(0,5)}hs` : `Próximo: ${upcoming.time?.substring(0,5)}hs`}
                                 </p>
                                 <p className="text-[10px] font-bold text-[var(--text-secondary)] opacity-80 mt-0.5">Con {upcoming.patient}</p>
                               </div>
                             </div>
                             {upcoming.modalidad === 'virtual' && (
                               <div className="mt-1 flex gap-2 pl-[42px]">
                                 {userRole === 'medico' ? (
                                   <button 
                                     onClick={() => {
                                       if (upcoming.paymentStatus !== 'pagado') {
                                         toast.error('El paciente aún no ha abonado la consulta.');
                                         return;
                                       }
                                       navigate(`/sala-virtual/medico/${upcoming.id}`);
                                     }}
                                     className="flex-1 py-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded shadow hover:bg-indigo-700 transition-colors"
                                   >
                                     ▶ Iniciar Videollamada
                                   </button>
                                 ) : (
                                   <button 
                                     onClick={() => {
                                       const patientRecord = store.patients.find(p => p.id === upcoming.patientId || p.name === upcoming.patient);
                                       const dni = patientRecord?.dni || upcoming.dni;
                                       if (!dni || !upcoming.codigoAcceso) {
                                         toast.error('Turno sin DNI o Código generado.');
                                         return;
                                       }
                                       navigator.clipboard.writeText(`https://integrarsalud.me/#/sala-virtual?dni=${dni}&codigo=${upcoming.codigoAcceso}`);
                                       toast.success('Link copiado');
                                     }}
                                     className="flex-1 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-200 text-[10px] font-bold rounded shadow-sm hover:bg-indigo-100 transition-colors"
                                   >
                                     Copiar Link de Acceso
                                   </button>
                                 )}
                               </div>
                             )}
                           </div>
                         );
                       }

                       if (cards.length <= 1) { // Solo está el saludo
                         return (
                           <>
                             {cards}
                             <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)]/30 rounded-xl p-6 text-center animate-fade-in-quick mt-2">
                               <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-2 opacity-50" />
                               <p className="text-xs font-bold text-[var(--text-primary)]">Todo al día</p>
                               <p className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 mt-1">No hay tareas urgentes ni alertas.</p>
                             </div>
                           </>
                         );
                       }

                       return cards;
                     })()}
                   </div>
                </div>

                {/* Cuerpo: Nota Personal editable */}
                <div className="p-5 flex flex-col gap-3 relative">
                   <div className="flex items-center justify-between">
                      <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2 opacity-80">
                        <ArrowRight size={12} className="text-[var(--accent-primary)]" /> Nota Personal
                      </h5>
                      {isSaving && <span className="text-[10px] font-bold text-[var(--accent-primary)] animate-pulse uppercase tracking-widest">Guardando...</span>}
                   </div>
                   <textarea id="noteContent" name="noteContent"
                     value={noteContent}
                     onChange={(e) => {
                       setNoteContent(e.target.value);
                       setIsDirty(true);
                     }}
                     placeholder="Escribe recordatorios, pendientes o notas del día..."
                     className="w-full h-32 bg-[var(--bg-main)]/50 border border-[var(--border-color)]/30 rounded-2xl p-4 text-sm font-bold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:ring-2 focus:ring-[var(--accent-light)] focus:bg-[var(--bg-card)] transition-all resize-none custom-scrollbar shadow-inner"
                   />
                </div>
             </div>

             <h2 className="text-xs font-black text-[var(--text-secondary)] flex items-center gap-2 uppercase tracking-widest bg-[var(--bg-main)]/50 px-4 py-2.5 rounded-xl border border-[var(--border-color)]/50 backdrop-blur-sm">
               Accesos Rápidos
             </h2>
             
             {/* Botón Gigante de Llamada a la Acción */}
             {userRole !== 'medico' && (
               <button onClick={() => navigate('/dashboard/agenda?new=true')} className="w-full bg-[var(--accent-primary)] text-white rounded-[32px] p-5 sm:p-6 shadow-[0_0_20px_var(--accent-light)] hover:shadow-[0_0_40px_rgba(14,165,233,0.4)] hover:-translate-y-2 transition-all duration-300 flex flex-col items-center justify-center gap-2 sm:gap-3 group relative overflow-hidden text-center border border-white/20">
                 <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                 <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md group-hover:scale-110 transition-transform duration-300 border border-white/30 shadow-inner">
                   <Plus size={28} className="text-white drop-shadow-md" />
                 </div>
                 <div className="relative z-10">
                   <h3 className="font-black text-xl leading-tight text-white tracking-tight drop-shadow-md">Nuevo Turno</h3>
                   <p className="text-xs font-bold text-white/80 mt-1 uppercase tracking-widest">Registrar en agenda</p>
                 </div>
                 {/* Efecto Shine */}
                 <div className="absolute inset-0 animate-shine pointer-events-none opacity-50"></div>
               </button>
             )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
