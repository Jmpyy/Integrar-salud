import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, Clock, DollarSign, CalendarDays,
  ChevronRight, X, CheckCheck, AlertTriangle,
} from 'lucide-react';
import { useStore } from '../../stores/useStore';
import { APPOINTMENT_STATUS } from '../../config/constants';

/* ── helpers ── */
const toLocalDateStr = (d = new Date()) => {
  const dt = new Date(d);
  dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
  return dt.toISOString().split('T')[0];
};

const TYPE = {
  warning: {
    bg: 'bg-amber-500/10', border: 'border-l-amber-500',
    icon: 'text-amber-500', iconBg: 'bg-amber-500/20 border-amber-500/10',
  },
  danger: {
    bg: 'bg-rose-500/10', border: 'border-l-rose-500',
    icon: 'text-rose-500', iconBg: 'bg-rose-500/20 border-rose-500/10',
  },
  info: {
    bg: 'bg-[var(--accent-light)]', border: 'border-l-[var(--accent-primary)]',
    icon: 'text-[var(--accent-primary)]', iconBg: 'bg-[var(--accent-primary)]/20 border-[var(--accent-primary)]/10',
  },
  success: {
    bg: 'bg-emerald-500/10', border: 'border-l-emerald-500',
    icon: 'text-emerald-500', iconBg: 'bg-emerald-500/20 border-emerald-500/10',
  },
};

const DOT = {
  warning: 'bg-amber-500',
  danger:  'bg-rose-500',
  info:    'bg-[var(--accent-primary)]',
  success: 'bg-emerald-500',
};

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { appointments } = useStore();

  const todayStr = toLocalDateStr();
  const now      = new Date();

  /* ── Compute notifications ── */
  const notifications = useMemo(() => {
    const todayApps = (appointments || []).filter(
      a => a && a.id && a.date === todayStr && !a.isBlock
    );
    const items = [];

    /* 1. Patients currently waiting → urgent */
    const waiting = todayApps.filter(a => a.attendance === APPOINTMENT_STATUS.EN_ESPERA);
    waiting.forEach(a => {
      items.push({
        id:       `wait-${a.id}`,
        type:     'danger',
        category: 'Sala de Espera',
        Icon:     Clock,
        title:    `${a.patient} está esperando`,
        detail:   `${a.time} hs — ${a.title}`,
        to:       '/consultorio',
        cta:      'Ir a Consultorio',
      });
    });

    /* 2. Appointments starting in the next 30 min */
    const upcoming = todayApps.filter(a => {
      if ([APPOINTMENT_STATUS.FINALIZADO, APPOINTMENT_STATUS.AUSENTE,
           APPOINTMENT_STATUS.EN_CURSO, APPOINTMENT_STATUS.EN_ESPERA].includes(a.attendance)) return false;
      const [h, m] = (a.time || '').split(':').map(Number);
      if (isNaN(h)) return false;
      const appt = new Date(now);
      appt.setHours(h, m, 0, 0);
      const diff = (appt - now) / 60000;
      return diff > 0 && diff <= 30;
    });

    upcoming.forEach(a => {
      const [h, m] = (a.time || '').split(':').map(Number);
      const appt = new Date(now);
      appt.setHours(h, m, 0, 0);
      const diff = Math.round((appt - now) / 60000);
      items.push({
        id:       `soon-${a.id}`,
        type:     'warning',
        category: 'Próximo Turno',
        Icon:     CalendarDays,
        title:    `${a.patient} en ${diff} min`,
        detail:   `${a.time} hs — ${a.title}`,
        to:       '/agenda',
        cta:      'Ver Agenda',
      });
    });

    /* 3. Finalized appointments with pending payment */
    const unpaid = todayApps.filter(
      a => a.attendance === APPOINTMENT_STATUS.FINALIZADO
        && (a.paymentStatus === 'pendiente' || !a.paymentStatus)
    );
    if (unpaid.length > 0) {
      items.push({
        id:       'unpaid',
        type:     'danger',
        category: 'Cobros Pendientes',
        Icon:     DollarSign,
        title:    `${unpaid.length} turno${unpaid.length > 1 ? 's' : ''} sin cobrar`,
        detail:   unpaid.slice(0, 3).map(a => a.patient).join(', ')
                    + (unpaid.length > 3 ? ` y ${unpaid.length - 3} más` : ''),
        to:       '/consultorio',
        cta:      'Ir a Consultorio',
      });
    }

    /* 4. If no active alert but appointments exist — general summary */
    if (items.length === 0 && todayApps.length > 0) {
      const done = todayApps.filter(a => a.attendance === APPOINTMENT_STATUS.FINALIZADO).length;
      items.push({
        id:       'summary',
        type:     'success',
        category: 'Resumen del Día',
        Icon:     CheckCheck,
        title:    `${done} / ${todayApps.length} turnos finalizados`,
        detail:   'Todo al día — sin alertas pendientes.',
        to:       '/consultorio',
        cta:      'Ver Consultorio',
      });
    }

    return items;
  }, [appointments, todayStr, now]);

  const urgentCount = notifications.filter(n => n.type === 'danger' || n.type === 'warning').length;

  return (
    <div className="relative">

      {/* ── Bell button ── */}
      <button
        id="notif-bell-btn"
        onClick={() => setIsOpen(p => !p)}
        className={`relative p-2.5 transition-all rounded-xl border ${
          isOpen
            ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/20'
            : 'text-[var(--text-secondary)] hover:text-[var(--accent-primary)] bg-[var(--bg-main)] hover:bg-[var(--accent-light)] border-[var(--border-color)] hover:border-[var(--accent-primary)]/20 shadow-sm'
        }`}
        title="Centro de notificaciones"
      >
        <Bell size={18} />
        {urgentCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 border-2 border-[var(--bg-card)] shadow-lg animate-bounce-subtle">
            {urgentCount > 9 ? '9+' : urgentCount}
          </span>
        )}
        {urgentCount === 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[var(--bg-card)] shadow-sm" />
        )}
      </button>

      {/* ── Notification panel ── */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Panel */}
          <div className="absolute right-0 top-[calc(100%+12px)] w-[360px] bg-[var(--bg-card)] rounded-3xl shadow-2xl border border-[var(--glass-border)] z-50 overflow-hidden animate-fade-in-up">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]/30 bg-[var(--bg-sidebar)]/50 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <Bell size={16} className="text-[var(--accent-primary)]" />
                <span className="text-[15px] font-black text-[var(--text-primary)]">Notificaciones</span>
                {urgentCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full leading-tight">
                    {urgentCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] opacity-50 uppercase tracking-widest">
                  {new Date().toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-light)] rounded-xl transition-all"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Notifications list */}
            <div className="max-h-[420px] overflow-y-auto divide-y divide-[var(--border-color)]/20 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/10">
                    <CheckCheck size={28} className="text-emerald-500" />
                  </div>
                  <p className="text-base font-black text-[var(--text-primary)]">Todo en orden</p>
                  <p className="text-sm text-[var(--text-secondary)] font-medium mt-1 opacity-60">
                    No hay alertas pendientes para hoy.
                  </p>
                </div>
              ) : (
                notifications.map(notif => {
                  const t = TYPE[notif.type];
                  const Icon = notif.Icon;
                  return (
                    <div key={notif.id} className={`${t.bg} border-l-4 ${t.border} px-5 py-4 transition-colors hover:bg-[var(--accent-light)]/20 group`}>
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${t.iconBg} shadow-sm`}>
                          <Icon size={18} className={t.icon} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-50 mb-1">
                            {notif.category}
                          </p>
                          <p className="text-sm font-black text-[var(--text-primary)] leading-snug group-hover:text-[var(--accent-primary)] transition-colors">{notif.title}</p>
                          <p className="text-xs text-[var(--text-secondary)] font-medium mt-1 leading-tight opacity-70 truncate">
                            {notif.detail}
                          </p>
                          {notif.to && (
                            <Link
                              to={notif.to}
                              onClick={() => setIsOpen(false)}
                              className={`inline-flex items-center gap-1.5 text-[11px] font-black mt-2.5 ${t.icon} hover:underline decoration-2 underline-offset-2`}
                            >
                              {notif.cta} <ChevronRight size={12} />
                            </Link>
                          )}
                        </div>
                        {/* Dot indicator */}
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 shadow-sm ${DOT[notif.type]}`} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-[var(--border-color)]/30 bg-[var(--bg-sidebar)]/50 backdrop-blur-md">
              <Link
                to="/consultorio"
                onClick={() => setIsOpen(false)}
                className="text-xs font-black text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition-all flex items-center justify-center gap-1.5 group"
              >
                <AlertTriangle size={12} className="group-hover:animate-pulse" />
                Ver sala de espera completa
                <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
