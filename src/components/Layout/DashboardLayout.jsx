import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { motion, useDragControls } from 'framer-motion';
import {
  LayoutDashboard, CalendarDays, Users, Wallet,
  Bell, Search, LogOut, Plus, Menu, X,
  UserCog, Stethoscope, BarChart3, Settings, ChevronRight,
  Sun, Moon, Pill, Video, Maximize, Minimize, Shield, Star, AlertCircle, Sparkles
} from 'lucide-react';
import { useStore } from '../../stores/useStore';
import { toast } from 'react-hot-toast';
import NotificationCenter from '../NotificationCenter/NotificationCenter';
import DailyMeeting from '../DailyMeeting';
import { APPOINTMENT_STATUS } from '../../config/constants';
import { playNotificationSound } from '../../utils/sounds';
import { socket } from '../../services/socket';

/* ─── Navigation config ─────────────────────────────────────── */
const NAV = [
  {
    label: 'Principal',
    items: [
      { path: '/dashboard',           icon: LayoutDashboard, label: 'Panel Principal', roles: ['admin', 'medico', 'recepcion'] },
      { path: '/dashboard/tareas',    icon: Sparkles,        label: 'Centro de Tareas', roles: ['admin', 'medico', 'recepcion'] },
    ],
  },
  {
    label: 'Clínico',
    items: [
      { path: '/dashboard/agenda',      icon: CalendarDays,    label: 'Agenda',          roles: ['admin', 'medico', 'recepcion'] },
      { path: '/dashboard/consultorio', icon: Stethoscope,     label: 'Consultorio',     roles: ['admin', 'medico'] },
      { path: '/dashboard/pacientes',   icon: Users,           label: 'Pacientes',       roles: ['admin', 'medico', 'recepcion'] },
      { path: '/dashboard/medicamentos', icon: Pill,            label: 'Medicamentos',    roles: ['admin', 'medico'] },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { path: '/dashboard/finanzas',    icon: Wallet,          label: 'Finanzas',        roles: ['admin', 'administracion'] },
      { path: '/dashboard/personal',    icon: UserCog,         label: 'Personal',        roles: ['admin'] },
      { path: '/dashboard/reportes',    icon: BarChart3,       label: 'Reportes',        roles: ['admin', 'administracion'] },
      { path: '/dashboard/reseñas',    icon: Star,            label: 'Reseñas',         roles: ['admin', 'medico'] },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { path: '/dashboard/configuracion', icon: Settings,      label: 'Configuración',   roles: ['admin'] },
      { path: '/dashboard/logs',          icon: Shield,        label: 'Seguridad / Logs', roles: ['admin'] },
    ],
  },
];

/* ─── Role metadata ──────────────────────────────────────────── */
const ROLES = {
  admin:          { label: 'Administrador',     badgeBg: 'rgba(239,68,68,0.18)',   badgeText: '#fca5a5', dotColor: 'bg-rose-500'  },
  medico:         { label: 'Médico',           badgeBg: 'var(--accent-light)',    badgeText: 'var(--accent-primary)', dotColor: 'bg-[var(--accent-primary)]'},
  recepcion:  { label: 'Recepcionista',     badgeBg: 'rgba(16,185,129,0.18)',  badgeText: '#6ee7b7', dotColor: 'bg-emerald-400'},
  administracion: { label: 'Administración',    badgeBg: 'rgba(245,158,11,0.18)',  badgeText: '#fcd34d', dotColor: 'bg-amber-400'},
};

/* ─── Page metadata ──────────────────────────────────────────── */
const PAGE_META = {
  '/dashboard':               { title: 'Panel Principal', subtitle: 'Resumen de actividad del consultorio' },
  '/dashboard/agenda':        { title: 'Agenda',          subtitle: 'Gestión de turnos y horarios' },
  '/dashboard/consultorio':   { title: 'Consultorio',     subtitle: 'Atención clínica del día' },
  '/dashboard/pacientes':     { title: 'Pacientes',        subtitle: 'Directorio e historias clínicas' },
  '/dashboard/finanzas':      { title: 'Finanzas',         subtitle: 'Caja, ingresos y egresos' },
  '/dashboard/personal':      { title: 'Personal',         subtitle: 'Staff y gestión de RRHH' },
  '/dashboard/perfil':        { title: 'Mi Perfil',         subtitle: 'Gestión de tu cuenta y contraseña' },
  '/dashboard/reportes':      { title: 'Reportes',         subtitle: 'Estadísticas y análisis' },
  '/dashboard/medicamentos':  { title: 'Medicamentos',     subtitle: 'Catálogo y seguimiento de fármacos' },
  '/dashboard/configuracion': { title: 'Configuración',    subtitle: 'Preferencias del sistema' },
  '/dashboard/logs':          { title: 'Auditoría',        subtitle: 'Registro de seguridad' },
};

export default function DashboardLayout({ onLogout }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isJitsiCollapsed, setIsJitsiCollapsed] = useState(false);
  const dragControls = useDragControls();

  const { 
    userRole, user, theme, toggleTheme, globalConfig, fetchAppointments,
    activeCallApp, setActiveCallApp, isJitsiMaximized, setIsJitsiMaximized,
    updateAppointmentStatus, updateAppointmentVideoStatus,
    appointments, appointmentsLoading
  } = useStore();
  const role     = ROLES[userRole] || ROLES.recepcion;
  const meta     = PAGE_META[location.pathname] || { title: 'Panel', subtitle: '' };
  const name     = user?.name || role.label;
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const hasNotifiedEvolutionsRef = useRef(false);

  useEffect(() => {
    if (appointmentsLoading || !appointments || appointments.length === 0) return;
    
    if (!hasNotifiedEvolutionsRef.current) {
      // Local date string format YYYY-MM-DD
      const dt = new Date();
      dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
      const todayStr = dt.toISOString().split('T')[0];
      
      const missingEvolutions = appointments.filter(a => 
        a.attendance === APPOINTMENT_STATUS.FINALIZADO && 
        !a.hasEvolution && 
        user?.doctor_id && 
        a.doctorId === user.doctor_id
      );
      
      if (missingEvolutions.length > 0) {
        import('../../utils/sounds').then(({ playErrorSound }) => playErrorSound());
        toast.custom((t) => (
          <div className={`${t.visible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 max-w-sm w-full bg-[var(--bg-card)] shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-[var(--border-color)] overflow-hidden backdrop-blur-xl border border-[var(--glass-border)]`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <AlertCircle className="h-10 w-10 text-rose-500 p-2 bg-rose-500/10 rounded-xl" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-wider mb-1">Evoluciones Pendientes</p>
                  <p className="text-sm text-[var(--text-primary)] font-bold">
                    Tienes {missingEvolutions.length} evolución(es) médica(s) pendiente(s) por completar.
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
        ), { id: 'evoluciones-pendientes-toast', duration: 8000, position: 'top-right' });
      }
      hasNotifiedEvolutionsRef.current = true;
    }
  }, [appointments, appointmentsLoading]);

  // Reference for previous waiting apps to detect new arrivals globally


  // WebSockets: Conectar a la sala de doctores para notificaciones instantáneas
  useEffect(() => {
    if (!['admin', 'medico', 'recepcion'].includes(userRole)) return;

    // Polling general para sincronizar estado de turnos (modificados por recepcionistas, abandonos, etc)
    const interval = setInterval(() => {
      fetchAppointments(null, true);
    }, 15000);

    // Desactivado temporalmente para no generar errores 404 en consola si no está el server Node
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    if (token) {
      socket.auth = { token };
    }
    
    const handleConnect = () => {
      socket.emit('join-room', 'doctors');
    };
    
    socket.on('connect', handleConnect);
    
    if (socket.connected) {
      handleConnect();
    } else {
      socket.connect();
    }

    const handlePatientEntered = () => {
      // Disparar refetch inmediato cuando un paciente entra a la sala de espera virtual
      fetchAppointments(null, true);
    };

    const handleLowRatingAlert = (data) => {
      // Filtrar: Los médicos NO deben recibir esta alerta, solo admin y recepcion.
      if (userRole === 'medico') return;

      // Mostrar alerta inmediata de mala reseña a los admins/recepcion
      import('react-hot-toast').then(({ default: toast }) => {
        toast(`Atención requerida: El paciente ${data.patient_name} ha registrado una calificación de ${data.rating} estrellas tras su consulta con el Dr/a. ${data.doctor_name}. Se recomienda revisión en el panel.`, {
          duration: 10000,
          icon: '🔔',
          style: {
            borderRadius: '10px',
            background: '#fff3cd',
            color: '#856404',
            border: '2px solid #f43f5e',
            fontWeight: 'bold',
          }
        });
      });
      playNotificationSound();
    };

    socket.on('patient-entered', handlePatientEntered);
    socket.on('low-rating-alert', handleLowRatingAlert);

    return () => {
      clearInterval(interval);
      socket.off('connect', handleConnect);
      socket.off('patient-entered', handlePatientEntered);
      socket.off('low-rating-alert', handleLowRatingAlert);
      socket.emit('leave-room', 'doctors');
      socket.disconnect();
    };
  }, [userRole, fetchAppointments]);



  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/dashboard/pacientes?search=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate('/login');
  };

  const handleJitsiClose = useCallback(async () => {
    if (!activeCallApp) return;
    const appId = activeCallApp.id;
    
    // Emitir inmediatamente para que el paciente sea expulsado al instante
    socket.emit('call-ended', `appointment-${appId}`);
    
    setActiveCallApp(null);
    setIsJitsiMaximized(false);
    
    try {
      await updateAppointmentStatus(appId, APPOINTMENT_STATUS.FINALIZADO);
      await updateAppointmentVideoStatus(appId, 'finalizada');
    } catch (err) {
      console.error('Error al actualizar estado del turno al cerrar videollamada:', err);
    }
  }, [activeCallApp, setActiveCallApp, setIsJitsiMaximized, updateAppointmentStatus, updateAppointmentVideoStatus]);

  const handleJitsiJoined = useCallback(async () => {
    if (!activeCallApp) return;
    if (activeCallApp.status !== 'en_curso' && activeCallApp.status !== APPOINTMENT_STATUS.EN_CURSO) {
      await updateAppointmentStatus(activeCallApp.id, APPOINTMENT_STATUS.EN_CURSO);
      await updateAppointmentVideoStatus(activeCallApp.id, 'activa');
    }
    // Ya no emitimos automáticamente, ahora el médico debe tocar el botón "Llamar"
  }, [activeCallApp, updateAppointmentStatus, updateAppointmentVideoStatus]);

  /* ── Sidebar inner content — renderizado directamente, no como componente anidado ── */
  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="h-[4.5rem] flex items-center px-5 border-b border-slate-200/10 dark:border-white/5 shrink-0">
        {globalConfig?.logoUrl ? (
          <img src={globalConfig.logoUrl} alt="Logo" className="w-9 h-9 rounded-xl object-contain bg-white shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-hover)] flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
            <span className="text-white font-black text-base leading-none">{(globalConfig?.businessName || 'I')[0].toUpperCase()}</span>
          </div>
        )}
        <div className="ml-3 min-w-0">
          <p className="font-black text-[var(--text-primary)] text-[15px] tracking-tight leading-tight truncate">{globalConfig?.businessName || 'Integrar Salud'}</p>
          <p className="text-[10px] text-[var(--text-secondary)] font-semibold tracking-wide">{(globalConfig?.address)?.split(',')[0] || 'Sistema de Gestión'}</p>
        </div>
        <button
          className="lg:hidden ml-auto p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)] rounded-lg transition-colors"
          onClick={() => setOpen(false)}
        >
          <X size={17} />
        </button>
      </div>

      {/* Nav — Solo esta sección tendrá scroll si es necesario */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5 custom-scrollbar">
        {NAV.map((section, si) => {
          const visible = section.items.filter(item => item.roles.includes(userRole));
          if (!visible.length) return null;

          return (
            <div key={si} className={si > 0 ? 'mt-4' : ''}>
              {/* Section label */}
              <div className="flex items-center gap-2 px-3 mb-1">
                <span className="text-[9.5px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-[0.12em]">
                  {section.label}
                </span>
                <div className="flex-1 h-px bg-[var(--border-color)]/20" />
              </div>

              {/* Items */}
              {visible.map(item => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={`
                      relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-semibold
                      transition-all duration-150 group select-none
                      ${isActive
                        ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--accent-light)] hover:text-[var(--text-primary)]'}
                    `}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[var(--accent-primary)] rounded-full" />
                    )}
                    <Icon
                      size={17}
                      className={isActive
                        ? 'text-[var(--accent-primary)] shrink-0'
                        : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors shrink-0'}
                    />
                    <span className={isActive ? 'text-[var(--text-primary)]' : ''}>{item.label}</span>
                    {isActive && (
                      <ChevronRight size={13} className="ml-auto opacity-30" />
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User card — links to /mi-perfil */}
      <div className="px-2.5 shrink-0 mb-[80px] lg:mb-0" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <Link
          to="/dashboard/perfil"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-3 transition-all group hover:border-[var(--accent-primary)]"
        >
          {user?.profile_picture ? (
            <img 
              src={user.profile_picture} 
              alt="Perfil" 
              className="w-9 h-9 rounded-xl object-cover shrink-0 border border-[var(--border-color)]"
            />
          ) : (
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-xs shrink-0 ${role.dotColor}`}>
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[var(--text-primary)] truncate leading-tight transition-colors">{name}</p>
            <span
              className="inline-block text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded mt-0.5"
              style={{ background: role.badgeBg, color: role.badgeText }}
            >
              {role.label}
            </span>
          </div>
          <button
            onClick={(e) => { e.preventDefault(); handleLogout(); }}
            className="p-1.5 text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all shrink-0"
            title="Cerrar sesión"
          >
            <LogOut size={15} />
          </button>
        </Link>
      </div>
    </>
  );

  // Items de la barra inferior (móvil) — filtramos por rol
  const MOBILE_NAV_PATHS = [
    { path: '/dashboard',           icon: LayoutDashboard, label: 'Inicio',    roles: ['admin', 'medico', 'recepcion'] },
    { path: '/dashboard/agenda',      icon: CalendarDays,    label: 'Agenda',    roles: ['admin', 'medico', 'recepcion'] },
    { path: '/dashboard/consultorio', icon: Stethoscope,     label: 'Clínica',   roles: ['admin', 'medico'] },
    { path: '/dashboard/pacientes',   icon: Users,           label: 'Pacientes', roles: ['admin', 'medico', 'recepcion'] },
  ];

  const visibleMobileItems = MOBILE_NAV_PATHS.filter(item => item.roles.includes(userRole));

  const MobileBottomNav = () => (
    <div className="mobile-bottom-nav flex lg:hidden items-center justify-around w-full">
      {visibleMobileItems.map(item => (
        <Link
          key={item.path}
          to={item.path}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 ${
            location.pathname === item.path
              ? 'text-[var(--accent-primary)]'
              : 'text-[var(--text-secondary)] opacity-60'
          }`}
        >
          <item.icon size={20} />
          <span className="text-[10px] font-bold">{item.label}</span>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="h-[100dvh] w-full overflow-hidden flex font-sans text-[var(--text-primary)] print:block print:bg-white print:h-auto print:overflow-visible">

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-950/70 z-40 backdrop-blur-sm print:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[230px] h-screen glass-effect flex flex-col
        border-r border-[var(--border-color)]
        transform transition-transform duration-300 ease-in-out print:hidden
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:sticky lg:top-0 lg:flex-shrink-0
      `}>
        {sidebarContent}
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden print:block print:overflow-visible">

        {/* Header */}
        <header className="h-16 lg:h-[4.5rem] bg-[var(--bg-card)] border-b border-[var(--border-color)] flex items-center justify-between px-4 sm:px-8 z-50 sticky top-0 print:hidden gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--border-color)] rounded-xl transition-colors"
              onClick={() => setOpen(true)}
            >
              <Menu size={21} />
            </button>
            <div>
              <h1 className="text-[17px] font-black text-[var(--text-primary)] leading-tight">{meta.title}</h1>
              <p className="hidden sm:block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">{meta.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 bg-[var(--bg-main)] text-[var(--text-secondary)] rounded-xl hover:bg-[var(--accent-light)] hover:text-[var(--accent-primary)] transition-all border border-[var(--border-color)] shadow-sm"
              title={theme === 'light' ? 'Activar Modo Oscuro' : 'Activar Modo Claro'}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* Search */}
            <form onSubmit={handleSearch} className="hidden md:flex relative group">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--accent-primary)] transition-colors"
              />
              <input id="search" name="search"
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar paciente..."
                className="pl-9 pr-4 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-sm focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-light)] font-medium text-[var(--text-primary)] w-52 transition-all outline-none"
              />
            </form>

            {/* Notifications */}
            <NotificationCenter />

            {/* CTA removido */}
          </div>
        </header>

        {/* Page content: pb extra en mobile para que el bottom nav no tape el contenido */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 lg:p-8 lg:pb-8 custom-scrollbar"
          style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="max-w-full mx-auto space-y-4 sm:space-y-6 animate-fade-in-quick">
            <Outlet />
          </div>
        </div>

        <MobileBottomNav />
      </main>

      {/* GLOBAL JITSI COMPONENT */}
      {activeCallApp && (
        <>
          <style>{`
            .jitsi-maximized {
              transform: none !important;
            }
          `}</style>
          <motion.div 
            key={`jitsi-window-${activeCallApp.id}`}
            id="jitsi-motion-container"
            drag={!isJitsiMaximized}
            dragConstraints={{ top: -800, left: -1500, right: 0, bottom: 0 }}
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={
              isJitsiMaximized 
                ? { opacity: 1, scale: 1, x: 0, y: 0 } 
                : isJitsiCollapsed
                  ? { opacity: 1, scale: 1, x: 0, y: 0 }
                  : { opacity: 1, scale: 1 }
            }
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={`fixed flex flex-col bg-slate-900 shadow-2xl overflow-hidden border border-slate-700 z-[99999] ${
              isJitsiMaximized 
                ? 'rounded-3xl' 
                : `bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-32px)] sm:w-[420px] ${isJitsiCollapsed ? 'h-[44px] min-h-[44px]' : 'h-[500px] sm:h-[550px]'} rounded-2xl top-auto left-auto`
            }`}
            style={isJitsiMaximized ? {
              position: 'fixed',
              top: '16px',
              left: '16px',
              right: '16px',
              bottom: '16px',
              width: 'auto',
              height: 'auto',
              transform: 'none'
            } : undefined}
          >
            {/* Header de la videollamada estilo macOS */}
            <div 
              className="grid grid-cols-3 items-center px-4 py-2 bg-gradient-to-b from-[#3a3a3a] to-[#2a2a2a] border-b border-black/50 shrink-0 cursor-move min-h-[44px] relative z-50 shadow-sm"
              onPointerDown={(e) => dragControls.start(e)}
              style={{ touchAction: 'none' }}
            >
              {/* Controles Mac OS (Izquierda) */}
              <div className="flex items-center gap-2 relative z-10">
                <button
                  onClick={() => setActiveCallApp(null)}
                  className="w-3.5 h-3.5 rounded-full bg-[#ff5f56] hover:bg-[#ff5f56]/80 flex items-center justify-center border border-black/20 shadow-sm group"
                  title="Cerrar ventana"
                >
                  <X size={8} className="opacity-0 group-hover:opacity-100 text-black/60 stroke-[3]" />
                </button>
                <button
                  onClick={() => {
                    if (isJitsiMaximized) {
                      setIsJitsiMaximized(false);
                      setIsJitsiCollapsed(false);
                    } else {
                      setIsJitsiCollapsed(!isJitsiCollapsed);
                    }
                  }}
                  className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e] hover:bg-[#ffbd2e]/80 flex items-center justify-center border border-black/20 shadow-sm group"
                  title="Minimizar / Colapsar"
                >
                  <Minimize size={8} className="opacity-0 group-hover:opacity-100 text-black/60 stroke-[3]" />
                </button>
                <button
                  onClick={() => {
                    setIsJitsiMaximized(!isJitsiMaximized);
                    setIsJitsiCollapsed(false);
                  }}
                  className="w-3.5 h-3.5 rounded-full bg-[#27c93f] hover:bg-[#27c93f]/80 flex items-center justify-center border border-black/20 shadow-sm group"
                  title={isJitsiMaximized ? "Restaurar" : "Maximizar"}
                >
                  <Maximize size={8} className="opacity-0 group-hover:opacity-100 text-black/60 stroke-[3]" />
                </button>
              </div>

              {/* Título perfectamente centrado */}
              <div className="flex items-center justify-center pointer-events-none z-0">
                <h3 className="text-[#e0e0e0] font-semibold text-xs tracking-wide flex items-center gap-1.5 drop-shadow-md whitespace-nowrap">
                  <Video size={12} className="text-[#27c93f] animate-pulse" />
                  Videollamada
                </h3>
              </div>

              {/* Botón de Llamar (Derecha) */}
              <div className="flex justify-end relative z-10">
                <button
                  onClick={() => {
                    socket.emit('call-started', `appointment-${activeCallApp.id}`);
                    toast.success('Llamando al paciente...', {
                      id: 'calling-patient',
                      icon: '🔊',
                      style: {
                        background: '#1e293b',
                        color: '#fff',
                        borderRadius: '1rem',
                      }
                    });
                  }}
                  className="px-3 py-1.5 bg-[#007aff] hover:bg-[#005bb5] text-white text-[11px] font-bold rounded-md transition-colors flex items-center gap-1.5 border border-[#007aff]/50 shadow-[0_2px_8px_rgba(0,122,255,0.4)] whitespace-nowrap"
                  title="Avisar al paciente que ya puede entrar"
                >
                  <Bell size={12} /> Llamar
                </button>
              </div>
            </div>

            {/* Jitsi Meeting */}
            <div className="flex-1 min-h-0 relative bg-black overflow-hidden">
              {/* Este overlay transparente captura los eventos del mouse mientras se arrastra, evitando que el iframe de Jitsi se los trague y el movimiento se corte */}
              {isDragging && <div className="absolute inset-0 z-10 cursor-move" />}
              <DailyMeeting
                appointmentId={activeCallApp.id}
                codigo={activeCallApp.codigoAcceso}
                isModerator={true}
                displayName={user?.name || "Médico"}
                onReadyToClose={handleJitsiClose}
                onJoined={handleJitsiJoined}
              />
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
