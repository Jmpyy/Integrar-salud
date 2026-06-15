import { useState, useMemo } from 'react';
import { useStore } from '../../../stores/useStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Sparkles, Wallet, Activity, Users, Clock, MessageCircle, FileEdit, CheckCircle2 
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

  // Filtrar globalmente si el admin eligió un médico
  const appointments = userRole !== 'medico' && selectedAdminDoctor !== 'all'
    ? storeAppointments.filter(a => Number(a.doctorId) === Number(selectedAdminDoctor))
    : storeAppointments;

  // Helper function to get appointment status
  const getAppointmentStatus = (app) => {
    if (app.attendance === 'finalizado') return 'finished';
    if (app.attendance === 'ausente') return 'absent';
    if (app.attendance === 'suspended') return 'suspended';
    
    if (!app.date || !app.time) return 'upcoming';
    const appDateTime = new Date(`${app.date}T${app.time}`);
    const now = new Date();
    
    let duration = 30; // default
    if (app.time_end) {
       const [h, m] = app.time.split(':').map(Number);
       const [eh, em] = app.time_end.split(':').map(Number);
       duration = (eh * 60 + em) - (h * 60 + m);
    }
    
    const appEndTime = new Date(appDateTime.getTime() + duration * 60000);
    
    if (now < appDateTime) return 'upcoming';
    if (now >= appDateTime && now <= appEndTime) return 'in_progress';
    return 'finished'; // past time but not marked finalized? we treat as finished for UI
  };

  // --- Calculations (similar to Dashboard) ---
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
    
    // Cumpleaños
    if (patientRecord?.birthDate) {
      const today = new Date();
      const [y, m, d] = patientRecord.birthDate.split('-');
      if (parseInt(m) === today.getMonth() + 1 && parseInt(d) === today.getDate()) {
        birthdays.push(a);
      }
    }

    // Primera Visita
    if (patientRecord?.created_at) {
      const diffTime = Math.abs(new Date() - new Date(patientRecord.created_at));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const titleLower = (a.title || '').toLowerCase();
      if (diffDays <= 7 || titleLower.includes('primera') || titleLower.includes('primer')) {
        newPatients.push(a);
      }
    }

    // Deuda Previa
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

    // Faltador Frecuente
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

  // Módulo de Retención CRM
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

  // Salud Financiera (Admin/Administracion)
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

  // UI Tabs Definition
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
    { id: 'todos', label: 'Todos', count: totalCount, show: true },
    { id: 'cumpleanos', label: 'Cumpleaños', count: birthdays.length, color: 'text-pink-500', bg: 'bg-pink-500/10', show: canSee.cumpleanos },
    { id: 'primeras', label: 'Primeras Visitas', count: newPatients.length, color: 'text-purple-500', bg: 'bg-purple-500/10', show: canSee.primeras },
    { id: 'demoras', label: 'Demoras en Sala', count: delayedPatients.length, color: 'text-rose-500', bg: 'bg-rose-500/10', show: canSee.demoras },
    { id: 'evoluciones', label: 'Evoluciones Faltantes', count: missingNotes.length, color: 'text-amber-500', bg: 'bg-amber-500/10', show: canSee.evoluciones },
    { id: 'deudas', label: 'Deudas Previas', count: previousDebts.length, color: 'text-red-500', bg: 'bg-red-500/10', show: canSee.deudas },
    { id: 'faltadores', label: 'Faltadores', count: frequentNoShows.length, color: 'text-orange-500', bg: 'bg-orange-500/10', show: canSee.faltadores },
    { id: 'retencion', label: 'Retención (CRM)', count: lostPatients.length, color: 'text-indigo-500', bg: 'bg-indigo-500/10', show: canSee.retencion },
    { id: 'salud', label: 'Salud Financiera', count: financialHealth.length, color: 'text-emerald-500', bg: 'bg-emerald-500/10', show: canSee.salud },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-3">
            <div className="p-2 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-xl">
              <Sparkles size={24} />
            </div>
            Centro de Tareas
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Gestiona todas las alertas y notificaciones inteligentes de tu consultorio.
          </p>
        </div>

        {userRole !== 'medico' && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-bold text-[var(--text-secondary)]">Médico:</label>
            <select
              value={selectedAdminDoctor}
              onChange={(e) => setSelectedAdminDoctor(e.target.value)}
              className="bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm font-bold rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] shadow-sm appearance-none cursor-pointer"
            >
              <option value="all">Todos los Médicos</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>Dr/a. {d.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.filter(t => t.show && (t.id === 'todos' || t.count > 0 || currentFilter === t.id)).map(t => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 whitespace-nowrap transition-colors ${
              currentFilter === t.id 
                ? 'bg-[var(--accent-primary)] text-white shadow-md' 
                : 'bg-[var(--bg-main)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                currentFilter === t.id ? 'bg-white/20 text-white' : `${t.bg} ${t.color}`
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        
        {/* Cumpleaños */}
        {canSee.cumpleanos && (currentFilter === 'todos' || currentFilter === 'cumpleanos') && birthdays.map((app, i) => (
          <div key={`bday-${i}`} className="bg-[var(--bg-main)] border border-[var(--glass-border)] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">🎂</div>
            <h3 className="font-bold text-pink-500 mb-1 flex items-center gap-2">
              <span className="p-1 bg-pink-500/20 rounded-md">🎂</span> Cumpleañero
            </h3>
            <p className="text-[var(--text-primary)] font-bold text-lg mb-1">{app.patient}</p>
            <p className="text-[var(--text-secondary)] text-sm mb-4">Turno hoy a las {app.time}hs</p>
            <button 
              onClick={() => handleWhatsApp(getPhone(app), `¡Hola ${app.patient}! De parte de todo el equipo te deseamos un muy feliz cumpleaños 🎂. Te esperamos hoy a las ${app.time}hs.`)}
              className="w-full py-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle size={16} /> Enviar Felicitación
            </button>
          </div>
        ))}

        {/* Primeras Visitas */}
        {canSee.primeras && (currentFilter === 'todos' || currentFilter === 'primeras') && newPatients.map((app, i) => (
          <div key={`newp-${i}`} className="bg-[var(--bg-main)] border border-[var(--glass-border)] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">🌟</div>
            <h3 className="font-bold text-purple-500 mb-1 flex items-center gap-2">
              <span className="p-1 bg-purple-500/20 rounded-md">🌟</span> Primera Visita
            </h3>
            <p className="text-[var(--text-primary)] font-bold text-lg mb-1">{app.patient}</p>
            <p className="text-[var(--text-secondary)] text-sm mb-4">Turno hoy a las {app.time}hs</p>
            <button 
               onClick={() => handleWhatsApp(getPhone(app), `¡Hola ${app.patient}! Te escribimos para darte la bienvenida a nuestra clínica médica. Te esperamos hoy a las ${app.time}hs para tu primera consulta.`)}
              className="w-full py-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle size={16} /> Enviar Bienvenida
            </button>
          </div>
        ))}

        {/* Demoras en Sala */}
        {canSee.demoras && (currentFilter === 'todos' || currentFilter === 'demoras') && delayedPatients.map(({app, delay}, i) => (
          <div key={`delay-${i}`} className="bg-[var(--bg-main)] border border-[var(--glass-border)] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Clock size={40} className="text-rose-500"/></div>
            <h3 className="font-bold text-rose-500 mb-1 flex items-center gap-2">
              <span className="p-1 bg-rose-500/20 rounded-md"><Clock size={16} /></span> Demora en Sala
            </h3>
            <p className="text-[var(--text-primary)] font-bold text-lg mb-1">{app.patient}</p>
            <p className="text-[var(--text-secondary)] text-sm mb-4">Aguarda hace {delay} minutos (Turno {app.time})</p>
            <div className="flex gap-2">
              <button 
                onClick={() => navigate(`/dashboard/agenda`)}
                className="flex-1 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                Ver en Agenda
              </button>
            </div>
          </div>
        ))}

        {/* Evoluciones Faltantes */}
        {canSee.evoluciones && (currentFilter === 'todos' || currentFilter === 'evoluciones') && (userRole === 'medico' ? (
          missingNotes.map((app, i) => (
            <div key={`evo-${i}`} className="bg-[var(--bg-main)] border border-[var(--glass-border)] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Activity size={40} className="text-amber-500"/></div>
              <h3 className="font-bold text-amber-500 mb-1 flex items-center gap-2">
                <span className="p-1 bg-amber-500/20 rounded-md"><Activity size={16} /></span> Historia Clínica Faltante
              </h3>
              <p className="text-[var(--text-primary)] font-bold text-lg mb-1">{app.patient}</p>
              <p className="text-[var(--text-secondary)] text-sm mb-4">Turno finalizado el {app.date} a las {app.time}hs</p>
              <button 
                onClick={() => navigate(`/dashboard/consultorio?patientId=${app.patientId || ''}&patientName=${encodeURIComponent(app.patient)}&action=add_evolution&date=${app.date}T${app.time || '12:00'}`)}
                className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <FileEdit size={16} /> Redactar Evolución
              </button>
            </div>
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
              <div key={`evo-group-${i}`} className="bg-[var(--bg-main)] border border-[var(--glass-border)] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Activity size={40} className="text-amber-500"/></div>
                <h3 className="font-bold text-amber-500 mb-1 flex items-center gap-2">
                  <span className="p-1 bg-amber-500/20 rounded-md"><Activity size={16} /></span> Historias Clínicas Faltantes
                </h3>
                <p className="text-[var(--text-primary)] font-bold text-lg mb-1">Dr/a. {doc?.name || 'Desconocido'}</p>
                <p className="text-[var(--text-secondary)] text-sm mb-4">Debe {group.count} evolución(es) médica(s).</p>
                <button 
                  onClick={() => {
                    if (doc?.phone) {
                      handleWhatsApp(doc.phone, `¡Hola Dr/a. ${doc.name}! Te recordamos que tienes ${group.count} evolución(es) médica(s) pendiente(s) por completar en el sistema. Por favor ingresa para regularizarlas.`);
                    } else {
                      import('react-hot-toast').then(({ default: toast }) => toast.error('El médico no tiene teléfono configurado'));
                    }
                  }}
                  className="w-full py-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageCircle size={16} /> Enviar Recordatorio
                </button>
              </div>
            );
          })
        ))}

        {/* Deudas Previas */}
        {canSee.deudas && (currentFilter === 'todos' || currentFilter === 'deudas') && previousDebts.map(({app, debt, count}, i) => (
          <div key={`debt-${i}`} className="bg-[var(--bg-main)] border border-[var(--glass-border)] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Wallet size={40} className="text-red-500"/></div>
            <h3 className="font-bold text-red-500 mb-1 flex items-center gap-2">
              <span className="p-1 bg-red-500/20 rounded-md"><Wallet size={16} /></span> Deuda Pendiente
            </h3>
            <p className="text-[var(--text-primary)] font-bold text-lg mb-1">{app.patient}</p>
            <p className="text-[var(--text-secondary)] text-sm mb-4">Deuda de ${debt.toLocaleString()} por {count} turno(s) pasado(s).</p>
            <button 
               onClick={() => navigate(`/dashboard/finanzas`)}
              className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              Ver en Finanzas
            </button>
          </div>
        ))}

        {/* Faltadores */}
        {canSee.faltadores && (currentFilter === 'todos' || currentFilter === 'faltadores') && frequentNoShows.map(({app, absences, total}, i) => (
          <div key={`noshow-${i}`} className="bg-[var(--bg-main)] border border-[var(--glass-border)] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Users size={40} className="text-orange-500"/></div>
            <h3 className="font-bold text-orange-500 mb-1 flex items-center gap-2">
              <span className="p-1 bg-orange-500/20 rounded-md"><Users size={16} /></span> Faltador Frecuente
            </h3>
            <p className="text-[var(--text-primary)] font-bold text-lg mb-1">{app.patient}</p>
            <p className="text-[var(--text-secondary)] text-sm mb-4">Faltó a {absences} de sus {total} turnos anteriores. Tiene turno hoy a las {app.time}hs.</p>
            <button 
               onClick={() => handleWhatsApp(getPhone(app), `¡Hola ${app.patient}! Te escribimos de la clínica para re-confirmar tu asistencia al turno de hoy a las ${app.time}hs.`)}
              className="w-full py-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle size={16} /> Re-confirmar por WP
            </button>
          </div>
        ))}

        {/* Retención (CRM) */}
        {canSee.retencion && (currentFilter === 'todos' || currentFilter === 'retencion') && lostPatients.map(({app, monthsPassed}, i) => (
          <div key={`lost-${i}`} className="bg-[var(--bg-main)] border border-[var(--glass-border)] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Users size={40} className="text-indigo-500"/></div>
            <h3 className="font-bold text-indigo-500 mb-1 flex items-center gap-2">
              <span className="p-1 bg-indigo-500/20 rounded-md"><Users size={16} /></span> Paciente Perdido
            </h3>
            <p className="text-[var(--text-primary)] font-bold text-lg mb-1">{app.patient}</p>
            <p className="text-[var(--text-secondary)] text-sm mb-4">Inactivo hace {monthsPassed} meses. Última visita: {app.date}</p>
            <button 
               onClick={() => handleWhatsApp(getPhone(app), `¡Hola ${app.patient}! Notamos que pasó un tiempo desde tu última visita a la clínica. Te escribimos para recordarte la importancia de realizarte un chequeo médico regular. ¿Te gustaría agendar un turno?`)}
              className="w-full py-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle size={16} /> Mensaje de Recuperación
            </button>
          </div>
        ))}

        {/* Salud Financiera */}
        {canSee.salud && (currentFilter === 'todos' || currentFilter === 'salud') && financialHealth.map(({income, expenses, profit, margin}, i) => (
          <div key={`health-${i}`} className="bg-[var(--bg-main)] border border-[var(--glass-border)] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Wallet size={40} className="text-emerald-500"/></div>
            <h3 className="font-bold text-emerald-500 mb-1 flex items-center gap-2">
              <span className="p-1 bg-emerald-500/20 rounded-md"><Wallet size={16} /></span> Rentabilidad del Negocio
            </h3>
            <p className="text-[var(--text-primary)] font-bold text-lg mb-1">
              Margen: <span className={margin >= 50 ? 'text-emerald-500' : margin >= 20 ? 'text-amber-500' : 'text-rose-500'}>{margin.toFixed(1)}%</span>
            </p>
            <p className="text-[var(--text-secondary)] text-sm mb-4">
              Ingresos del mes: ${income.toLocaleString()}<br/>
              Egresos del mes: ${expenses.toLocaleString()}
            </p>
            <button 
               onClick={() => navigate(`/dashboard/reportes`)}
              className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              Ver Reporte Completo
            </button>
          </div>
        ))}

        {totalCount === 0 && currentFilter === 'todos' && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={40} className="text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">¡Todo al día!</h2>
            <p className="text-[var(--text-secondary)]">No hay tareas pendientes ni alertas para hoy en el Asistente Clínico.</p>
          </div>
        )}
      </div>
    </div>
  );
}
