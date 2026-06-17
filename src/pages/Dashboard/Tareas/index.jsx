import { useState, useMemo } from 'react';
import { useStore } from '../../../stores/useStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sparkles, Wallet, Activity, Users, Clock, MessageCircle, FileEdit,
  CheckCircle2, Gift, Star, AlertTriangle, TrendingUp, UserX,
  HeartPulse, Calendar, Stethoscope, Filter, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function TareasPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentFilter = searchParams.get('filter') || 'todos';
  const [selectedAdminDoctor, setSelectedAdminDoctor] = useState('all');

  const {
    userRole,
    user,
    appointments: storeAppointments = [],
    patients = [],
    doctors = [],
    globalConfig,
    transactions = []
  } = useStore();

  const canSee = {
    cumpleanos: ['admin', 'recepcion', 'medico'].includes(userRole) || !userRole,
    primeras: ['admin', 'recepcion', 'medico'].includes(userRole) || !userRole,
    demoras: ['admin', 'recepcion'].includes(userRole) || !userRole,
    faltadores: ['admin', 'recepcion'].includes(userRole) || !userRole,
    deudas: ['admin', 'administracion', 'recepcion'].includes(userRole) || !userRole,
    evoluciones: ['admin', 'administracion', 'medico'].includes(userRole) || !userRole,
    retencion: ['admin', 'administracion'].includes(userRole),
    salud: ['admin', 'administracion'].includes(userRole),
  };

  const appointments = userRole !== 'medico' && selectedAdminDoctor !== 'all'
    ? storeAppointments.filter(a => Number(a.doctorId) === Number(selectedAdminDoctor))
    : storeAppointments;

  const getAppointmentStatus = (app) => {
    if (app.attendance === 'finalizado') return 'finished';
    if (app.attendance === 'ausente') return 'absent';
    if (app.attendance === 'suspended') return 'suspended';

    if (!app.date || !app.time) return 'upcoming';
    const appDateTime = new Date(`${app.date}T${app.time}`);
    const now = new Date();

    let duration = 30;
    if (app.time_end) {
      const [h, m] = app.time.split(':').map(Number);
      const [eh, em] = app.time_end.split(':').map(Number);
      duration = (eh * 60 + em) - (h * 60 + m);
    }

    const appEndTime = new Date(appDateTime.getTime() + duration * 60000);

    if (now < appDateTime) return 'upcoming';
    if (now >= appDateTime && now <= appEndTime) return 'in_progress';
    return 'finished';
  };

  const todayString = new Date().toISOString().split('T')[0];
  const todaysAppointments = appointments.filter(a => a && a.date === todayString && !a.isBlock);

  const myDoctor = userRole === 'medico' && user?.doctor_id
    ? (doctors.find(d => d && Number(d.id) === Number(user.doctor_id)) || null)
    : (userRole === 'medico' ? doctors.find(d => d && d.name === user?.name) : null);

  const relevantAppointments = userRole === 'medico' && myDoctor
    ? todaysAppointments.filter(a => Number(a.doctorId) === Number(myDoctor.id))
    : todaysAppointments;

  const pendingOrWaitingApps = relevantAppointments.filter(a => ['agendado', 'confirmado', 'en_espera'].includes(a.attendance));

  const birthdays = [];
  const newPatients = [];
  const previousDebts = [];
  const frequentNoShows = [];

  const seenPatientIds = new Set();
  pendingOrWaitingApps.forEach(a => {
    if (seenPatientIds.has(a.patientId || a.patient)) return;
    seenPatientIds.add(a.patientId || a.patient);

    const patientRecord = patients.find(p => p.id === a.patientId || p.name === a.patient);

    if (patientRecord?.birthDate) {
      const today = new Date();
      const [y, m, d] = patientRecord.birthDate.split('-');
      if (parseInt(m) === today.getMonth() + 1 && parseInt(d) === today.getDate()) {
        birthdays.push(a);
      }
    }

    if (patientRecord?.created_at) {
      const diffTime = Math.abs(new Date() - new Date(patientRecord.created_at));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const titleLower = (a.title || '').toLowerCase();
      if (diffDays <= 7 || titleLower.includes('primera') || titleLower.includes('primer')) {
        newPatients.push(a);
      }
    }

    if (userRole !== 'medico') {
      const pastApps = appointments.filter(p =>
        (p.patientId === a.patientId || p.patient === a.patient) &&
        p.id !== a.id &&
        new Date(p.date) < new Date(todayString) &&
        p.attendance === 'finalizado' &&
        p.paymentStatus !== 'pagado' &&
        !p.isBlock
      );
      if (pastApps.length > 0) {
        const totalDebt = pastApps.reduce((acc, app) => acc + (Number(app.price) || 0), 0);
        if (totalDebt > 0) {
          previousDebts.push({ app: a, debt: totalDebt, count: pastApps.length });
        }
      }
    }

    const pastAllApps = appointments.filter(p =>
      (p.patientId === a.patientId || p.patient === a.patient) &&
      p.id !== a.id &&
      new Date(p.date) < new Date(todayString) &&
      !p.isBlock
    );
    if (pastAllApps.length >= 2) {
      const absents = pastAllApps.filter(p => p.attendance === 'ausente' || p.attendance === 'suspended').length;
      if (absents / pastAllApps.length >= 0.3) {
        frequentNoShows.push({ app: a, absences: absents, total: pastAllApps.length });
      }
    }
  });

  const waiting = relevantAppointments.filter(a => a.attendance === 'en_espera');
  const delayedPatients = [];
  waiting.forEach(a => {
    if (!a.time) return;
    const [hours, minutes] = a.time.split(':').map(Number);
    const appDate = new Date();
    appDate.setHours(hours, minutes, 0, 0);
    const diffMinutes = Math.floor((new Date() - appDate) / 60000);
    if (diffMinutes >= 20) {
      delayedPatients.push({ app: a, delay: diffMinutes });
    }
  });

  const missingNotes = appointments.filter(a => {
    if (a.isBlock || a.hasEvolution) return false;
    const isFinished = a.attendance === 'finalizado' || (a.date === todayString && getAppointmentStatus(a) === 'finished');
    if (!isFinished) return false;
    if (userRole === 'medico' && myDoctor) {
      return Number(a.doctorId) === Number(myDoctor.id);
    } else if (userRole === 'admin') {
      return true;
    }
    return false;
  });

  const retentionMonths = globalConfig?.retentionMonths || 6;
  const lostPatients = [];
  if (userRole !== 'medico') {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);

    const patientLatestApp = {};
    const patientHasFutureApp = {};

    appointments.forEach(a => {
      if (a.isBlock) return;
      const patientKey = a.patientId || a.patient;
      const appDate = new Date(a.date);

      if (appDate >= new Date(todayString)) {
        patientHasFutureApp[patientKey] = true;
      } else {
        if (a.attendance === 'finalizado') {
          if (!patientLatestApp[patientKey] || new Date(patientLatestApp[patientKey].date) < appDate) {
            patientLatestApp[patientKey] = a;
          }
        }
      }
    });

    Object.keys(patientLatestApp).forEach(key => {
      if (!patientHasFutureApp[key]) {
        const lastApp = patientLatestApp[key];
        const lastAppDate = new Date(lastApp.date);
        if (lastAppDate < cutoffDate) {
          lostPatients.push({
            app: lastApp,
            monthsPassed: Math.floor((new Date() - lastAppDate) / (1000 * 60 * 60 * 24 * 30.4))
          });
        }
      }
    });
  }

  const financialHealth = [];
  if (canSee.salud) {
    const dToday = new Date();
    const currentMonth = dToday.getMonth();
    const currentYear = dToday.getFullYear();

    const monthlyTransactions = transactions.filter(t => {
      if (!t.date) return false;
      const safeDateStr = typeof t.date === 'string' ? t.date.replace(' ', 'T') : t.date;
      const tDate = new Date(safeDateStr);
      return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
    });

    const income = monthlyTransactions.filter(t => (t.type || '').toLowerCase() === 'ingreso').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const expenses = monthlyTransactions.filter(t => (t.type || '').toLowerCase() === 'egreso').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const profit = income - expenses;
    const margin = income > 0 ? (profit / income) * 100 : 0;

    if (income >= 0 || expenses >= 0) {
      financialHealth.push({ income, expenses, profit, margin });
    }
  }

  const getPhone = (app) => {
    const p = patients.find(pat => pat.id === app.patientId || pat.name === app.patient);
    return p?.phone || app.phone || '';
  };

  const handleWhatsApp = (phone, text) => {
    if (!phone) {
      toast.error('El paciente no tiene número registrado.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const setFilter = (f) => setSearchParams({ filter: f });

  const totalCount =
    (canSee.cumpleanos ? birthdays.length : 0) +
    (canSee.primeras ? newPatients.length : 0) +
    (canSee.demoras ? delayedPatients.length : 0) +
    (canSee.evoluciones ? missingNotes.length : 0) +
    (canSee.deudas ? previousDebts.length : 0) +
    (canSee.faltadores ? frequentNoShows.length : 0) +
    (canSee.retencion ? lostPatients.length : 0) +
    (canSee.salud ? financialHealth.length : 0);

  const tabs = [
    { id: 'todos', label: 'Todos', count: totalCount, icon: Sparkles, color: 'indigo' },
    { id: 'cumpleanos', label: 'Cumpleaños', count: birthdays.length, icon: Gift, color: 'pink', show: canSee.cumpleanos },
    { id: 'primeras', label: 'Primeras Visitas', count: newPatients.length, icon: Star, color: 'purple', show: canSee.primeras },
    { id: 'demoras', label: 'Demoras en Sala', count: delayedPatients.length, icon: Clock, color: 'rose', show: canSee.demoras },
    { id: 'evoluciones', label: 'Evoluciones Faltantes', count: missingNotes.length, icon: FileEdit, color: 'amber', show: canSee.evoluciones },
    { id: 'deudas', label: 'Deudas Previas', count: previousDebts.length, icon: Wallet, color: 'red', show: canSee.deudas },
    { id: 'faltadores', label: 'Faltadores', count: frequentNoShows.length, icon: UserX, color: 'orange', show: canSee.faltadores },
    { id: 'retencion', label: 'Retención (CRM)', count: lostPatients.length, icon: HeartPulse, color: 'indigo', show: canSee.retencion },
    { id: 'salud', label: 'Salud Financiera', count: financialHealth.length, icon: TrendingUp, color: 'emerald', show: canSee.salud },
  ];

  const visibleTabs = tabs.filter(t => !t.show || t.show);

  return (
    <div className="space-y-6 animate-fade-in-quick">
      {/* ═══ HEADER ═══ */}
      <div className="glass-effect p-5 sm:p-6 rounded-3xl shadow-[var(--glass-shadow)] border border-[var(--glass-border)] relative group">
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[var(--accent-primary)]/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50 transition-transform duration-1000 group-hover:scale-110"></div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-hover)] rounded-2xl text-white shadow-lg shadow-[var(--accent-primary)]/20 transform group-hover:rotate-6 transition-transform duration-500">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
                Centro de <span className="text-[var(--accent-primary)]">Tareas</span>
              </h1>
              <p className="text-sm text-[var(--text-secondary)] font-medium opacity-70 mt-0.5">
                Gestiona alertas y notificaciones inteligentes
              </p>
            </div>
          </div>

          {userRole !== 'medico' && (
            <div className="relative group w-full lg:w-64">
              <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-indigo-500 transition-colors" />
              <select
                value={selectedAdminDoctor}
                onChange={(e) => setSelectedAdminDoctor(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm font-bold rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm appearance-none cursor-pointer transition-all"
              >
                <option value="all">Todos los Médicos</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>Dr/a. {d.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ═══ STATS CARDS ═══ */}
      <div className="flex md:grid md:grid-cols-4 gap-3 sm:gap-4 overflow-x-auto md:overflow-visible hide-scrollbar py-2 md:py-0 snap-x snap-mandatory">
        <div className="card-premium rounded-2xl p-4 sm:p-5 border border-[var(--glass-border)] flex items-center gap-3 sm:gap-4 transition-all duration-300 group hover:border-indigo-500/30 hover:shadow-md shrink-0 min-w-[160px] md:min-w-0 snap-start">
          <div className="bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/20 p-2.5 sm:p-3 rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-110">
            <Sparkles size={18} className="text-indigo-500 dark:text-indigo-400 sm:w-5 sm:h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] sm:text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-70 mb-0.5">Total Tareas</p>
            <h4 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">{totalCount}</h4>
          </div>
        </div>

        <div className="card-premium rounded-2xl p-4 sm:p-5 border border-[var(--glass-border)] flex items-center gap-3 sm:gap-4 transition-all duration-300 group hover:border-amber-500/30 hover:shadow-md shrink-0 min-w-[160px] md:min-w-0 snap-start">
          <div className="bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 p-2.5 sm:p-3 rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-110">
            <FileEdit size={18} className="text-amber-500 dark:text-amber-400 sm:w-5 sm:h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] sm:text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-70 mb-0.5">Evoluciones</p>
            <h4 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">{missingNotes.length}</h4>
          </div>
        </div>

        <div className="card-premium rounded-2xl p-4 sm:p-5 border border-[var(--glass-border)] flex items-center gap-3 sm:gap-4 transition-all duration-300 group hover:border-rose-500/30 hover:shadow-md shrink-0 min-w-[160px] md:min-w-0 snap-start">
          <div className="bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/20 p-2.5 sm:p-3 rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-110">
            <Clock size={18} className="text-rose-500 dark:text-rose-400 sm:w-5 sm:h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] sm:text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-70 mb-0.5">Demoras</p>
            <h4 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">{delayedPatients.length}</h4>
          </div>
        </div>

        <div className="card-premium rounded-2xl p-4 sm:p-5 border border-[var(--glass-border)] flex items-center gap-3 sm:gap-4 transition-all duration-300 group hover:border-red-500/30 hover:shadow-md shrink-0 min-w-[160px] md:min-w-0 snap-start">
          <div className="bg-red-500/10 dark:bg-red-500/15 border border-red-500/20 p-2.5 sm:p-3 rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-110">
            <Wallet size={18} className="text-red-500 dark:text-red-400 sm:w-5 sm:h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] sm:text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-70 mb-0.5">Deudas</p>
            <h4 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">{previousDebts.length}</h4>
          </div>
        </div>
      </div>

      {/* ═══ TABS ═══ */}
      <div className="flex items-center gap-1 sm:gap-1.5 p-1.5 bg-[var(--bg-card)] border border-[var(--border-color)]/50 rounded-2xl w-full shadow-sm overflow-x-auto hide-scrollbar">
        {visibleTabs.filter(t => t.id === 'todos' || t.count > 0 || currentFilter === t.id).map(t => {
          const Icon = t.icon;
          const isActive = currentFilter === t.id;

          const colorMap = {
            indigo: 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25',
            pink: 'bg-pink-500 text-white shadow-lg shadow-pink-500/25',
            purple: 'bg-purple-500 text-white shadow-lg shadow-purple-500/25',
            rose: 'bg-rose-500 text-white shadow-lg shadow-rose-500/25',
            amber: 'bg-amber-500 text-white shadow-lg shadow-amber-500/25',
            red: 'bg-red-500 text-white shadow-lg shadow-red-500/25',
            orange: 'bg-orange-500 text-white shadow-lg shadow-orange-500/25',
            emerald: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25',
          };

          return (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap relative
                ${isActive
                  ? colorMap[t.color] + ' translate-y-[-1px]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--accent-light)] hover:text-[var(--text-primary)]'
                }`}
            >
              <Icon size={15} className="hidden sm:block" />
              {t.label}
              {t.count > 0 && (
                <span className={`ml-0.5 min-w-[20px] h-5 flex items-center justify-center px-1 rounded-full text-[10px] font-black
                  ${isActive
                    ? 'bg-white/25 text-white'
                    : `bg-${t.color}-500/10 dark:bg-${t.color}-500/15 text-${t.color}-600 dark:text-${t.color}-400 border border-${t.color}-500/20`
                  }`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══ TASKS GRID ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">

        {/* Cumpleaños */}
        {canSee.cumpleanos && (currentFilter === 'todos' || currentFilter === 'cumpleanos') && birthdays.map((app, i) => (
          <TaskCard
            key={`bday-${i}`}
            icon={Gift}
            title="Cumpleañero"
            patient={app.patient}
            subtitle={`Turno hoy a las ${app.time}hs`}
            color="pink"
            action={{
              label: 'Enviar Felicitación',
              icon: MessageCircle,
              onClick: () => handleWhatsApp(getPhone(app), `¡Hola ${app.patient}! De parte de todo el equipo te deseamos un muy feliz cumpleaños 🎂. Te esperamos hoy a las ${app.time}hs.`)
            }}
          />
        ))}

        {/* Primeras Visitas */}
        {canSee.primeras && (currentFilter === 'todos' || currentFilter === 'primeras') && newPatients.map((app, i) => (
          <TaskCard
            key={`newp-${i}`}
            icon={Star}
            title="Primera Visita"
            patient={app.patient}
            subtitle={`Turno hoy a las ${app.time}hs`}
            color="purple"
            action={{
              label: 'Enviar Bienvenida',
              icon: MessageCircle,
              onClick: () => handleWhatsApp(getPhone(app), `¡Hola ${app.patient}! Te escribimos para darte la bienvenida a nuestra clínica médica. Te esperamos hoy a las ${app.time}hs para tu primera consulta.`)
            }}
          />
        ))}

        {/* Demoras en Sala */}
        {canSee.demoras && (currentFilter === 'todos' || currentFilter === 'demoras') && delayedPatients.map(({ app, delay }, i) => (
          <TaskCard
            key={`delay-${i}`}
            icon={Clock}
            title="Demora en Sala"
            patient={app.patient}
            subtitle={`Aguarda hace ${delay} minutos (Turno ${app.time})`}
            color="rose"
            action={{
              label: 'Ver en Agenda',
              icon: Calendar,
              onClick: () => navigate(`/dashboard/agenda`)
            }}
          />
        ))}

        {/* Evoluciones Faltantes */}
        {canSee.evoluciones && (currentFilter === 'todos' || currentFilter === 'evoluciones') && (userRole === 'medico' ? (
          missingNotes.map((app, i) => (
            <TaskCard
              key={`evo-${i}`}
              icon={FileEdit}
              title="Historia Clínica Faltante"
              patient={app.patient}
              subtitle={`Turno finalizado el ${app.date} a las ${app.time}hs`}
              color="amber"
              action={{
                label: 'Redactar Evolución',
                icon: FileEdit,
                onClick: () => navigate(`/dashboard/consultorio?patientId=${app.patientId || ''}&patientName=${encodeURIComponent(app.patient)}&action=add_evolution&date=${app.date}T${app.time || '12:00'}`)
              }}
            />
          ))
        ) : (
          Object.values(
            missingNotes.reduce((acc, app) => {
              if (!acc[app.doctorId]) acc[app.doctorId] = { doctorId: app.doctorId, count: 0 };
              acc[app.doctorId].count++;
              return acc;
            }, {})
          ).map((group, i) => {
            const doc = doctors.find(d => Number(d.id) === Number(group.doctorId));
            return (
              <TaskCard
                key={`evo-group-${i}`}
                icon={FileEdit}
                title="Historias Clínicas Faltantes"
                patient={`Dr/a. ${doc?.name || 'Desconocido'}`}
                subtitle={`Debe ${group.count} evolución(es) médica(s)`}
                color="amber"
                action={{
                  label: 'Enviar Recordatorio',
                  icon: MessageCircle,
                  onClick: () => {
                    if (doc?.phone) {
                      handleWhatsApp(doc.phone, `¡Hola Dr/a. ${doc.name}! Te recordamos que tienes ${group.count} evolución(es) médica(s) pendiente(s) por completar en el sistema. Por favor ingresa para regularizarlas.`);
                    } else {
                      toast.error('El médico no tiene teléfono configurado');
                    }
                  }
                }}
              />
            );
          })
        ))}

        {/* Deudas Previas */}
        {canSee.deudas && (currentFilter === 'todos' || currentFilter === 'deudas') && previousDebts.map(({ app, debt, count }, i) => (
          <TaskCard
            key={`debt-${i}`}
            icon={Wallet}
            title="Deuda Pendiente"
            patient={app.patient}
            subtitle={`Deuda de $${debt.toLocaleString()} por ${count} turno(s) pasado(s)`}
            color="red"
            action={{
              label: 'Ver en Finanzas',
              icon: Wallet,
              onClick: () => navigate(`/dashboard/finanzas`)
            }}
          />
        ))}

        {/* Faltadores */}
        {canSee.faltadores && (currentFilter === 'todos' || currentFilter === 'faltadores') && frequentNoShows.map(({ app, absences, total }, i) => (
          <TaskCard
            key={`noshow-${i}`}
            icon={UserX}
            title="Faltador Frecuente"
            patient={app.patient}
            subtitle={`Faltó a ${absences} de sus ${total} turnos anteriores. Tiene turno hoy a las ${app.time}hs`}
            color="orange"
            action={{
              label: 'Re-confirmar por WP',
              icon: MessageCircle,
              onClick: () => handleWhatsApp(getPhone(app), `¡Hola ${app.patient}! Te escribimos de la clínica para re-confirmar tu asistencia al turno de hoy a las ${app.time}hs.`)
            }}
          />
        ))}

        {/* Retención (CRM) */}
        {canSee.retencion && (currentFilter === 'todos' || currentFilter === 'retencion') && lostPatients.map(({ app, monthsPassed }, i) => (
          <TaskCard
            key={`lost-${i}`}
            icon={HeartPulse}
            title="Paciente Perdido"
            patient={app.patient}
            subtitle={`Inactivo hace ${monthsPassed} meses. Última visita: ${app.date}`}
            color="indigo"
            action={{
              label: 'Mensaje de Recuperación',
              icon: MessageCircle,
              onClick: () => handleWhatsApp(getPhone(app), `¡Hola ${app.patient}! Notamos que pasó un tiempo desde tu última visita a la clínica. Te escribimos para recordarte la importancia de realizarte un chequeo médico regular. ¿Te gustaría agendar un turno?`)
            }}
          />
        ))}

        {/* Salud Financiera */}
        {canSee.salud && (currentFilter === 'todos' || currentFilter === 'salud') && financialHealth.map(({ income, expenses, profit, margin }, i) => (
          <TaskCard
            key={`health-${i}`}
            icon={TrendingUp}
            title="Rentabilidad del Negocio"
            patient={`Margen: ${margin.toFixed(1)}%`}
            subtitle={`Ingresos: $${income.toLocaleString()} | Egresos: $${expenses.toLocaleString()}`}
            color="emerald"
            action={{
              label: 'Ver Reporte Completo',
              icon: TrendingUp,
              onClick: () => navigate(`/dashboard/reportes`)
            }}
          />
        ))}

        {/* Empty State */}
        {totalCount === 0 && currentFilter === 'todos' && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mb-6">
              <CheckCircle2 size={48} className="text-emerald-500 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-black text-[var(--text-primary)] mb-2">¡Todo al día!</h2>
            <p className="text-sm text-[var(--text-secondary)] opacity-70 max-w-md">No hay tareas pendientes ni alertas para hoy en el Asistente Clínico.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══ TASK CARD COMPONENT ═══
function TaskCard({ icon: Icon, title, patient, subtitle, color, action }) {
  const colorMap = {
    pink: {
      bg: 'bg-pink-500/10 dark:bg-pink-500/15',
      border: 'border-pink-500/20',
      text: 'text-pink-500 dark:text-pink-400',
      hover: 'hover:border-pink-500/40',
      button: 'bg-pink-500/10 dark:bg-pink-500/15 text-pink-600 dark:text-pink-400 hover:bg-pink-500/20 border-pink-500/20'
    },
    purple: {
      bg: 'bg-purple-500/10 dark:bg-purple-500/15',
      border: 'border-purple-500/20',
      text: 'text-purple-500 dark:text-purple-400',
      hover: 'hover:border-purple-500/40',
      button: 'bg-purple-500/10 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 border-purple-500/20'
    },
    rose: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/15',
      border: 'border-rose-500/20',
      text: 'text-rose-500 dark:text-rose-400',
      hover: 'hover:border-rose-500/40',
      button: 'bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border-rose-500/20'
    },
    amber: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/15',
      border: 'border-amber-500/20',
      text: 'text-amber-500 dark:text-amber-400',
      hover: 'hover:border-amber-500/40',
      button: 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/20'
    },
    red: {
      bg: 'bg-red-500/10 dark:bg-red-500/15',
      border: 'border-red-500/20',
      text: 'text-red-500 dark:text-red-400',
      hover: 'hover:border-red-500/40',
      button: 'bg-red-500/10 dark:bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/20 border-red-500/20'
    },
    orange: {
      bg: 'bg-orange-500/10 dark:bg-orange-500/15',
      border: 'border-orange-500/20',
      text: 'text-orange-500 dark:text-orange-400',
      hover: 'hover:border-orange-500/40',
      button: 'bg-orange-500/10 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 border-orange-500/20'
    },
    indigo: {
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
      border: 'border-indigo-500/20',
      text: 'text-indigo-500 dark:text-indigo-400',
      hover: 'hover:border-indigo-500/40',
      button: 'bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 border-indigo-500/20'
    },
    emerald: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      border: 'border-emerald-500/20',
      text: 'text-emerald-500 dark:text-emerald-400',
      hover: 'hover:border-emerald-500/40',
      button: 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20'
    }
  };

  const colors = colorMap[color] || colorMap.indigo;

  return (
    <div className={`card-premium p-5 sm:p-6 border border-[var(--glass-border)] ${colors.hover} transition-all duration-300 group hover:shadow-md relative overflow-hidden`}>
      {/* Decorative gradient */}
      <div className={`absolute top-0 right-0 w-32 h-32 ${colors.bg} rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2 pointer-events-none transition-opacity group-hover:opacity-50`}></div>

      {/* Header */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 ${colors.bg} ${colors.border} border rounded-xl ${colors.text} transition-transform duration-300 group-hover:scale-110`}>
            <Icon size={18} />
          </div>
          <h3 className={`font-black text-sm ${colors.text} uppercase tracking-wide`}>{title}</h3>
        </div>
        <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-30 group-hover:opacity-60 group-hover:translate-x-1 transition-all" />
      </div>

      {/* Content */}
      <div className="relative z-10 mb-4">
        <p className="text-base sm:text-lg font-black text-[var(--text-primary)] mb-1 truncate">{patient}</p>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] opacity-70 line-clamp-2">{subtitle}</p>
      </div>

      {/* Action Button */}
      {action && (
        <button
          onClick={action.onClick}
          className={`w-full py-3 ${colors.button} border rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] relative z-10`}
        >
          <action.icon size={16} />
          {action.label}
        </button>
      )}
    </div>
  );
}
