import { useState } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, Users, Wallet,
  Bell, Search, LogOut, Plus, Menu, X,
  UserCog, Stethoscope, BarChart3, Settings, ChevronRight,
  Sun, Moon
} from 'lucide-react';
import { useStore } from '../../stores/useStore';
import NotificationCenter from '../NotificationCenter/NotificationCenter';

/* ─── Navigation config ─────────────────────────────────────── */
const NAV = [
  {
    label: 'Principal',
    items: [
      { path: '/dashboard',     icon: LayoutDashboard, label: 'Panel Principal', roles: ['admin', 'medico', 'recepcion'] },
    ],
  },
  {
    label: 'Clínico',
    items: [
      { path: '/agenda',        icon: CalendarDays,    label: 'Agenda',          roles: ['admin', 'medico', 'recepcion'] },
      { path: '/consultorio',   icon: Stethoscope,     label: 'Consultorio',     roles: ['admin', 'medico'] },
      { path: '/pacientes',     icon: Users,           label: 'Pacientes',       roles: ['admin', 'medico', 'recepcion'] },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { path: '/finanzas',      icon: Wallet,          label: 'Finanzas',        roles: ['admin'] },
      { path: '/personal',      icon: UserCog,         label: 'Personal',        roles: ['admin'] },
      { path: '/reportes',      icon: BarChart3,       label: 'Reportes',        roles: ['admin'] },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { path: '/configuracion', icon: Settings,        label: 'Configuración',   roles: ['admin'] },
    ],
  },
];

/* ─── Role metadata ──────────────────────────────────────────── */
const ROLES = {
  admin:     { label: 'Administrador',     badgeBg: 'rgba(239,68,68,0.18)',   badgeText: '#fca5a5', dotColor: 'bg-rose-500'  },
  medico:    { label: 'Médico',           badgeBg: 'var(--accent-light)',    badgeText: 'var(--accent-primary)', dotColor: 'bg-[var(--accent-primary)]'},
  recepcion: { label: 'Recepción',        badgeBg: 'rgba(16,185,129,0.18)',  badgeText: '#6ee7b7', dotColor: 'bg-emerald-400'},
};

/* ─── Page metadata ──────────────────────────────────────────── */
const PAGE_META = {
  '/dashboard':     { title: 'Panel Principal', subtitle: 'Resumen de actividad del consultorio' },
  '/agenda':        { title: 'Agenda',          subtitle: 'Gestión de turnos y horarios' },
  '/consultorio':   { title: 'Consultorio',     subtitle: 'Atención clínica del día' },
  '/pacientes':     { title: 'Pacientes',        subtitle: 'Directorio e historias clínicas' },
  '/finanzas':      { title: 'Finanzas',         subtitle: 'Caja, ingresos y egresos' },
  '/personal':      { title: 'Personal',         subtitle: 'Staff y gestión de RRHH' },
  '/mi-perfil':      { title: 'Mi Perfil',         subtitle: 'Gestión de tu cuenta y contraseña' },
  '/reportes':      { title: 'Reportes',         subtitle: 'Estadísticas y análisis' },
  '/configuracion': { title: 'Configuración',    subtitle: 'Preferencias del sistema' },
};

export default function DashboardLayout({ onLogout }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { userRole, user, theme, toggleTheme, globalConfig } = useStore();
  const role     = ROLES[userRole] || ROLES.recepcion;
  const meta     = PAGE_META[location.pathname] || { title: 'Panel', subtitle: '' };
  const name     = user?.name || role.label;
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/pacientes?search=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate('/login');
  };

  /* ── Sidebar inner content — renderizado directamente, no como componente anidado ── */
  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="h-[4.5rem] flex items-center px-5 border-b border-slate-200/10 dark:border-white/5 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-hover)] flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
          <span className="text-white font-black text-base leading-none">I</span>
        </div>
        <div className="ml-3 min-w-0">
          <p className="font-black text-[var(--text-primary)] text-[15px] tracking-tight leading-tight truncate">{globalConfig?.businessName || 'Integrar Salud'}</p>
          <p className="text-[10px] text-[var(--text-secondary)] font-semibold tracking-wide">{(globalConfig?.address)?.split(',')[0] || 'Sistema de Gestión'}</p>
        </div>
        <button
          className="lg:hidden ml-auto p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)] rounded-lg transition-colors"
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
      <div className="px-2.5 pb-10 sm:pb-3 shrink-0">
        <Link
          to="/mi-perfil"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-3 transition-all group hover:border-[var(--accent-primary)]"
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-xs shrink-0 ${role.dotColor}`}>
            {initials}
          </div>
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
    { path: '/agenda',    icon: CalendarDays,    label: 'Agenda',    roles: ['admin', 'medico', 'recepcion'] },
    { path: '/consultorio', icon: Stethoscope,   label: 'Clínica',  roles: ['admin', 'medico'] },
    { path: '/pacientes', icon: Users,           label: 'Pacientes', roles: ['admin', 'medico', 'recepcion'] },
    { path: '/finanzas',  icon: Wallet,          label: 'Finanzas',  roles: ['admin'] },
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
    <div className="min-h-screen flex font-sans text-[var(--text-primary)] print:block print:bg-white">

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
        <header className="h-[4.5rem] bg-[var(--bg-card)] border-b border-[var(--border-color)] flex items-center justify-between px-4 sm:px-8 z-30 sticky top-0 print:hidden gap-4">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 text-[var(--text-secondary)] hover:bg-[var(--border-color)] rounded-xl transition-colors"
              onClick={() => setOpen(true)}
            >
              <Menu size={21} />
            </button>
            <div>
              <h1 className="text-[17px] font-black text-[var(--text-primary)] leading-tight">{meta.title}</h1>
              <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">{meta.subtitle}</p>
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
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar paciente..."
                className="pl-9 pr-4 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-sm focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-light)] font-medium text-[var(--text-primary)] w-52 transition-all outline-none"
              />
            </form>

            {/* Notifications */}
            <NotificationCenter />

            {/* CTA */}
            <button
              onClick={() => navigate('/agenda?new=true')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-[13px] font-bold rounded-xl transition-all shadow-lg shadow-sky-500/10"
            >
              <Plus size={15} />
              Nuevo Turno
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-3 sm:p-6 lg:p-8 pb-32 lg:pb-8">
          <div className="max-w-full mx-auto space-y-4 sm:space-y-6 animate-fade-in-quick">
            <Outlet />
          </div>
        </div>

        {!open && <MobileBottomNav />}
      </main>
    </div>
  );
}
