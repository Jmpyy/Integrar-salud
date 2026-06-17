import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../../stores/useStore';
import { useSearchParams } from 'react-router-dom';
import {
  Users, Clock, UserCheck, FileText,
  HeartPulse, ShieldAlert, Search, AlertCircle,
  Stethoscope, CalendarDays, LayoutDashboard,
  CalendarRange, Video, X, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PatientHistoryViewer from '../../../components/PatientHistoryViewer';
import { toLocalDateString } from '../../../utils/helpers';
import { APPOINTMENT_STATUS } from '../../../config/constants';
import { socket } from '../../../services/socket';
import api from '../../../services/api';
import { playErrorSound } from '../../../utils/sounds';

export default function ConsultorioPage() {
  const store = useStore();
  const appointments = store.appointments;
  const patients = store.patients;
  const doctors = store.doctors;
  const userRole = store.userRole;
  const user = store.user;
  const isDoctorOrAdmin = ['medico', 'admin'].includes(userRole);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('hoy');

  const [showPatientView, setShowPatientView] = useState(false);
  const [fullPatient, setFullPatient] = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(false);

  const [delayModalApp, setDelayModalApp] = useState(null);
  const [delayMinutes, setDelayMinutes] = useState('');
  const [submittingDelay, setSubmittingDelay] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const openPatientId = searchParams.get('patientId');
  const actionParam = searchParams.get('action');
  const dateParam = searchParams.get('date');

  const [viewerAction, setViewerAction] = useState(null);
  const [viewerDate, setViewerDate] = useState(null);

  // Abrir paciente directo desde URL
  useEffect(() => {
    if (openPatientId && patients.length > 0 && !showPatientView) {
      const patient = patients.find(
        p => Number(p.id) === Number(openPatientId) || p.name === searchParams.get('patientName')
      );
      if (patient) {
        if (actionParam) setViewerAction(actionParam);
        if (dateParam) setViewerDate(dateParam);
        handleOpenPatient(patient);

        searchParams.delete('patientId');
        searchParams.delete('patientName');
        searchParams.delete('action');
        searchParams.delete('date');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [openPatientId, patients, showPatientView]);

  const handleOpenPatient = async (patient) => {
    if (!patient?.id) return;
    setLoadingPatient(true);
    try {
      const { patientsService } = await import('../../../services/patients');
      const full = await patientsService.getById(patient.id);

      if (full) {
        store.setPatients(store.patients.map(p => p.id === full.id ? full : p));
      }

      setFullPatient(full || patient);
      setShowPatientView(true);
    } catch (err) {
      console.error("Error al abrir paciente:", err);
      setFullPatient(patient);
      setShowPatientView(true);
    } finally {
      setLoadingPatient(false);
    }
  };

  useEffect(() => {
    store.fetchAppointments();
    store.fetchPatients();
    store.fetchDoctors();
  }, []);

  const todayString = toLocalDateString(new Date());
  const currentMonthIdx = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const myDoctor = userRole === 'medico' && user?.doctor_id
    ? (doctors.filter(d => d).find(d => Number(d.id) === Number(user.doctor_id)) || null)
    : (userRole === 'medico' ? doctors.filter(d => d).find(d => d.name === user?.name) : null);

  const myAppointments = useMemo(() => {
    return (appointments || []).filter(app => {
      if (!app || !app.id || app.isBlock) return false;
      if (userRole === 'medico' && myDoctor) return Number(app.doctorId) === Number(myDoctor.id);
      return true;
    });
  }, [appointments, userRole, myDoctor]);

  const todaysAppointments = useMemo(() => {
    return myAppointments
      .filter(app => app.date === todayString)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [myAppointments, todayString]);

  const waitingRoomAppointments = useMemo(() => {
    return myAppointments
      .filter(app => app.attendance === APPOINTMENT_STATUS.EN_ESPERA)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [myAppointments]);

  const monthlyAppointments = useMemo(() => {
    return myAppointments
      .filter(app => {
        const appDate = new Date(app.date + 'T12:00:00');
        return appDate.getMonth() === currentMonthIdx && appDate.getFullYear() === currentYear;
      })
      .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || ''));
  }, [myAppointments, currentMonthIdx, currentYear]);

  const currentList = useMemo(() => {
    let list = [];
    if (activeTab === 'hoy') list = todaysAppointments;
    else if (activeTab === 'sala') list = waitingRoomAppointments;
    else if (activeTab === 'mensual') list = monthlyAppointments;

    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(app =>
      (app.patient?.toLowerCase() || '').includes(term) ||
      (app.title?.toLowerCase() || '').includes(term)
    );
  }, [activeTab, todaysAppointments, waitingRoomAppointments, monthlyAppointments, searchTerm]);

  const stats = useMemo(() => {
    const total = todaysAppointments.length;
    const enCurso = todaysAppointments.filter(a => a.attendance === APPOINTMENT_STATUS.EN_CURSO).length;
    const finalizados = todaysAppointments.filter(a => a.attendance === APPOINTMENT_STATUS.FINALIZADO).length;
    const enEspera = todaysAppointments.filter(a => a.attendance === APPOINTMENT_STATUS.EN_ESPERA).length;
    const pendientes = total - finalizados - enCurso - enEspera;
    return { total, enCurso, finalizados, enEspera, pendientes };
  }, [todaysAppointments]);

  const handleStatusChange = async (appId, newStatus) => {
    try {
      const updatedApp = await store.updateAppointmentStatus(appId, newStatus);
      const app = updatedApp || appointments.find(a => a.id === appId);

      if (newStatus === APPOINTMENT_STATUS.FINALIZADO && app && !app.hasEvolution) {
        playErrorSound();
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-slide-in-right' : 'animate-slide-out-right'} max-w-sm w-full bg-[var(--bg-card)] shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-[var(--border-color)] overflow-hidden backdrop-blur-xl border border-rose-500/30`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <AlertCircle className="h-10 w-10 text-rose-500 p-2 bg-rose-500/10 rounded-xl" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-wider mb-1">Evolución Pendiente</p>
                  <p className="text-sm text-[var(--text-primary)] font-bold">
                    ¡Atención! Este turno ha finalizado pero falta completar la Evolución Médica.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-[var(--border-color)]/30 bg-[var(--bg-sidebar)]/80">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-2xl px-4 flex items-center justify-center text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-light)] transition-colors focus:outline-none"
              >
                Cerrar
              </button>
            </div>
          </div>
        ), { duration: 6000, position: 'top-right' });
      }

      if (app?.modalidad === 'virtual') {
        if (newStatus === APPOINTMENT_STATUS.EN_CURSO) {
          await store.updateAppointmentVideoStatus(appId, 'activa');
          store.setActiveCallApp(app);
          socket.emit('call-started', `appointment-${appId}`);
        } else if (newStatus === APPOINTMENT_STATUS.FINALIZADO || newStatus === APPOINTMENT_STATUS.AUSENTE) {
          await store.updateAppointmentVideoStatus(appId, newStatus === APPOINTMENT_STATUS.FINALIZADO ? 'finalizada' : 'ausente');
          if (newStatus === APPOINTMENT_STATUS.FINALIZADO) {
            socket.emit('call-ended', `appointment-${appId}`);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyLink = (app, e) => {
    e.stopPropagation();
    if (!app.dni || !app.codigoAcceso) {
      toast.error('Falta DNI del paciente o código de acceso.');
      return;
    }
    const link = `https://integrarsalud.me/#/sala-virtual?dni=${app.dni}&codigo=${app.codigoAcceso}`;
    navigator.clipboard.writeText(link);
    toast.success('Link de acceso copiado al portapapeles');
  };

  const handleSetDelay = (app, e) => {
    e.stopPropagation();
    setDelayModalApp(app);
    setDelayMinutes('');
  };

  const submitDelay = async () => {
    if (!delayModalApp) return;
    setSubmittingDelay(true);

    let delayMessage = null;
    if (delayMinutes.trim() !== '') {
      delayMessage = `El profesional tuvo un imprevisto y está demorado aproximadamente ${delayMinutes} minutos. Gracias por tu paciencia.`;
    }

    try {
      await api.post('/telemedicine/set_delay', { id: delayModalApp.id, delayMessage });
      toast.success(delayMessage ? 'Aviso de demora enviado al paciente' : 'Aviso de demora borrado');
      socket.emit('delay-updated', { room: `appointment-${delayModalApp.id}`, message: delayMessage });
    } catch (err) {
      toast.error('Error de red al actualizar demora');
    } finally {
      setSubmittingDelay(false);
      setDelayModalApp(null);
    }
  };

  const getStatusBadge = (app) => {
    const statusMap = {
      [APPOINTMENT_STATUS.AGENDADO]: {
        label: 'Agendado',
        color: 'bg-[var(--accent-primary)]/5 text-[var(--accent-primary)] border-[var(--accent-primary)]/20',
        icon: Clock
      },
      [APPOINTMENT_STATUS.CONFIRMADO]: {
        label: 'Confirmado',
        color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        icon: UserCheck
      },
      [APPOINTMENT_STATUS.EN_ESPERA]: {
        label: `En Espera`,
        color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        icon: AlertCircle
      },
      [APPOINTMENT_STATUS.EN_CURSO]: {
        label: 'En Consulta',
        color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
        icon: HeartPulse,
        isLive: true // Activamos el efecto Neón/Ping
      },
      [APPOINTMENT_STATUS.FINALIZADO]: {
        label: 'Finalizado',
        color: 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]/60',
        icon: UserCheck
      },
      [APPOINTMENT_STATUS.AUSENTE]: {
        label: 'Ausente',
        // En diseño moderno, Rose se ve mucho más elegante que Red
        color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        icon: AlertCircle
      },
    };

    const status = statusMap[app.attendance] || statusMap[APPOINTMENT_STATUS.AGENDADO];
    const Icon = status.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] uppercase tracking-widest font-black rounded-full border shadow-sm select-none transition-all ${status.color}`}>
        {status.isLive && (
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
          </span>
        )}
        <Icon size={12} className="shrink-0" />
        {status.label}
      </span>
    );
  };

  // ─── RENDERIZADOS CONDICIONALES ───────────────────────────────
  if (userRole !== 'medico' && userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)] gap-3">
        <Stethoscope size={48} className="opacity-20" />
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Acceso Restringido</h2>
        <p className="text-sm">Este módulo es exclusivo para profesionales de la salud.</p>
      </div>
    );
  }

  if (loadingPatient) {
    return (
      <div className="flex items-center justify-center h-[60vh] flex-col gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-[var(--accent-primary)]/20 rounded-full" />
          <div className="w-12 h-12 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
        </div>
        <p className="text-[var(--text-secondary)] font-bold text-sm">Cargando ficha clínica...</p>
      </div>
    );
  }

  if (showPatientView && fullPatient) {
    return (
      <PatientHistoryViewer
        patient={fullPatient}
        showEditActions={true}
        initialAction={viewerAction}
        initialDate={viewerDate}
        onBack={() => {
          setShowPatientView(false);
          setFullPatient(null);
          setViewerAction(null);
          setViewerDate(null);
        }}
      />
    );
  }

  // ─── CONFIGURACIÓN DE STATS ───────────────────────────────────
  const statsConfig = [
    {
      label: 'Total Hoy',
      value: stats.total,
      icon: CalendarDays,
      colorClass: 'text-indigo-500 dark:text-indigo-400',
      bgClass: 'bg-indigo-500/10',
      borderClass: 'border-indigo-500/20'
    },
    {
      label: 'En Consulta',
      value: stats.enCurso,
      icon: HeartPulse,
      colorClass: 'text-emerald-500 dark:text-emerald-400',
      bgClass: 'bg-emerald-500/10',
      borderClass: 'border-emerald-500/20',
      highlight: stats.enCurso > 0
    },
    {
      label: 'En Espera',
      value: stats.enEspera,
      icon: AlertCircle,
      colorClass: 'text-amber-500 dark:text-amber-400',
      bgClass: 'bg-amber-500/10',
      borderClass: 'border-amber-500/20'
    },
    {
      label: 'Finalizados',
      value: stats.finalizados,
      icon: UserCheck,
      colorClass: 'text-blue-500 dark:text-blue-400',
      bgClass: 'bg-blue-500/10',
      borderClass: 'border-blue-500/20'
    },
    {
      label: 'Pendientes',
      value: stats.pendientes,
      icon: Clock,
      colorClass: 'text-slate-500 dark:text-slate-400',
      bgClass: 'bg-slate-500/10',
      borderClass: 'border-slate-500/20'
    },
  ];

  // ─── TABS CONFIG ──────────────────────────────────────────────
  const tabs = [
    { id: 'hoy', label: 'Hoy', icon: Clock, activeColor: 'bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/25' },
    { id: 'sala', label: 'En Sala', icon: Users, activeColor: 'bg-amber-500 text-white shadow-lg shadow-amber-500/25', badge: waitingRoomAppointments.length },
    { id: 'mensual', label: 'Mensual', icon: CalendarRange, activeColor: 'bg-[var(--text-primary)] text-[var(--bg-main)] shadow-lg shadow-[var(--text-primary)]/15 dark:shadow-[var(--text-primary)]/25' },
  ];

  return (
    <div className="space-y-6 animate-fade-in-quick">
      {/* ─── HEADER ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-effect p-5 sm:p-6 rounded-3xl shadow-[var(--glass-shadow)] border border-[var(--glass-border)]">
        <div className="flex-1">
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
            <div className="p-2 bg-[var(--accent-light)] rounded-xl">
              <Stethoscope size={22} className="text-[var(--accent-primary)]" />
            </div>
            Sala de Consulta
          </h2>
          <div className="flex items-center gap-3 mt-2 ml-0.5">
            <p className="text-sm text-[var(--text-secondary)] font-medium capitalize">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {userRole === 'medico' && myDoctor && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[var(--accent-light)] border border-[var(--accent-primary)]/20 text-[var(--accent-primary)] text-[11px] font-black rounded-full uppercase">
                <Stethoscope size={10} />
                {myDoctor.name}
              </span>
            )}
          </div>
        </div>

        <div className="relative group w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--accent-primary)] transition-colors" size={18} />
          <input
            id="searchTerm"
            name="searchTerm"
            type="text"
            placeholder="Buscar por paciente o motivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl text-sm font-medium text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-light)] transition-all outline-none shadow-sm placeholder:text-[var(--text-secondary)]/60"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-lg transition-all"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ─── TABS ───────────────────────────────────────────── */}
      <div className="flex items-center gap-1 sm:gap-1.5 p-1.5 bg-[var(--bg-card)] border border-[var(--border-color)]/50 rounded-2xl w-full sm:w-fit shadow-sm overflow-x-auto hide-scrollbar">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap relative
                ${isActive ? tab.activeColor + ' translate-y-[-1px]' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-light)] hover:text-[var(--text-primary)]'}`}
            >
              <Icon size={15} className="hidden sm:block" />
              {tab.label}
              {tab.badge > 0 && (
                <span className={`ml-0.5 min-w-[20px] h-5 flex items-center justify-center px-1 rounded-full text-[10px] font-black
                  ${isActive ? 'bg-white/25 text-white' : 'bg-amber-500 text-white'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── STATS CARDS ────────────────────────────────────── */}
      {activeTab === 'hoy' && (
        <div className="flex md:grid md:grid-cols-5 gap-3 sm:gap-4 py-2 overflow-x-auto md:overflow-visible snap-x snap-mandatory hide-scrollbar">
          {statsConfig.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                aria-label={`${stat.label}: ${stat.value}`}
                className={`shrink-0 min-w-[150px] md:min-w-0 snap-start relative bg-[var(--bg-card)] border border-[var(--glass-border)] hover:border-[var(--border-color)] rounded-[20px] p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-between min-h-[110px] overflow-hidden hover:-translate-y-1 will-change-transform
                ${stat.highlight ? 'text-emerald-500' : 'text-[var(--text-primary)]'}`}
              >
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none ${stat.bgClass}`} style={{ maskImage: 'radial-gradient(circle at top right, black, transparent 70%)', WebkitMaskImage: 'radial-gradient(circle at top right, black, transparent 70%)' }} />

                <div className="flex items-start justify-between w-full mb-3 relative z-10">
                  <div className={`p-2.5 rounded-[14px] ${stat.bgClass} border ${stat.borderClass} shadow-inner transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 will-change-transform`}>
                    <Icon size={18} className={stat.colorClass} />
                  </div>

                  <span className={`text-3xl sm:text-4xl font-black tracking-tighter leading-none transition-transform duration-300 origin-right
                    ${stat.highlight ? 'text-emerald-500' : 'text-[var(--text-primary)]'}`}>
                    {stat.value}
                  </span>
                </div>

                <p className="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-widest mt-auto relative z-10 group-hover:text-[var(--text-primary)] transition-colors duration-300 opacity-80 group-hover:opacity-100">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── LISTA DE TURNOS ────────────────────────────────── */}
      <div className="card-premium rounded-3xl overflow-hidden border border-[var(--glass-border)] min-h-[400px]">
        <div className="px-5 sm:px-6 py-4 border-b border-[var(--border-color)]/30 bg-[var(--bg-sidebar)]/50 flex items-center justify-between">
          <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2 capitalize text-sm sm:text-base">
            {activeTab === 'hoy' && <><LayoutDashboard size={18} className="text-[var(--accent-primary)]" /> Agenda del Día</>}
            {activeTab === 'sala' && <><Users size={18} className="text-amber-500" /> Pacientes en Espera</>}
            {activeTab === 'mensual' && <><CalendarRange size={18} className="text-[var(--accent-primary)]" /> Agenda de {new Date().toLocaleDateString('es-ES', { month: 'long' })}</>}
          </h3>
          <span className="text-[10px] sm:text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--border-color)]/40">
            {currentList.length} registro{currentList.length !== 1 ? 's' : ''}
          </span>
        </div>

        {currentList.length === 0 ? (
          <div className="p-16 sm:p-20 text-center text-[var(--text-secondary)]">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)]/40 flex items-center justify-center">
              <LayoutDashboard size={36} className="opacity-30" />
            </div>
            <p className="font-bold text-[var(--text-primary)] text-lg opacity-80">Sin registros en esta vista</p>
            <p className="text-sm mt-2 max-w-sm mx-auto opacity-70">No hay pacientes que coincidan con los criterios de la pestaña actual o los términos de búsqueda.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-color)]/20">
            {currentList.map((app) => {
              const patientData = (patients || []).find(p => p && p.name === app.patient);
              const isFinalizado = app.attendance === APPOINTMENT_STATUS.FINALIZADO;
              const isEnCurso = app.attendance === APPOINTMENT_STATUS.EN_CURSO;
              const isWaiting = app.attendance === APPOINTMENT_STATUS.EN_ESPERA;
              const faltaEvolucion = isFinalizado && !app.hasEvolution;

              return (
                <div
                  key={app.id}
                  className={`p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4 sm:gap-5 transition-all duration-200 group
                    ${(isFinalizado && app.hasEvolution) ? 'opacity-50 hover:opacity-70' : 'hover:bg-[var(--accent-light)]/50'}
                    ${faltaEvolucion ? 'bg-red-500/5 dark:bg-red-500/[0.07] border-l-4 border-l-red-500' : ''}
                    ${isEnCurso ? 'bg-emerald-500/5 dark:bg-emerald-500/[0.07] border-l-4 border-l-emerald-500' : ''}
                  `}
                >
                  {/* Info del paciente */}
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                    {/* Hora */}
                    <div className="text-center w-14 shrink-0 mt-1">
                      <p className={`text-lg sm:text-xl font-black tracking-tight transition-colors
                        ${isEnCurso ? 'text-emerald-500' : 'text-[var(--text-primary)]'}`}>
                        {app.time?.slice(0, 5)}
                      </p>
                      {activeTab === 'mensual' ? (
                        <p className="text-[10px] font-bold text-[var(--accent-primary)] uppercase">
                          {new Date(app.date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                        </p>
                      ) : (
                        <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">HS</p>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-sm sm:text-base uppercase shrink-0 transition-all
                      ${isFinalizado ? 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)]' :
                        isEnCurso ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' :
                          'bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-hover)] text-white shadow-lg shadow-[var(--accent-primary)]/20'
                      }`}>
                      {app.patient?.charAt(0) || '?'}
                    </div>

                    {/* Datos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <h4 className={`text-sm sm:text-base font-extrabold truncate transition-all
                          ${isFinalizado ? 'text-[var(--text-secondary)] line-through' : 'text-[var(--text-primary)]'}`}>
                          {app.patient}
                        </h4>
                        {getStatusBadge(app)}
                        {app.modalidad === 'virtual' && isWaiting && (
                          <span
                            title="El paciente está conectado en la sala de espera virtual"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] uppercase font-black tracking-widest rounded-full border border-emerald-500/20 shadow-sm select-none"
                          >
                            <span className="relative flex h-1.5 w-1.5 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
                            </span>
                            Conectado
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] flex-wrap">
                        {(app.title || app.modalidad) && (
                          <span className="inline-flex items-center gap-2 px-2.5 py-1 bg-[var(--bg-main)] border border-[var(--border-color)]/50 text-[11px] font-semibold rounded-lg uppercase tracking-wide transition-all hover:border-[var(--accent-primary)]/30">
                            {app.title && (
                              <>
                                <span className="text-[var(--text-secondary)] font-medium normal-case tracking-normal">
                                  {app.title}
                                </span>
                                <span className="text-[var(--border-color)]">•</span>
                              </>
                            )}
                            <span className="text-[var(--text-primary)] font-semibold">
                              {app.modalidad || 'Presencial'}
                            </span>
                          </span>
                        )}
                        {patientData?.nhc && (
                          <span className="text-[10px] font-black text-[var(--text-secondary)] bg-[var(--bg-main)] px-2 py-0.5 rounded-md border border-[var(--border-color)]/40 font-mono">
                            NHC: {patientData.nhc}
                          </span>
                        )}
                      </div>

                      {patientData?.allergies && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-red-500 dark:text-red-400">
                          <div className="p-0.5 bg-red-500/10 rounded">
                            <ShieldAlert size={12} />
                          </div>
                          ALERTA: {patientData.allergies}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ─── ACCIONES ─────────────────────────────── */}
                  {isDoctorOrAdmin && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 shrink-0 w-full lg:w-auto mt-2 lg:mt-0 pt-3 lg:pt-0 border-t border-[var(--border-color)]/30 lg:border-none">
                      {/* Botón Historia Clínica */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenPatient(patientData); }}
                        disabled={!patientData}
                        className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-black flex items-center justify-center gap-2 transition-all shrink-0
                          ${!patientData
                            ? 'bg-[var(--bg-sidebar)] text-[var(--text-secondary)]/40 border border-[var(--border-color)]/30 cursor-not-allowed'
                            : faltaEvolucion
                              ? 'bg-red-500/10 dark:bg-red-500/15 border-2 border-red-500/50 text-red-500 dark:text-red-400 hover:bg-red-500 hover:text-white shadow-md'
                              : 'bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] shadow-sm'
                          }`}
                        title={patientData ? 'Abrir historia clínica completa' : 'Paciente sin registro básico'}
                      >
                        {faltaEvolucion ? <AlertCircle size={15} /> : <FileText size={15} />}
                        <span>{faltaEvolucion ? 'FALTA EVOLUCIÓN' : 'HISTORIA CLÍNICA'}</span>
                      </button>

                      {!isFinalizado && app.attendance !== APPOINTMENT_STATUS.AUSENTE && (
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto flex-1">
                          {!isEnCurso ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (app.modalidad === 'virtual') {
                                  if (app.paymentStatus !== 'pagado') {
                                    toast.error('No podés iniciar la videollamada porque el paciente aún no ha abonado la consulta.', { icon: '💳' });
                                    return;
                                  }
                                  if (app.date && app.time) {
                                    const now = new Date();
                                    const [year, month, day] = app.date.split('-').map(Number);
                                    const [hour, minute] = app.time.split(':').map(Number);
                                    const appDateTime = new Date(year, month - 1, day, hour, minute);
                                    if (Math.floor((appDateTime.getTime() - now.getTime()) / 60000) > 5) {
                                      toast.error('Solo se permite iniciar 5 minutos antes del turno.', { icon: '⏳' });
                                      return;
                                    }
                                  }
                                  store.setActiveCallApp(app);
                                } else {
                                  handleStatusChange(app.id, APPOINTMENT_STATUS.EN_CURSO);
                                }
                              }}
                              className={`w-full sm:w-auto flex-1 px-5 py-2.5 rounded-xl text-[11px] sm:text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md
                                ${isWaiting && app.modalidad === 'virtual'
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/25 ring-2 ring-emerald-500/30 ring-offset-2 ring-offset-[var(--bg-card)]'
                                  : isWaiting
                                    ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/25'
                                    : 'bg-[var(--text-primary)] text-[var(--bg-main)] hover:opacity-90 shadow-[var(--text-primary)]/15'
                                }`}
                            >
                              {app.modalidad === 'virtual' ? <Video size={15} className={isWaiting ? "animate-pulse" : ""} /> : <HeartPulse size={15} />}
                              <span>{app.modalidad === 'virtual' ? 'INICIAR VIDEOLLAMADA' : 'INICIAR CONSULTA'}</span>
                            </button>
                          ) : (
                            <div className="flex flex-col sm:flex-row gap-2 w-full flex-1">
                              {app.modalidad === 'virtual' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); store.setActiveCallApp(app); }}
                                  className="w-full sm:w-auto flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-[11px] sm:text-xs font-black flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-md shadow-indigo-500/25 transition-all"
                                >
                                  <Video size={15} />
                                  <span>VOLVER AL VIDEO</span>
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOpenPatient(patientData); }}
                                className="w-full sm:w-auto flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-[11px] sm:text-xs font-black flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-md shadow-emerald-500/25 transition-all"
                              >
                                <FileText size={15} />
                                <span>EVOLUCIÓN</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(app.id, APPOINTMENT_STATUS.FINALIZADO);
                                  if (app.modalidad === 'virtual') socket.emit('call-ended', `appointment-${app.id}`);
                                }}
                                className="w-full sm:w-auto flex-1 px-4 py-2.5 bg-[var(--accent-primary)] text-white rounded-xl text-[11px] sm:text-xs font-black flex items-center justify-center gap-2 hover:bg-[var(--accent-hover)] shadow-md shadow-[var(--accent-primary)]/25 transition-all"
                              >
                                <UserCheck size={15} />
                                <span>FINALIZAR</span>
                              </button>
                            </div>
                          )}

                          {app.modalidad === 'virtual' && !isEnCurso && (
                            <button
                              onClick={(e) => handleSetDelay(app, e)}
                              className="w-full sm:w-auto px-4 py-2.5 bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-2 hover:bg-amber-500/20 transition-colors shrink-0"
                            >
                              <AlertCircle size={15} /> Avisar Demora
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── MODAL: Avisar Demora ────────────────────────────── */}
      {delayModalApp && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in-quick">
          <div
            className="bg-[var(--bg-card)] rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-scale-in border border-[var(--glass-border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-amber-500/10 dark:bg-amber-500/15 text-amber-500 rounded-xl flex items-center justify-center border border-amber-500/20">
                  <AlertCircle size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[var(--text-primary)]">Avisar Demora</h3>
                  <p className="text-xs text-[var(--text-secondary)] font-medium">{delayModalApp.patient}</p>
                </div>
              </div>
              <button
                onClick={() => setDelayModalApp(null)}
                className="w-8 h-8 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm font-medium text-[var(--text-secondary)] mb-4 leading-relaxed">
              Ingresá los minutos aproximados de demora. Se le mostrará un aviso al paciente en la sala de espera.
              <span className="block mt-1 text-xs opacity-80">(Dejá en blanco para borrar un aviso anterior)</span>
            </p>

            <input
              id="delayMinutes"
              name="delayMinutes"
              type="number"
              placeholder="Ej: 15"
              value={delayMinutes}
              onChange={(e) => setDelayMinutes(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl font-bold text-[var(--text-primary)] transition-all mb-5 outline-none placeholder:text-[var(--text-secondary)]/50"
              autoFocus
            />

            <div className="flex gap-3">
              <button
                onClick={() => setDelayModalApp(null)}
                disabled={submittingDelay}
                className="flex-1 py-3 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={submitDelay}
                disabled={submittingDelay}
                className="flex-1 py-3 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-lg shadow-amber-500/25 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {submittingDelay ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  'Enviar Aviso'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
