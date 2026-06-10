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
  BarChart as BarChartIcon
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

  const appointments = store.appointments || [];
  const doctors = store.doctors || [];
  const transactions = store.transactions || [];
  const patients = store.patients || [];
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
    <>
      {/* ROW: Tarjetas de Resumen (Stats) - Grid 2x2 en móvil */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="card-premium p-4 sm:p-6 group">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${stat.color}`}>
                <stat.icon size={20} className="sm:w-6 sm:h-6" />
              </div>
              <div className={`flex items-center gap-1 text-[9px] sm:text-xs font-bold px-2 py-0.5 rounded-full ${stat.isPositive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-red-50 text-red-600 dark:bg-red-900/20'}`}>
                {stat.isPositive ? <TrendingUp size={11}/> : <TrendingUp size={11} className="rotate-180"/>}
                {stat.trend}
              </div>
            </div>
            <h3 className="text-[var(--text-secondary)] text-[11px] sm:text-sm font-medium mb-1 tracking-tight">{stat.title}</h3>
            <p className="text-xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tighter">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* NEW: Visual Insights Section */}
      <div className={`grid grid-cols-1 ${canViewFinances ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-6`}>
        {canViewFinances && (
          <div className="card-premium p-4 sm:p-6 flex flex-col h-[280px] sm:h-[350px]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider">Flujo de Ingresos</h3>
                <p className="text-xs text-[var(--text-secondary)] font-medium">Comparativo mensual (Real)</p>
              </div>
              <Activity className="text-[var(--accent-primary)] opacity-40" size={20} />
            </div>
            <div className="flex-1 w-full flex items-center justify-center">
              {isMounted && (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 600}} 
                  />
                  <Tooltip 
                    contentStyle={{backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)'}}
                    itemStyle={{color: 'var(--accent-primary)', fontWeight: 'bold'}}
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

        <div className={`card-premium p-4 sm:p-6 flex flex-col ${isAdmin ? 'h-[280px] sm:h-[350px]' : 'h-[300px] sm:h-[400px] shadow-lg shadow-indigo-500/5'}`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider">Distribución de Turnos</h3>
              <p className="text-xs text-[var(--text-secondary)] font-medium">Por estado de asistencia</p>
            </div>
            <BarChartIcon className="text-[var(--accent-primary)] opacity-40" size={20} />
          </div>
          <div className="flex-1 w-full flex items-center justify-center">
            {isMounted && (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={[
                { name: 'Agendado', count: appointments.filter(a => a.attendance === 'agendado').length },
                { name: 'En Espera', count: appointments.filter(a => a.attendance === 'en_espera').length },
                { name: 'Finalizado', count: appointments.filter(a => a.attendance === 'finalizado').length },
                { name: 'Ausente', count: appointments.filter(a => a.attendance === 'ausente').length },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 600}} />
                <Tooltip 
                  cursor={{fill: 'var(--accent-light)'}} 
                  contentStyle={{backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', color: 'var(--text-primary)'}} 
                  itemStyle={{color: 'var(--text-primary)', fontWeight: 'bold'}}
                  formatter={(value) => [value, 'Cantidad']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  { [0,1,2,3].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 2 ? 'var(--accent-primary)' : 'var(--text-secondary)'} opacity={index === 2 ? 1 : 0.4} />
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
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Agenda de Hoy</h2>
              {/* Barra de Progreso */}
              {todaysAppointments.length > 0 && (
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1 h-2 bg-[var(--border-color)] rounded-full overflow-hidden w-32 sm:w-48">
                    <div 
                      className="h-full bg-[var(--accent-primary)] rounded-full transition-all duration-1000 ease-in-out shadow-[0_0_8px_var(--accent-primary)]" 
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-bold text-[var(--text-secondary)]">{completedCount} de {todaysAppointments.length} turnos ({progressPercentage}%)</span>
                </div>
              )}
            </div>
            
            <button onClick={() => navigate('/dashboard/agenda')} className="text-sm font-bold text-[var(--accent-primary)] hover:text-[var(--accent-hover)] hover:underline">Ver agenda completa</button>
          </div>

          <div className="card-premium min-h-[100px] overflow-visible">
            <div className="divide-y divide-[var(--border-color)]">
              {todaysAppointments.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-medium flex flex-col items-center gap-2">
                  <CalendarDays size={48} className="text-slate-200" />
                  Hoy no hay turnos programados en la agenda.
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
                  <div key={app.id} className={`p-4 sm:p-6 transition-colors flex items-center gap-3 sm:gap-6 group relative ${isSuspended ? 'opacity-50 grayscale' : 'hover:bg-indigo-50/30'} ${isBlock ? 'bg-stripes bg-slate-50 border-b border-slate-100' : ''}`}>
                    {/* Hora */}
                    <div className="w-10 sm:w-16 text-center shrink-0">
                      <p className={`text-[11px] sm:text-sm font-black transition-colors ${isInProgress && !isBlock ? 'text-[var(--accent-primary)]' : (isFinished || isBlock ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)] group-hover:text-[var(--accent-primary)]')}`}>
                        {app.time}
                      </p>
                      <p className="text-[8px] font-black text-[var(--text-secondary)] mt-0.5 opacity-50 uppercase">HS</p>
                    </div>
                    
                    {/* Línea de tiempo visual (Punto palpitante si está en progreso) */}
                    <div className="w-1 h-12 bg-[var(--border-color)] rounded-full relative shrink-0">
                      <div className={`absolute top-0 bottom-0 w-full rounded-full ${isSuspended || isBlock ? 'bg-[var(--text-secondary)]' : (isFinished ? 'bg-emerald-400' : 'bg-[var(--accent-primary)]')}`}></div>
                      {isInProgress && !isBlock && (
                        <div className="absolute top-1/2 -left-1 w-3 h-3 bg-[var(--accent-primary)] rounded-full shadow-[0_0_10px_var(--accent-primary)] -translate-y-1/2 animate-pulse"></div>
                      )}
                    </div>

                    {/* Info Paciente y Pago */}
                    <div className="flex-1 min-w-0 flex items-center gap-4">
                      {/* Avatar */}
                      <div className={`hidden sm:flex w-10 h-10 sm:w-12 sm:h-12 rounded-full font-bold items-center justify-center shrink-0 border uppercase ${isBlock ? 'bg-[var(--border-color)] text-[var(--text-secondary)] border-[var(--border-color)]' : isFinished ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/40 dark:border-emerald-800' : 'bg-[var(--accent-light)] text-[var(--accent-primary)] border-[var(--accent-light)]'}`}>
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
                      <span className={`hidden sm:inline-flex px-3 py-1.5 text-[11px] uppercase tracking-wide font-bold rounded-full items-center gap-1.5 shadow-sm border
                        ${isBlock ? 'bg-slate-100 text-slate-500 border-slate-200' :
                          isSuspended ? 'bg-red-50 text-red-600 border-red-100' :
                          isFinished ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                          app.attendance === 'en_curso' ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-100 animate-pulse' :
                          isInProgress ? 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-200 animate-pulse' :
                          app.attendance === 'en_espera' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                          app.attendance === 'confirmado' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                          'bg-indigo-50 text-indigo-700 border-indigo-100'
                        }`}
                      >
                        {isBlock ? 'Bloqueo' : isSuspended ? 'Ausente' : isFinished ? 'Finalizado' : app.attendance === 'en_curso' ? 'En Consulta' : isInProgress ? 'En Curso' : app.attendance === 'en_espera' ? 'En Espera' : app.attendance === 'confirmado' ? 'Confirmado' : 'Agendado'}
                      </span>
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(activeDropdown === app.id ? null : app.id);
                        }}
                        className={`p-2 transition-colors rounded-full ${activeDropdown === app.id ? 'text-[var(--accent-primary)] bg-[var(--accent-light)]' : 'text-[var(--text-secondary)] hover:text-[var(--accent-primary)] bg-[var(--bg-card)] hover:bg-[var(--accent-light)] opacity-0 group-hover:opacity-100'}`}
                      >
                        <MoreVertical size={18} />
                      </button>

                      {/* Dropdown Options */}
                      {activeDropdown === app.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); }}></div>
                          <div className="absolute right-0 top-10 w-48 bg-[var(--bg-card)] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-[var(--border-color)] py-1 z-50 animate-fade-in-quick">
                            {/* WhatsApp */}
                            {store.globalConfig?.whatsappEnabled && (
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setActiveDropdown(null);
                                   handleSendWhatsApp(app);
                                 }}
                                 className="w-full text-left px-4 py-2.5 text-xs font-bold text-green-600 hover:bg-green-50 transition-colors border-b border-slate-50 flex items-center gap-2"
                               >
                                 <span>💬</span> Enviar WhatsApp
                               </button>
                            )}
                            {/* Dropdown de Estados de Pago Expandido */}
                            <div className="border-t border-slate-50 mt-1 pt-1">
                              <div className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado de Pago</div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  store.updateAppointmentPaymentStatus(app.id, { paymentStatus: 'pendiente' });
                                  setActiveDropdown(null);
                                }}
                                className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors flex items-center justify-between ${app.paymentStatus === 'pendiente' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:bg-slate-50'}`}
                              >
                                Pendiente
                                {app.paymentStatus === 'pendiente' && <CheckCircle2 size={12} />}
                              </button>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (app.paymentStatus === 'pagado') {
                                    setActiveDropdown(null);
                                    return;
                                  }
                                  const totalFee = Number(app.paymentAmount || 35000);
                                  store.updateAppointmentPaymentStatus(app.id, { 
                                    paymentStatus: 'pagado',
                                    paidAmount: totalFee
                                  });
                                  if (totalFee > 0) {
                                    store.createTransaction({
                                      id: Date.now(),
                                      date: nowForAPI(),
                                      type: 'Ingreso',
                                      concept: `Cobro Total ${app.title} — ${app.patient}`,
                                      method: app.paymentMethod || 'Efectivo',
                                      amount: totalFee,
                                      notes: `Desde Dashboard (Turno #${app.id})`,
                                      doctor_id: app.doctorId,
                                      patient_id: app.patientId
                                    });
                                  }
                                  setActiveDropdown(null);
                                }}
                                className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors flex items-center justify-between ${app.paymentStatus === 'pagado' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-600 hover:bg-slate-50'}`}
                              >
                                Abonado
                                {app.paymentStatus === 'pagado' && <CheckCircle2 size={12} />}
                              </button>

                              <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   const defaultAmount = app.paymentAmount || 35000;
                                   setSenasInput({ appId: app.id, value: String(Math.floor(defaultAmount / 2)) });
                                 }}
                                 className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors flex items-center justify-between ${app.paymentStatus === 'senado' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:bg-slate-50'}`}
                               >
                                 Señado
                                 {app.paymentStatus === 'senado' && <CheckCircle2 size={12} />}
                               </button>

                               {/* Inline seña input */}
                               {senasInput.appId === app.id && (
                                 <div className="px-3 py-2 border-t border-slate-50 bg-indigo-50/50" onClick={e => e.stopPropagation()}>
                                   <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-2">Monto de la seña</p>
                                   <div className="flex gap-2">
                                     <div className="relative flex-1">
                                       <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-indigo-500">$</span>
                                       <input id="value" name="value"
                                         type="number"
                                         autoFocus
                                         min="0"
                                         value={senasInput.value}
                                         onChange={e => setSenasInput(prev => ({ ...prev, value: e.target.value }))}
                                         onKeyDown={e => {
                                           if (e.key === 'Enter') {
                                             const amount = Number(senasInput.value);
                                             store.updateAppointmentPaymentStatus(app.id, { 
                                               paymentStatus: 'senado', 
                                               paidAmount: amount 
                                             });
                                             if (amount > 0) {
                                               store.createTransaction({
                                                 id: Date.now(),
                                                 date: nowForAPI(),
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
                                         className="w-full pl-6 pr-2 py-1.5 text-sm font-bold text-indigo-700 bg-white border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200"
                                         placeholder="0"
                                       />
                                     </div>
                                     <button
                                       onClick={e => {
                                         e.stopPropagation();
                                         const amount = Number(senasInput.value);
                                         store.updateAppointmentPaymentStatus(app.id, { 
                                           paymentStatus: 'senado', 
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
                                       className="px-2.5 py-1.5 bg-indigo-600 text-white text-xs font-black rounded-lg hover:bg-indigo-700 transition-colors shrink-0"
                                     >
                                       OK
                                     </button>
                                   </div>
                                 </div>
                               )}
                            </div>
                            {/* Details Shortcut */}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate('/dashboard/agenda');
                              }}
                              className="w-full text-left px-4 py-2.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
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
        <div className="space-y-6">
          <div className="flex flex-col gap-6">
             {/* NOTA DINÁMICA HIBRIDA */}
             <div className="card-premium overflow-hidden flex flex-col !border-none">
                {/* Cabecera: Voz del Sistema */}
                <div className="bg-[var(--accent-primary)] p-4 text-white">
                   <div className="flex items-center gap-3 mb-2">
                      <div className="bg-white/20 p-2 rounded-lg">
                         <Sparkles size={18} className="text-white" />
                      </div>
                      <h4 className="font-bold text-sm uppercase tracking-wider">Voz del Sistema</h4>
                   </div>
                   <p className="text-sm font-medium leading-relaxed text-sky-50">
                     {todaysPatientAppointments.length > 0 
                       ? `Hoy tienes ${todaysPatientAppointments.length} turnos programados. Recordar confirmar pagos y asistencias.`
                       : 'No hay actividad programada para hoy. ¡Aprovecha para organizar tus historias clínicas!'}
                   </p>
                </div>

                {/* Cuerpo: Nota Personal editable */}
                <div className="p-5 flex flex-col gap-3">
                   <div className="flex items-center justify-between">
                      <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                        <ArrowRight size={12} className="text-[var(--accent-primary)]" /> Nota Personal
                      </h5>
                      {isSaving && <span className="text-[10px] font-bold text-[var(--accent-primary)] animate-pulse italic">Guardando...</span>}
                   </div>
                   <textarea id="noteContent" name="noteContent"
                     value={noteContent}
                     onChange={(e) => {
                       setNoteContent(e.target.value);
                       setIsDirty(true);
                     }}
                     placeholder="Escribe recordatorios, pendientes o notas del día..."
                     className="w-full h-32 bg-[var(--bg-main)] border-none rounded-2xl p-4 text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/30 focus:ring-2 focus:ring-[var(--accent-light)] transition-all resize-none custom-scrollbar"
                   />
                </div>
             </div>

             <h2 className="text-xs font-black text-[var(--text-secondary)] flex items-center gap-2 uppercase tracking-widest bg-[var(--bg-main)] px-4 py-2 rounded-xl border border-[var(--border-color)]">Accesos Rápidos</h2>
             
             {/* Botón Gigante de Llamada a la Acción */}
             {userRole !== 'medico' && (
               <button onClick={() => navigate('/dashboard/agenda?new=true')} className="w-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-hover)] text-white rounded-[32px] p-5 sm:p-6 shadow-xl shadow-sky-500/10 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 flex flex-col items-center justify-center gap-2 sm:gap-3 group relative overflow-hidden text-center">
                 <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                   <Plus size={28} className="text-white" />
                 </div>
                 <div className="relative z-10">
                   <h3 className="font-bold text-lg leading-tight text-white">Nuevo Turno</h3>
                   <p className="text-sm text-sky-50 font-medium mt-1">Registrar cita en agenda</p>
                 </div>
               </button>
             )}
          </div>
        </div>
        
      </div>
    </>
  );
}
