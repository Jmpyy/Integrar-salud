import { useState, useEffect, useCallback } from 'react';
import { Star, CheckCircle, XCircle, Globe, Eye, EyeOff, Loader2, MessageSquare } from 'lucide-react';
import { useStore } from '../../../stores/useStore';
import toast from 'react-hot-toast';
import api from '../../../services/api';

const RATING_LABELS = { 1: 'Muy mala', 2: 'Regular', 3: 'Aceptable', 4: 'Buena', 5: '¡Excelente!' };
const RATING_COLORS = { 1: 'text-rose-500', 2: 'text-orange-400', 3: 'text-amber-400', 4: 'text-lime-500', 5: 'text-emerald-500' };

const StarDisplay = ({ rating }) => {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          size={14}
          className={star <= rating ? RATING_COLORS[rating] : 'text-slate-200 dark:text-slate-800'}
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
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [updating, setUpdating] = useState(null); // id del que está actualizando

  const API = import.meta.env.VITE_API_BASE_URL || 'https://control.integrarsalud.me/api-integrar/api';

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/reviews?all=1');
      let list = data.data || [];

      // Los médicos solo ven sus propias reseñas APROBADAS, con el nombre del paciente anonimizado
      if (userRole === 'medico') {
        list = list
          .filter(r => r.approved === 1)
          .map(r => ({
            ...r,
            // Mostrar solo la inicial del apellido para proteger la identidad
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (filter === 'pending')  return r.approved === 0;
    if (filter === 'approved') return r.approved === 1;
    if (filter === 'rejected') return r.approved === -1;
    return true;
  });

  // Estadísticas
  const total    = reviews.length;
  const approved = reviews.filter(r => r.approved === 1).length;
  const pending  = reviews.filter(r => r.approved === 0).length;
  const avgRating = total > 0 ? (reviews.reduce((a, r) => a + Number(r.rating), 0) / total).toFixed(1) : '—';

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Reseñas de Pacientes</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {userRole === 'admin'
            ? 'Administrá las opiniones enviadas tras cada consulta virtual. Las aprobadas pueden mostrarse en la landing page.'
            : 'Estas son las opiniones aprobadas de tus pacientes (nombre parcialmente anonimizado).'}
        </p>
      </div>

      {/* Stats */}
      <div className={`grid grid-cols-2 ${userRole === 'admin' ? 'sm:grid-cols-4' : 'max-w-md mx-auto'} gap-4`}>
        {[
          { label: 'Total',      value: total,    color: 'text-[var(--text-primary)]' },
          userRole === 'admin' ? { label: 'Pendientes', value: pending,  color: 'text-amber-500' } : null,
          userRole === 'admin' ? { label: 'Aprobadas',  value: approved, color: 'text-emerald-500' } : null,
          { label: 'Promedio',   value: avgRating === '—' ? '—' : `⭐ ${avgRating}`, color: 'text-amber-400' },
        ].filter(Boolean).map(stat => (
          <div key={stat.label} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 text-center">
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-[var(--text-secondary)] font-medium mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros — Solo admin */}
      {userRole === 'admin' && (
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all',      label: 'Todas' },
          { key: 'pending',  label: `Pendientes (${pending})` },
          { key: 'approved', label: 'Aprobadas' },
          { key: 'rejected', label: 'Rechazadas' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
              filter === f.key
                ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-md'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--accent-primary)]/40'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--accent-primary)]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-12 text-center">
          <MessageSquare size={40} className="mx-auto text-[var(--text-secondary)] mb-3 opacity-40" />
          <p className="text-[var(--text-secondary)] font-medium">No hay reseñas en esta categoría</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(review => (
            <div
              key={review.id}
              className={`bg-[var(--bg-card)] border rounded-2xl p-5 transition-all ${
                review.approved === 0 ? 'border-amber-400/40 bg-amber-500/5' :
                review.approved === 1 ? 'border-emerald-400/30' :
                'border-[var(--border-color)] opacity-60'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <StarDisplay rating={Number(review.rating)} />
                    <span className={`text-sm font-bold ${RATING_COLORS[review.rating]}`}>
                      {RATING_LABELS[review.rating]}
                    </span>
                    {review.approved === 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">Pendiente</span>
                    )}
                    {review.approved === 1 && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1">
                        <CheckCircle size={10} /> Aprobada
                      </span>
                    )}
                    {review.show_on_landing == 1 && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1">
                        <Globe size={10} /> En landing
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] mb-1">
                    <span className="font-semibold text-[var(--text-primary)]">{review.patient_name}</span>
                    {' · '}
                    Dr/a. {review.doctor_name}
                    {' · '}
                    {new Date(review.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>

                  {review.comment ? (
                    <p className="text-sm text-[var(--text-primary)] mt-2 leading-relaxed bg-[var(--bg-main)] rounded-xl p-3 border border-[var(--border-color)] italic">
                      "{review.comment}"
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--text-secondary)] mt-1 italic">Sin comentario escrito</p>
                  )}
                </div>

                {/* Acciones — solo admin */}
                {userRole === 'admin' && (
                <div className="flex sm:flex-col gap-2 shrink-0">
                  {review.approved !== 1 && (
                    <button
                      onClick={() => updateReview(review.id, 1, 0)}
                      disabled={updating === review.id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                    >
                      {updating === review.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                      Aprobar
                    </button>
                  )}
                  {review.approved === 1 && (
                    <button
                      onClick={() => updateReview(review.id, 1, review.show_on_landing == 1 ? 0 : 1)}
                      disabled={updating === review.id}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-colors disabled:opacity-50 ${
                        review.show_on_landing == 1
                          ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                          : 'bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-indigo-400'
                      }`}
                    >
                      {review.show_on_landing == 1 ? <><EyeOff size={12} /> Quitar de landing</> : <><Globe size={12} /> Poner en landing</>}
                    </button>
                  )}
                  {review.approved !== -1 && (
                    <button
                      onClick={() => updateReview(review.id, -1, 0)}
                      disabled={updating === review.id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 text-xs font-bold rounded-xl transition-colors border border-rose-500/20 disabled:opacity-50"
                    >
                      <XCircle size={12} /> Rechazar
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
