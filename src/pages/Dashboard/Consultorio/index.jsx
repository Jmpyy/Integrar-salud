import { useState, useMemo, useEffect, useRef } from 'react';
import { useStore } from '../../../stores/useStore';
import { useSearchParams } from 'react-router-dom';
import {
  Users, Clock, UserCheck, FileText,
  HeartPulse, ShieldAlert, Search, AlertCircle,
  Stethoscope, CalendarDays, LayoutDashboard,
  CalendarRange, Video, X, Loader2, Maximize, Minimize
} from 'lucide-react';
import toast from 'react-hot-toast';
import PatientHistoryViewer from '../../../components/PatientHistoryViewer';
import { toLocalDateString } from '../../../utils/helpers';
import { APPOINTMENT_STATUS } from '../../../config/constants';
import { socket } from '../../../services/socket';
import DailyMeeting from '../../../components/DailyMeeting';
import api from '../../../services/api';
import { playErrorSound } from '../../../utils/sounds';

export default function ConsultorioPage() {
  const store = useStore();
  const appointments = store.appointments;
  const patients     = store.patients;
  const doctors      = store.doctors;
  const userRole     = store.userRole;
  const user         = store.user;
  const isDoctorOrAdmin = ['medico', 'admin'].includes(userRole);

  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('hoy'); // 'hoy', 'sala', 'mensual'

  const [showPatientView, setShowPatientView] = useState(false);
  const [fullPatient, setFullPatient] = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(false);

  // Estados para videollamada y demoras
  const [delayModalApp, setDelayModalApp] = useState(null);
  const [delayMinutes, setDelayMinutes] = useState('');

  // Soportar abrir paciente directo desde URL
  const [searchParams, setSearchParams] = useSearchParams();
  const openPatientId = searchParams.get('patientId');
  const actionParam = searchParams.get('action');
  const dateParam = searchParams.get('date');

  const [viewerAction, setViewerAction] = useState(null);
  const [viewerDate, setViewerDate] = useState(null);

  useEffect(() => {
    if (openPatientId && patients.length > 0 && !showPatientView) {
       const patient = patients.find(p => Number(p.id) === Number(openPatientId) || p.name === searchParams.get('patientName'));
       if (patient) {
          if (actionParam) setViewerAction(actionParam);
          if (dateParam) setViewerDate(dateParam);
          handleOpenPatient(patient);
          
          searchParams.delete('patientId');
          searchParams.delete('patientName');
          searchParams.delete('action');
          searchParams.delete('date');
          setSearchParams(searchParams, {replace: true});
       }
    }
  }, [openPatientId, patients, showPatientView]);

  const handleOpenPatient = async (patient) => {
    if (!patient?.id) return;
    setLoadingPatient(true);
    try {
      const { patientsService } = await import('../../../services/patients');
      const full = await patientsService.getById(patient.id);
      
      // IMPORTANTE: Actualizar el store global con la información completa (historia, medicación, etc)
      // para que PatientHistoryViewer (que ahora usa el store como fuente de verdad) vea todo.
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
    // Carga inicial
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

  // Chequeo de alertas para el médico
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
          <div className={`${t.visible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 max-w-sm w-full bg-[var(--bg-card)] shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-[var(--border-color)] overflow-hidden backdrop-blur-xl border border-[var(--glass-border)]`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <AlertCircle className="h-10 w-10 text-rose-500 p-2 bg-rose-500/10 rounded-xl animate-pulse" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-wider mb-1">Evolución Pendiente</p>
                  <p className="text-sm text-[var(--text-primary)] font-bold">
                    ¡Atención! Este turno ha finalizado pero falta completar la Evolución Médica.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-[var(--border-color)]/20 bg-[var(--bg-sidebar)]/50">
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
          // Llamar al paciente automáticamente
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
      setDelayModalApp(null);
    }
  };

  const getStatusBadge = (app) => {
    const statusMap = {
      [APPOINTMENT_STATUS.AGENDADO]: { label: 'Agendado', color: 'bg-[var(--accent-light)] text-[var(--accent-primary)] border-[var(--accent-light)]', icon: Clock },
      [APPOINTMENT_STATUS.CONFIRMADO]: { label: 'Confirmado', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: UserCheck },
      [APPOINTMENT_STATUS.EN_ESPERA]: { label: `En Espera (${app.waitTicket || ''})`, color: 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse', icon: AlertCircle },
      [APPOINTMENT_STATUS.EN_CURSO]: { label: 'En Consulta', color: 'bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-500/20', icon: HeartPulse },
      [APPOINTMENT_STATUS.FINALIZADO]: { label: 'Finalizado', color: 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]', icon: UserCheck },
      [APPOINTMENT_STATUS.AUSENTE]: { label: 'Ausente', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: AlertCircle },
    };
    const status = statusMap[app.attendance] || statusMap[APPOINTMENT_STATUS.AGENDADO];
    const Icon = status.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11px] uppercase tracking-wide font-bold rounded-full border ${status.color}`}>
        <Icon size={12} />
        {status.label}
      </span>
    );
  };

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
        <div className="w-10 h-10 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
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
          setSelectedPatientId(null); 
          setFullPatient(null); 
          setViewerAction(null);
          setViewerDate(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-quick">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-effect p-6 rounded-3xl shadow-[var(--glass-shadow)] border border-[var(--glass-border)]">
        <div className="flex-1">
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <Stethoscope size={24} className="text-[var(--accent-primary)]" /> Sala de Consulta
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-[var(--text-secondary)] font-medium capitalize">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {userRole === 'medico' && myDoctor && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[var(--accent-light)] border border-[var(--accent-primary)]/20 text-[var(--accent-primary)] text-[11px] font-black rounded-full uppercase">
                 {myDoctor.name}
              </span>
            )}
          </div>
        </div>

        <div className="relative group w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--accent-primary)] transition-colors" size={20} />
          <input id="searchTerm" name="searchTerm"
            type="text"
            placeholder="Buscar por paciente o motivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl text-sm font-medium text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-light)] transition-all outline-none shadow-sm placeholder:text-[var(--text-secondary)]/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 p-1.5 bg-[var(--bg-card)] border border-[var(--border-color)]/50 rounded-2xl w-full sm:w-fit shadow-sm overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab('hoy')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'hoy' ? 'bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/20 translate-y-[-1px]' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-light)]'}`}
        >
          <Clock size={16} className="hidden sm:block" /> Hoy
        </button>
        <button
          onClick={() => setActiveTab('sala')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'sala' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 translate-y-[-1px]' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-light)]'}`}
        >
          <Users size={16} className="hidden sm:block" /> En Sala
          {waitingRoomAppointments.length > 0 && <span className="ml-1 w-5 h-5 flex items-center justify-center bg-white/20 rounded-full text-[10px]">{waitingRoomAppointments.length}</span>}
        </button>
        <button
          onClick={() => setActiveTab('mensual')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'mensual' ? 'bg-[var(--text-primary)] text-[var(--bg-main)] shadow-lg shadow-[var(--text-primary)]/10 translate-y-[-1px]' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-light)]'}`}
        >
          <CalendarRange size={16} className="hidden sm:block" /> Mensual
        </button>
      </div>

      {activeTab === 'hoy' && (
        <div className="flex sm:grid sm:grid-cols-5 gap-2 sm:gap-3 overflow-x-auto sm:overflow-visible hide-scrollbar py-2 sm:py-0 snap-x snap-mandatory">
          {[
            { label: 'Total Hoy', value: stats.total, icon: CalendarDays, color: 'text-[var(--accent-primary)]', bg: 'bg-[var(--accent-light)]' },
            { label: 'En Consulta', value: stats.enCurso, icon: HeartPulse, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'En Espera', value: stats.enEspera, icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Finalizados', value: stats.finalizados, icon: UserCheck, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Pendientes', value: stats.pendientes, icon: Clock, color: 'text-[var(--text-secondary)]', bg: 'bg-[var(--bg-sidebar)]' },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="card-premium rounded-2xl p-3 sm:p-4 border border-[var(--glass-border)] flex items-center gap-2.5 sm:gap-3 shrink-0 min-w-[140px] sm:min-w-0 snap-start">
                <div className={`${stat.bg} p-2 sm:p-2.5 rounded-xl shrink-0`}>
                  <Icon size={16} className={`${stat.color} sm:w-[18px] sm:h-[18px]`} />
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-lg sm:text-xl font-black text-[var(--text-primary)]">{stat.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card-premium rounded-3xl overflow-hidden border border-[var(--glass-border)] min-h-[400px]">
        <div className="px-6 py-4 border-b border-[var(--border-color)]/30 bg-[var(--bg-sidebar)]/50 flex items-center justify-between">
          <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2 capitalize">
            {activeTab === 'hoy' && <><LayoutDashboard size={18} className="text-[var(--accent-primary)]" /> Agenda del Día</>}
            {activeTab === 'sala' && <><Users size={18} className="text-amber-500" /> Pacientes en Espera</>}
            {activeTab === 'mensual' && <><CalendarRange size={18} className="text-[var(--accent-primary)]" /> Agenda de {new Date().toLocaleDateString('es-ES', { month: 'long' })}</>}
          </h3>
          <span className="text-xs font-semibold text-[var(--text-secondary)] opacity-50 uppercase tracking-widest">
            {currentList.length} Registro{currentList.length !== 1 ? 's' : ''}
          </span>
        </div>

        {currentList.length === 0 ? (
          <div className="p-20 text-center text-[var(--text-secondary)]">
            <LayoutDashboard size={64} className="mx-auto mb-6 opacity-10" />
            <p className="font-bold text-[var(--text-primary)] text-xl opacity-80">Sin registros en esta vista</p>
            <p className="text-sm mt-2 max-w-sm mx-auto opacity-60">No hay pacientes que coincidan con los criterios de la pestaña actual o los términos de búsqueda.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-color)]/20">
            {currentList.map((app) => {
              const patientData = (patients || []).find(p => p && p.name === app.patient);
              const isFinalizado = app.attendance === APPOINTMENT_STATUS.FINALIZADO;
              const isEnCurso = app.attendance === APPOINTMENT_STATUS.EN_CURSO;
              const isWaiting = app.attendance === APPOINTMENT_STATUS.EN_ESPERA;

              return (
                <div
                  key={app.id}
                  className={`p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4 sm:gap-5 transition-all duration-200 group
                    ${(isFinalizado && app.hasEvolution) ? 'opacity-40 grayscale-[0.5]' : 'hover:bg-[var(--accent-light)]'}
                    ${(isFinalizado && !app.hasEvolution) ? 'bg-red-500/5 border-l-4 border-red-500' : ''}
                    ${isEnCurso ? 'bg-emerald-500/5 border-l-4 border-l-emerald-500' : ''}
                  `}
                >
                  {/* Info del paciente */}
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="text-center w-14 shrink-0 mt-1">
                      <p className={`text-lg sm:text-xl font-black tracking-tight ${isEnCurso ? 'text-emerald-500' : 'text-[var(--text-primary)]'}`}>
                        {app.time?.slice(0, 5)}
                      </p>
                      {activeTab === 'mensual' && (
                        <p className="text-[10px] font-bold text-[var(--accent-primary)] uppercase">
                          {new Date(app.date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                        </p>
                      )}
                      {activeTab !== 'mensual' && (
                        <p className="text-[9px] font-bold text-[var(--text-secondary)] opacity-40 uppercase">HS</p>
                      )}
                    </div>
                    
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-sm sm:text-base uppercase shrink-0
                      ${isFinalizado ? 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)]' :
                        isEnCurso ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20' :
                        'bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-hover)] text-white shadow-lg'
                      }`}>
                      {app.patient?.charAt(0) || '?'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className={`text-sm sm:text-base font-extrabold truncate ${isFinalizado ? 'text-[var(--text-secondary)] line-through' : 'text-[var(--text-primary)]'}`}>
                          {app.patient}
                        </h4>
                        {getStatusBadge(app)}
                        {app.modalidad === 'virtual' && isWaiting && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] uppercase font-black rounded-md border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping absolute opacity-75"></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 relative"></span>
                            Paciente en Línea
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] flex-wrap">
                        <span className="font-semibold opacity-80">{app.title}</span>
                        {app.type && (
                           <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--bg-main)] border border-[var(--border-color)]/50 text-[var(--text-primary)] text-[9px] font-black rounded-md uppercase">
                              {app.type.toLowerCase().includes('virtual') ? '💻' : app.type.toLowerCase().includes('domicilio') ? '🏠' : '🏥'} {app.type}
                           </span>
                        )}
                        {patientData?.nhc && (
                          <span className="text-[10px] font-black text-[var(--text-secondary)] bg-[var(--bg-main)] px-2 py-0.5 rounded-md border border-[var(--border-color)]/30 font-mono">NHC: {patientData.nhc}</span>
                        )}
                      </div>
                      {patientData?.allergies && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-red-500 animate-pulse">
                          <ShieldAlert size={12} />
                          ALERTA: {patientData.allergies}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  {isDoctorOrAdmin && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 shrink-0 w-full lg:w-auto mt-2 lg:mt-0 pt-3 lg:pt-0 border-t border-[var(--border-color)]/50 lg:border-none">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenPatient(patientData); }}
                        disabled={!patientData}
                        className={`w-full sm:w-auto px-4 py-3 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-black flex items-center justify-center gap-2 transition-all shrink-0
                          ${!patientData
                            ? 'bg-[var(--bg-sidebar)] text-[var(--text-secondary)]/30 border-[var(--border-color)]/20 cursor-not-allowed opacity-50'
                            : (isFinalizado && !app.hasEvolution)
                              ? 'bg-red-500/10 border-2 border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white shadow-md animate-pulse'
                              : 'bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] shadow-sm'
                          }`}
                        title={patientData ? 'Abrir historia clínica completa' : 'Paciente sin registro básico'}
                      >
                        {isFinalizado && !app.hasEvolution ? <AlertCircle size={16} /> : <FileText size={16} />}
                        <span>{isFinalizado && !app.hasEvolution ? 'FALTA EVOLUCIÓN' : 'HISTORIA CLÍNICA'}</span>
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
                              className={`w-full sm:w-auto flex-1 px-5 py-3 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md
                                ${isWaiting && app.modalidad === 'virtual'
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20 scale-[1.02] ring-2 ring-offset-2 ring-emerald-500 ring-offset-[var(--bg-main)]'
                                  : isWaiting 
                                    ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20' 
                                    : 'bg-[var(--text-primary)] text-[var(--bg-main)] hover:opacity-90 shadow-[var(--text-primary)]/10'}
                              `}
                            >
                              {app.modalidad === 'virtual' ? <Video size={16} className={isWaiting ? "animate-pulse" : ""} /> : <HeartPulse size={16} />}
                              <span>{app.modalidad === 'virtual' ? 'INICIAR VIDEOLLAMADA' : 'INICIAR CONSULTA'}</span>
                            </button>
                          ) : (
                            <div className="flex flex-col sm:flex-row gap-2 w-full flex-1">
                              {app.modalidad === 'virtual' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); store.setActiveCallApp(app); }}
                                  className="w-full sm:w-auto flex-1 px-4 py-3 sm:py-2.5 bg-indigo-600 text-white rounded-xl text-[11px] sm:text-xs font-black flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition-all"
                                >
                                  <Video size={16} />
                                  <span>VOLVER AL VIDEO</span>
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOpenPatient(patientData); }}
                                className="w-full sm:w-auto flex-1 px-4 py-3 sm:py-2.5 bg-emerald-600 text-white rounded-xl text-[11px] sm:text-xs font-black flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all"
                              >
                                <FileText size={16} />
                                <span>EVOLUCIÓN</span>
                              </button>
                              <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  handleStatusChange(app.id, APPOINTMENT_STATUS.FINALIZADO); 
                                  if (app.modalidad === 'virtual') socket.emit('call-ended', `appointment-${app.id}`);
                                }}
                                className="w-full sm:w-auto flex-1 px-4 py-3 sm:py-2.5 bg-[var(--accent-primary)] text-white rounded-xl text-[11px] sm:text-xs font-black flex items-center justify-center gap-2 hover:bg-[var(--accent-hover)] shadow-md shadow-[var(--accent-primary)]/20 transition-all"
                              >
                                <UserCheck size={16} />
                                <span>FINALIZAR</span>
                              </button>
                            </div>
                          )}

                          {app.modalidad === 'virtual' && (
                            <button
                              onClick={(e) => handleSetDelay(app, e)}
                              className="w-full sm:w-auto px-4 py-3 sm:py-2.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-2 hover:bg-amber-100 transition-colors shrink-0"
                            >
                              <AlertCircle size={16} /> Avisar Demora
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

      {/* MODAL: Avisar Demora */}
      {delayModalApp && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-quick">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Avisar Demora</h3>
                  <p className="text-xs text-slate-500">{delayModalApp.patient}</p>
                </div>
              </div>
              <button 
                onClick={() => setDelayModalApp(null)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <p className="text-sm font-medium text-slate-600 mb-4 leading-relaxed">
              Ingresá los minutos aproximados de demora. Se le mostrará un aviso al paciente en la sala de espera. (Dejá en blanco para borrar un aviso anterior)
            </p>

            <input id="delayMinutes" name="delayMinutes"
              type="number"
              placeholder="Ej: 15"
              value={delayMinutes}
              onChange={(e) => setDelayMinutes(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl font-bold text-slate-800 transition-all mb-6"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setDelayModalApp(null)}
                className="flex-1 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={submitDelay}
                className="flex-1 py-3 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-lg shadow-amber-500/20 transition-all"
              >
                Enviar Aviso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
