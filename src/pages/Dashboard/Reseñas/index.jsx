import { useState, useEffect, useCallback } from 'react';
import {
  Star, CheckCircle, XCircle, Globe, Eye, EyeOff, Loader2,
  MessageSquare, Award, TrendingUp, Filter, Sparkles
} from 'lucide-react';
import { useStore } from '../../../stores/useStore';
import toast from 'react-hot-toast';
import api from '../../../services/api';

const RATING_LABELS = { 1: 'Muy mala', 2: 'Regular', 3: 'Aceptable', 4: 'Buena', 5: '¡Excelente!' };
const RATING_COLORS = {
  1: 'text-rose-500 dark:text-rose-400',
  2: 'text-orange-400 dark:text-orange-300',
  3: 'text-amber-400 dark:text-amber-300',
  4: 'text-lime-500 dark:text-lime-400',
  5: 'text-emerald-500 dark:text-emerald-400'
};

const StarDisplay = ({ rating }) => {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          size={14}
          className={`${star <= rating ? RATING_COLORS[rating] : 'text-slate-300 dark:text-slate-700'} transition-colors`}
          fill={star <= rating ? 'currentColor' : 'none'}
        />
      ))}
    </div>
  );
};

export default function ReseñasPage() {
  const { userRole } = useStore();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/reviews?all=1');
      let list = data.data || [];

      if (userRole === 'medico') {
        list = list
          .filter(r => r.approved === 1)
          .map(r => ({
            ...r,
            patient_name: r.patient_name
              ? r.patient_name.split(' ')[0] + ' ' + (r.patient_name.split(' ')[1]?.[0] || '') + '.'
              : 'Paciente',
          }));
      }

      setReviews(list);
    } catch (error) {
      toast.error('No se pudieron cargar las reseñas');
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const updateReview = async (id, approved, showOnLanding) => {
    setUpdating(id);
    try {
      await api.put(`/reviews/${id}`, { approved, show_on_landing: showOnLanding });
      toast.success('Reseña actualizada');
      fetchReviews();
    } catch (err) {
      toast.error(err.message || 'Error al actualizar');
    } finally {
      setUpdating(null);
    }
  };

  const filtered = reviews.filter(r => {
    if (filter === 'pending') return r.approved === 0;
    if (filter === 'approved') return r.approved === 1;
    if (filter === 'rejected') return r.approved === -1;
    return true;
  });

  const total = reviews.length;
  const approved = reviews.filter(r => r.approved === 1).length;
  const pending = reviews.filter(r => r.approved === 0).length;
  const rejected = reviews.filter(r => r.approved === -1).length;
  const avgRating = total > 0 ? (reviews.reduce((a, r) => a + Number(r.rating), 0) / total).toFixed(1) : '—';

  const statsConfig = [
    { label: 'Total Reseñas', value: total, icon: MessageSquare, color: 'indigo', show: true },
    { label: 'Pendientes', value: pending, icon: Loader2, color: 'amber', show: userRole === 'admin' },
    { label: 'Aprobadas', value: approved, icon: CheckCircle, color: 'emerald', show: userRole === 'admin' },
    { label: 'Promedio', value: avgRating === '—' ? '—' : `${avgRating} ⭐`, icon: Award, color: 'amber', show: true },
  ];

  const filtersConfig = [
    { key: 'all', label: 'Todas', icon: Filter, count: total },
    { key: 'pending', label: 'Pendientes', icon: Loader2, count: pending, show: userRole === 'admin' },
    { key: 'approved', label: 'Aprobadas', icon: CheckCircle, count: approved, show: userRole === 'admin' },
    { key: 'rejected', label: 'Rechazadas', icon: XCircle, count: rejected, show: userRole === 'admin' },
  ];

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
              <Star size={24} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
                Reseñas de <span className="text-[var(--accent-primary)]">Pacientes</span>
              </h1>
              <p className="text-sm text-[var(--text-secondary)] font-medium opacity-70 mt-0.5">
                {userRole === 'admin'
                  ? 'Administrá las opiniones enviadas tras cada consulta'
                  : 'Opiniones aprobadas de tus pacientes'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ STATS CARDS ═══ */}
      <div className="flex md:grid md:grid-cols-4 gap-3 sm:gap-4 overflow-x-auto md:overflow-visible hide-scrollbar py-2 md:py-0 snap-x snap-mandatory">
        {statsConfig.filter(s => s.show).map((stat, idx) => {
          const Icon = stat.icon;
          const colorMap = {
            indigo: {
              bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
              border: 'border-indigo-500/20',
              text: 'text-indigo-500 dark:text-indigo-400',
              hover: 'hover:border-indigo-500/30'
            },
            amber: {
              bg: 'bg-amber-500/10 dark:bg-amber-500/15',
              border: 'border-amber-500/20',
              text: 'text-amber-500 dark:text-amber-400',
              hover: 'hover:border-amber-500/30'
            },
            emerald: {
              bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
              border: 'border-emerald-500/20',
              text: 'text-emerald-500 dark:text-emerald-400',
              hover: 'hover:border-emerald-500/30'
            }
          };
          const colors = colorMap[stat.color];

          return (
            <div
              key={idx}
              className={`card-premium rounded-2xl p-4 sm:p-5 border border-[var(--glass-border)] ${colors.hover} flex items-center gap-3 sm:gap-4 transition-all duration-300 group hover:shadow-md shrink-0 min-w-[160px] md:min-w-0 snap-start`}
            >
              <div className={`${colors.bg} border ${colors.border} p-2.5 sm:p-3 rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-110`}>
                <Icon size={18} className={`${colors.text} sm:w-5 sm:h-5`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] sm:text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-70 mb-0.5">
                  {stat.label}
                </p>
                <h4 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
                  {stat.value}
                </h4>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ FILTROS ═══ */}
      {userRole === 'admin' && (
        <div className="flex items-center gap-1 sm:gap-1.5 p-1.5 bg-[var(--bg-card)] border border-[var(--border-color)]/50 rounded-2xl w-full sm:w-fit shadow-sm overflow-x-auto hide-scrollbar">
          {filtersConfig.filter(f => f.show !== false).map(f => {
            const Icon = f.icon;
            const isActive = filter === f.key;

            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap relative
                  ${isActive
                    ? 'bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/25 translate-y-[-1px]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--accent-light)] hover:text-[var(--text-primary)]'
                  }`}
              >
                <Icon size={15} className="hidden sm:block" />
                {f.label}
                {f.count > 0 && (
                  <span className={`ml-0.5 min-w-[20px] h-5 flex items-center justify-center px-1 rounded-full text-[10px] font-black
                    ${isActive
                      ? 'bg-white/25 text-white'
                      : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                    }`}>
                    {f.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ═══ LISTA DE RESEÑAS ═══ */}
      {loading ? (
        <div className="flex items-center justify-center py-20 flex-col gap-4">
          <div className="relative">
            <div className="w-14 h-14 border-4 border-amber-500/20 rounded-full" />
            <div className="w-14 h-14 border-4 border-amber-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
          </div>
          <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest">Cargando reseñas...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-premium rounded-3xl p-16 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)]/40 flex items-center justify-center">
            <MessageSquare size={36} className="text-[var(--text-secondary)] opacity-30" />
          </div>
          <p className="text-lg font-bold text-[var(--text-primary)] opacity-80 mb-2">No hay reseñas en esta categoría</p>
          <p className="text-sm text-[var(--text-secondary)] opacity-60">Las reseñas aparecerán aquí cuando los pacientes las envíen</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((review, idx) => (
            <div
              key={review.id}
              className={`card-premium rounded-3xl p-5 sm:p-6 transition-all duration-300 group hover:shadow-md animate-fade-in-up relative overflow-hidden
                ${review.approved === 0
                  ? 'border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/[0.03]'
                  : review.approved === 1
                    ? 'border-emerald-500/20'
                    : 'border-[var(--border-color)] opacity-70 hover:opacity-100'
                }`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {/* Decorative gradient */}
              {review.approved === 0 && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-start gap-4 relative z-10">
                {/* Avatar del paciente */}
                <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white items-center justify-center font-black text-lg shadow-lg shadow-amber-500/20 shrink-0">
                  {review.patient_name?.charAt(0) || 'P'}
                </div>

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <StarDisplay rating={Number(review.rating)} />
                    <span className={`text-sm font-bold ${RATING_COLORS[review.rating]}`}>
                      {RATING_LABELS[review.rating]}
                    </span>

                    {/* Badges de estado */}
                    {review.approved === 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider border border-amber-500/20">
                        <Loader2 size={10} className="animate-spin" /> Pendiente
                      </span>
                    )}
                    {review.approved === 1 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">
                        <CheckCircle size={10} /> Aprobada
                      </span>
                    )}
                    {review.show_on_landing == 1 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider border border-indigo-500/20">
                        <Globe size={10} /> En landing
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-3">
                    <span className="font-bold text-[var(--text-primary)]">{review.patient_name}</span>
                    <span className="w-1 h-1 rounded-full bg-[var(--border-color)]"></span>
                    <span className="font-medium">Dr/a. {review.doctor_name}</span>
                    <span className="w-1 h-1 rounded-full bg-[var(--border-color)]"></span>
                    <span className="font-medium">
                      {new Date(review.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                  </div>

                  {review.comment ? (
                    <div className="bg-[var(--bg-main)] rounded-2xl p-4 border border-[var(--border-color)]/50 group-hover:border-[var(--accent-primary)]/20 transition-all">
                      <p className="text-sm text-[var(--text-primary)] leading-relaxed italic">
                        "{review.comment}"
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-secondary)] italic opacity-60">Sin comentario escrito</p>
                  )}
                </div>

                {/* Acciones — solo admin */}
                {userRole === 'admin' && (
                  <div className="flex sm:flex-col gap-2 shrink-0">
                    {review.approved !== 1 && (
                      <button
                        onClick={() => updateReview(review.id, 1, 0)}
                        disabled={updating === review.id}
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl transition-all disabled:opacity-50 shadow-md shadow-emerald-500/20 hover:scale-105 active:scale-95"
                      >
                        {updating === review.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                        Aprobar
                      </button>
                    )}
                    {review.approved === 1 && (
                      <button
                        onClick={() => updateReview(review.id, 1, review.show_on_landing == 1 ? 0 : 1)}
                        disabled={updating === review.id}
                        className={`flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-black rounded-xl transition-all disabled:opacity-50 hover:scale-105 active:scale-95
                          ${review.show_on_landing == 1
                            ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                            : 'bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-indigo-400 hover:text-indigo-500'
                          }`}
                      >
                        {updating === review.id ? <Loader2 size={14} className="animate-spin" /> : review.show_on_landing == 1 ? <><EyeOff size={14} /> Quitar</> : <><Globe size={14} /> Landing</>}
                      </button>
                    )}
                    {review.approved !== -1 && (
                      <button
                        onClick={() => updateReview(review.id, -1, 0)}
                        disabled={updating === review.id}
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-500/10 dark:bg-rose-500/15 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-black rounded-xl transition-all border border-rose-500/20 disabled:opacity-50 hover:scale-105 active:scale-95"
                      >
                        {updating === review.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                        Rechazar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
