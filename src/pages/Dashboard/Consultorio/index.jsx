import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../../stores/useStore';
import {
  Users, Clock, UserCheck, FileText,
  HeartPulse, ShieldAlert, Search, AlertCircle,
  Stethoscope, CalendarDays, LayoutDashboard,
  CalendarRange
} from 'lucide-react';
import PatientHistoryViewer from '../../../components/PatientHistoryViewer';
import { toLocalDateString } from '../../../utils/helpers';
import { APPOINTMENT_STATUS } from '../../../config/constants';

export default function ConsultorioPage() {
  const store = useStore();
  const appointments = store.appointments;
  const patients     = store.patients;
  const doctors      = store.doctors;
  const userRole     = store.userRole;
  const user         = store.user;

  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('hoy'); // 'hoy', 'sala', 'mensual'

  const [showPatientView, setShowPatientView] = useState(false);
  const [fullPatient, setFullPatient] = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(false);

  const handleOpenPatient = async (patient) => {
    if (!patient?.id) return;
    setLoadingPatient(true);
    try {
      const { patientsService } = await import('../../../services/patients');
      const full = await patientsService.getById(patient.id);
      setFullPatient(full || patient);
      setShowPatientView(true);
    } catch {
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

  const handleStatusChange = (appId, newStatus) => {
    store.updateAppointmentStatus(appId, newStatus);
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
        onBack={() => { setShowPatientView(false); setSelectedPatientId(null); setFullPatient(null); }}
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
          <input
            type="text"
            placeholder="Buscar por paciente o motivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl text-sm font-medium text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-light)] transition-all outline-none shadow-sm placeholder:text-[var(--text-secondary)]/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 p-1.5 bg-[var(--bg-card)] border border-[var(--border-color)]/50 rounded-2xl w-full sm:w-fit shadow-sm">
        <button
          onClick={() => setActiveTab('hoy')}
          className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === 'hoy' ? 'bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/20 translate-y-[-1px]' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-light)]'}`}
        >
          <Clock size={16} /> Hoy
        </button>
        <button
          onClick={() => setActiveTab('sala')}
          className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === 'sala' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 translate-y-[-1px]' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-light)]'}`}
        >
          <Users size={16} /> En Sala
          {waitingRoomAppointments.length > 0 && <span className="ml-1 w-5 h-5 flex items-center justify-center bg-white/20 rounded-full text-[10px]">{waitingRoomAppointments.length}</span>}
        </button>
        <button
          onClick={() => setActiveTab('mensual')}
          className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === 'mensual' ? 'bg-[var(--text-primary)] text-[var(--bg-main)] shadow-lg shadow-[var(--text-primary)]/10 translate-y-[-1px]' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-light)]'}`}
        >
          <CalendarRange size={16} /> mensual
        </button>
      </div>

      {activeTab === 'hoy' && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total Hoy', value: stats.total, icon: CalendarDays, color: 'text-[var(--accent-primary)]', bg: 'bg-[var(--accent-light)]' },
            { label: 'En Consulta', value: stats.enCurso, icon: HeartPulse, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'En Espera', value: stats.enEspera, icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Finalizados', value: stats.finalizados, icon: UserCheck, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Pendientes', value: stats.pendientes, icon: Clock, color: 'text-[var(--text-secondary)]', bg: 'bg-[var(--bg-sidebar)]' },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="card-premium rounded-2xl p-4 border border-[var(--glass-border)] flex items-center gap-3">
                <div className={`${stat.bg} p-2.5 rounded-xl shrink-0`}>
                  <Icon size={18} className={stat.color} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-xl font-black text-[var(--text-primary)]">{stat.value}</p>
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
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-all duration-200 group
                    ${isFinalizado ? 'opacity-40 grayscale-[0.5]' : 'hover:bg-[var(--accent-light)]'}
                    ${isEnCurso ? 'bg-emerald-500/5 border-l-4 border-l-emerald-500' : ''}
                  `}
                >
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-center w-16">
                      <p className={`text-lg font-black ${isEnCurso ? 'text-emerald-500' : 'text-[var(--text-primary)]'}`}>
                        {app.time}
                      </p>
                      {activeTab === 'mensual' && (
                        <p className="text-[10px] font-bold text-[var(--accent-primary)] uppercase">
                          {new Date(app.date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                        </p>
                      )}
                      {activeTab !== 'mensual' && (
                        <p className="text-[10px] font-bold text-[var(--text-secondary)] opacity-40 uppercase">HS</p>
                      )}
                    </div>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm uppercase shrink-0
                      ${isFinalizado ? 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)]' :
                        isEnCurso ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20' :
                        'bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-hover)] text-white shadow-lg'
                      }`}>
                      {app.patient?.charAt(0) || '?'}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <h4 className={`text-base font-extrabold ${isFinalizado ? 'text-[var(--text-secondary)] line-through' : 'text-[var(--text-primary)]'}`}>
                        {app.patient}
                      </h4>
                      {getStatusBadge(app)}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                      <span className="font-semibold opacity-80">{app.title}</span>
                      {patientData?.nhc && (
                        <span className="text-[10px] font-black text-[var(--text-secondary)] bg-[var(--bg-main)] px-2 py-0.5 rounded-md border border-[var(--border-color)]/30 font-mono">NHC: {patientData.nhc}</span>
                      )}
                    </div>
                    {patientData?.allergies && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs font-bold text-red-500 animate-pulse">
                        <ShieldAlert size={12} />
                        ALERTA: {patientData.allergies}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 mt-2 sm:mt-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenPatient(patientData); }}
                      disabled={!patientData}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all
                        ${patientData
                          ? 'bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] shadow-sm'
                          : 'bg-[var(--bg-sidebar)] text-[var(--text-secondary)]/30 border-[var(--border-color)]/20 cursor-not-allowed opacity-50'
                        }`}
                      title={patientData ? 'Abrir historia clínica completa' : 'Paciente sin registro básico'}
                    >
                      <FileText size={16} />
                      <span className="hidden sm:inline">HISTORIA CLÍNICA</span>
                    </button>

                    {!isFinalizado && app.attendance !== APPOINTMENT_STATUS.AUSENTE && (
                      <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                        {!isEnCurso ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(app.id, APPOINTMENT_STATUS.EN_CURSO); }}
                            className={`flex-1 sm:flex-none px-5 py-3 rounded-xl text-[10px] sm:text-xs font-black flex items-center justify-center gap-2 transition-all shadow-lg
                              ${isWaiting 
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20 scale-[1.02]' 
                                : 'bg-[var(--text-primary)] text-[var(--bg-main)] hover:opacity-90 shadow-[var(--text-primary)]/10'}
                            `}
                          >
                            <HeartPulse size={16} />
                            <span>INICIAR CONSULTA</span>
                          </button>
                        ) : (
                          <div className="flex gap-2 w-full">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenPatient(patientData); }}
                              className="flex-1 sm:flex-none px-4 py-3 bg-emerald-600 text-white rounded-xl text-[10px] sm:text-xs font-black flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all"
                            >
                              <FileText size={16} />
                              <span className="hidden sm:inline">EVOLUCIÓN</span>
                              <span className="sm:hidden">EVOLUCION</span>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(app.id, APPOINTMENT_STATUS.FINALIZADO); }}
                              className="flex-1 sm:flex-none px-4 py-3 bg-[var(--accent-primary)] text-white rounded-xl text-[10px] sm:text-xs font-black flex items-center justify-center gap-2 hover:bg-[var(--accent-hover)] shadow-lg shadow-[var(--accent-primary)]/20 transition-all"
                            >
                              <UserCheck size={16} />
                              <span>FINALIZAR</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
