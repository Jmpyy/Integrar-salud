import { useState, useEffect, useMemo } from 'react';
import {
  X, Save,
  Pill, Search, Plus, Trash2, Pencil,
  Loader2, Users, Activity, Package
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { medicationsService } from '../../../services/medications';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';

export default function MedicamentosPage() {
  const [meds, setMeds] = useState([]);
  const [activePrescriptions, setActivePrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('vademecum');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    doses: '',
    description: ''
  });
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadMeds();
  }, []);

  const loadMeds = async () => {
    setLoading(true);
    try {
      const [data, prescriptions] = await Promise.all([
        medicationsService.getAll(),
        medicationsService.getActivePrescriptions()
      ]);
      setMeds(data || []);
      setActivePrescriptions(prescriptions || []);
    } catch (err) {
      toast.error('Error al cargar el vademécum o prescripciones');
    } finally {
      setLoading(false);
    }
  };

  const filteredMeds = useMemo(() => {
    return meds.filter(m =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.active_ingredient && m.active_ingredient.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [meds, searchTerm]);

  const filteredPrescriptions = useMemo(() => {
    if (!searchTerm) return activePrescriptions;
    const term = searchTerm.toLowerCase();
    return activePrescriptions.filter(p =>
      p.patientName?.toLowerCase().includes(term) ||
      p.drug?.toLowerCase().includes(term)
    );
  }, [activePrescriptions, searchTerm]);

  const stats = useMemo(() => {
    return {
      totalMeds: meds.length,
      activePrescriptions: activePrescriptions.length,
      uniquePatients: new Set(activePrescriptions.map(p => p.patientId)).size,
      topDrug: activePrescriptions.length > 0
        ? Object.entries(
          activePrescriptions.reduce((acc, p) => {
            acc[p.drug] = (acc[p.drug] || 0) + 1;
            return acc;
          }, {})
        ).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
        : 'N/A'
    };
  }, [meds, activePrescriptions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingMed) {
        await medicationsService.update(editingMed.id, formData);
        toast.success('Medicamento actualizado');
      } else {
        await medicationsService.create(formData);
        toast.success('Medicamento añadido al inventario');
      }
      setIsModalOpen(false);
      setEditingMed(null);
      setFormData({ name: '', doses: '', description: '' });
      loadMeds();
    } catch (err) {
      toast.error('Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await medicationsService.remove(deleteConfirm.id);
      toast.success('Eliminado correctamente');
      setDeleteConfirm({ isOpen: false, id: null });
      loadMeds();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const statsConfig = [
    {
      label: 'Total Fármacos',
      value: stats.totalMeds,
      icon: Package,
      colorClass: 'text-indigo-500 dark:text-indigo-400',
      bgClass: 'bg-indigo-500/10 dark:bg-indigo-500/15',
      borderClass: 'border-indigo-500/20'
    },
    {
      label: 'Prescripciones Activas',
      value: stats.activePrescriptions,
      icon: Activity,
      colorClass: 'text-emerald-500 dark:text-emerald-400',
      bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      borderClass: 'border-emerald-500/20'
    },
    {
      label: 'Pacientes en Tratamiento',
      value: stats.uniquePatients,
      icon: Users,
      colorClass: 'text-rose-500 dark:text-rose-400',
      bgClass: 'bg-rose-500/10 dark:bg-rose-500/15',
      borderClass: 'border-rose-500/20'
    },
    {
      label: 'Fármaco Más Prescrito',
      value: stats.topDrug,
      icon: Pill,
      colorClass: 'text-amber-500 dark:text-amber-400',
      bgClass: 'bg-amber-500/10 dark:bg-amber-500/15',
      borderClass: 'border-amber-500/20',
      isText: true
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in-quick">
      {/* ═══ HEADER ═══ */}
      <div className="glass-effect p-5 sm:p-6 rounded-3xl shadow-[var(--glass-shadow)] border border-[var(--glass-border)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-rose-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50 pointer-events-none transition-transform duration-1000 group-hover:scale-110"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl text-white shadow-lg shadow-rose-500/20 transform group-hover:rotate-6 transition-transform duration-500">
              <Pill size={24} />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
                Gestión de <span className="text-rose-500">Medicamentos</span>
              </h2>
              <p className="text-sm text-[var(--text-secondary)] font-medium opacity-70 mt-0.5">
                Vademécum clínico y control de prescripciones
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setEditingMed(null);
              setFormData({ name: '', doses: '', description: '' });
              setIsModalOpen(true);
            }}
            className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-rose-500/20 transition-all hover:-translate-y-0.5 active:scale-95 whitespace-nowrap"
          >
            <Plus size={18} />
            Añadir Fármaco
          </button>
        </div>
      </div>

      {/* ═══ STATS CARDS ═══ */}
      <div className="flex lg:grid lg:grid-cols-4 gap-3 sm:gap-4 py-2 overflow-x-auto lg:overflow-visible snap-x snap-mandatory hide-scrollbar">
        {statsConfig.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              role="article"
              // shrink-0 y min-w-[160px] evitan que se aplasten. snap-start frena el scroll justo en la tarjeta.
              className="shrink-0 min-w-[160px] lg:min-w-0 snap-start relative bg-[var(--bg-card)] border border-[var(--glass-border)] hover:border-[var(--border-color)] rounded-[20px] p-4 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-sm hover:shadow-md transition-all duration-300 group hover:-translate-y-1 will-change-transform select-none overflow-hidden"
            >
              {/* Glow de fondo ultra-sutil (Efecto iluminación lateral) */}
              <div
                className={`absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none ${stat.bgClass}`}
                style={{ maskImage: 'radial-gradient(circle at right, black, transparent 70%)', WebkitMaskImage: 'radial-gradient(circle at right, black, transparent 70%)' }}
              />

              {/* Ícono con Inner Shadow y Rotación */}
              <div className={`relative z-10 ${stat.bgClass} border ${stat.borderClass} p-2.5 sm:p-3 rounded-[14px] shrink-0 shadow-inner transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 will-change-transform`}>
                <Icon size={18} className={`${stat.colorClass} sm:w-5 sm:h-5`} />
              </div>

              <div className="relative z-10 flex-1 min-w-0">
                <p className="text-[9px] sm:text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-80 mb-0.5 group-hover:text-[var(--text-primary)] transition-colors duration-300">
                  {stat.label}
                </p>
                <h4 className={`text-lg sm:text-xl font-black text-[var(--text-primary)] tracking-tight ${stat.isText ? 'truncate text-sm sm:text-base' : ''}`}>
                  {stat.value}
                </h4>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ TABS ═══ */}
      <div className="flex items-center gap-1 sm:gap-1.5 p-1.5 bg-[var(--bg-card)] border border-[var(--border-color)]/50 rounded-2xl w-full sm:w-fit shadow-sm overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab('vademecum')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0
            ${activeTab === 'vademecum'
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25 translate-y-[-1px]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--accent-light)] hover:text-[var(--text-primary)]'
            }`}
        >
          <Package size={15} className="hidden sm:block" />
          Vademécum
        </button>
        <button
          onClick={() => setActiveTab('prescripciones')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 relative
            ${activeTab === 'prescripciones'
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25 translate-y-[-1px]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--accent-light)] hover:text-[var(--text-primary)]'
            }`}
        >
          <Activity size={15} className="hidden sm:block" />
          Prescripciones
          {stats.activePrescriptions > 0 && (
            <span className={`ml-1 min-w-[20px] h-5 flex items-center justify-center px-1 rounded-full text-[10px] font-black
              ${activeTab === 'prescripciones'
                ? 'bg-white/25 text-white'
                : 'bg-rose-500 text-white'
              }`}>
              {stats.activePrescriptions}
            </span>
          )}
        </button>
      </div>

      {/* ═══ SEARCH BAR ═══ */}
      <div className="relative group max-w-xl">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-rose-500 transition-colors" />
        <input
          id="searchTerm"
          name="searchTerm"
          type="text"
          placeholder={activeTab === 'vademecum' ? "Buscar por nombre (ej: Alprazolam)..." : "Buscar por paciente o medicamento..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl text-sm font-medium text-[var(--text-primary)] focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all outline-none shadow-sm placeholder:text-[var(--text-secondary)]/60"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-lg transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>

      {/* ═══ CONTENT ═══ */}
      {activeTab === 'vademecum' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {loading ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 border-4 border-rose-500/20 rounded-full" />
                <div className="w-14 h-14 border-4 border-rose-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
              </div>
              <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest">Sincronizando vademécum...</p>
            </div>
          ) : filteredMeds.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-[var(--bg-card)] rounded-3xl border-2 border-dashed border-[var(--border-color)]">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)]/40 flex items-center justify-center">
                <Pill size={36} className="text-[var(--text-secondary)] opacity-30" />
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)] opacity-80">
                {searchTerm ? `Sin resultados para "${searchTerm}"` : 'No hay medicamentos registrados'}
              </p>
              {searchTerm && (
                <p className="text-xs text-[var(--text-secondary)] opacity-60 mt-1">
                  Intenta con otros términos de búsqueda
                </p>
              )}
            </div>
          ) : (
            filteredMeds.map(med => (
              <div
                key={med.id}
                className="relative bg-[var(--bg-card)] border border-[var(--glass-border)] hover:border-rose-500/30 rounded-[24px] p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col hover:-translate-y-1 overflow-hidden"
              >
                {/* Glow Radial de fondo (Iluminación sutil al hacer hover) */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-rose-500/5"
                  style={{ maskImage: 'radial-gradient(circle at top right, black, transparent 70%)', WebkitMaskImage: 'radial-gradient(circle at top right, black, transparent 70%)' }}
                />

                <div className="flex justify-between items-start mb-5 relative z-10">
                  {/* Ícono animado con Inner Shadow */}
                  <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-[16px] flex items-center justify-center border border-rose-500/20 shadow-inner transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 shrink-0">
                    <Pill size={22} />
                  </div>

                  {/* Botonera de Acción (Aparece con Fade + Slide In) */}
                  <div className="flex gap-1.5 opacity-100 md:opacity-0 translate-x-0 md:translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    <button
                      onClick={() => {
                        setEditingMed(med);
                        setFormData({ name: med.name, doses: med.doses, description: med.description });
                        setIsModalOpen(true);
                      }}
                      className="p-2 text-[var(--text-secondary)] hover:text-indigo-500 hover:bg-indigo-500/10 rounded-xl transition-all border border-transparent hover:border-indigo-500/20"
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ isOpen: true, id: med.id })}
                      className="p-2 text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/20"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 relative z-10">
                  <h3 className="text-lg font-black text-[var(--text-primary)] mb-2.5 leading-tight uppercase tracking-tight">
                    {med.name}
                  </h3>

                  {/* Píldora técnica para las dosis */}
                  <div className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-[var(--bg-main)] border border-[var(--border-color)]/60 rounded-xl shadow-sm">
                    <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-70">
                      Dosis
                    </span>
                    <span className="w-1 h-1 rounded-full bg-[var(--border-color)]"></span>
                    <span className="text-[10px] font-bold text-rose-500 dark:text-rose-400 tracking-wide">
                      {med.doses || 'No especificadas'}
                    </span>
                  </div>
                </div>

                {med.description && (
                  <div className="relative z-10 mt-5 pt-4 border-t border-[var(--border-color)]/40">
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 font-medium leading-relaxed group-hover:text-[var(--text-primary)] transition-colors duration-300">
                      {med.description}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="card-premium overflow-hidden border border-[var(--glass-border)] rounded-3xl shadow-sm">
          <div className="px-5 sm:px-6 py-4 border-b border-[var(--border-color)]/30 bg-[var(--bg-sidebar)]/50 flex items-center justify-between">
            <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2 text-sm sm:text-base">
              <Activity size={18} className="text-rose-500" />
              Prescripciones Activas
            </h3>
            <span className="text-[10px] sm:text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--border-color)]/40">
              {filteredPrescriptions.length} registro{filteredPrescriptions.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            {/* DESKTOP */}
            <table className="w-full text-left border-collapse hidden md:table">
              <thead>
                <tr className="bg-[var(--bg-sidebar)]/30 border-b border-[var(--border-color)]/30 uppercase text-[10px] font-black tracking-widest text-[var(--text-secondary)] opacity-70">
                  <th className="px-6 py-4">Paciente</th>
                  <th className="px-6 py-4">Medicamento</th>
                  <th className="px-6 py-4">Dosis / Frecuencia</th>
                  <th className="px-6 py-4">Inicio</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/20">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-5"><div className="h-4 w-32 bg-[var(--border-color)]/50 rounded-full" /></td>
                      <td className="px-6 py-5"><div className="h-4 w-24 bg-[var(--border-color)]/50 rounded-full" /></td>
                      <td className="px-6 py-5"><div className="h-4 w-20 bg-[var(--border-color)]/50 rounded-full" /></td>
                      <td className="px-6 py-5"><div className="h-4 w-20 bg-[var(--border-color)]/50 rounded-full" /></td>
                      <td className="px-6 py-5"><div className="h-6 w-16 bg-[var(--border-color)]/50 rounded-full mx-auto" /></td>
                    </tr>
                  ))
                ) : filteredPrescriptions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)]/40 flex items-center justify-center">
                          <Activity size={36} className="text-[var(--text-secondary)] opacity-30" />
                        </div>
                        <p className="text-sm font-bold text-[var(--text-primary)] opacity-80">
                          {searchTerm ? `Sin resultados para "${searchTerm}"` : 'No hay prescripciones activas'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPrescriptions.map((pres, idx) => (
                    <tr key={idx} className="hover:bg-[var(--accent-light)]/30 transition-colors group">
                      <td className="px-6 py-5">
                        <p className="text-sm font-black text-[var(--text-primary)]">{pres.patientName}</p>
                        <p className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60">ID: #{pres.patientId}</p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-rose-500/10 dark:bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
                            <Pill size={14} />
                          </div>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{pres.drug}</p>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{pres.dose}</p>
                        <p className="text-xs text-[var(--text-secondary)] italic opacity-70">{pres.frequency}</p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-xs font-bold text-[var(--text-secondary)]">{new Date(pres.start_date).toLocaleDateString('es-AR')}</p>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase rounded-full border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Activa
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* MÓVIL */}
            <div className="md:hidden divide-y divide-[var(--border-color)]/20">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-5 animate-pulse flex gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[var(--border-color)]/50 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-[var(--border-color)]/50 rounded-full" />
                      <div className="h-3 w-1/2 bg-[var(--border-color)]/30 rounded-full" />
                      <div className="h-3 w-1/3 bg-[var(--border-color)]/30 rounded-full" />
                    </div>
                  </div>
                ))
              ) : filteredPrescriptions.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)]/40 flex items-center justify-center">
                      <Activity size={28} className="text-[var(--text-secondary)] opacity-30" />
                    </div>
                    <p className="text-xs font-bold text-[var(--text-primary)] opacity-70 uppercase tracking-widest">Sin prescripciones</p>
                  </div>
                </div>
              ) : (
                filteredPrescriptions.map((pres, idx) => (
                  <div key={idx} className="p-4 sm:p-5 transition-all flex flex-col gap-3 hover:bg-[var(--accent-light)]/30">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-rose-500/10 dark:bg-rose-500/15 text-rose-500 flex items-center justify-center font-black shadow-sm shrink-0 border border-rose-500/20">
                          <Pill size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-[var(--text-primary)] text-base">{pres.drug}</span>
                          <span className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase tracking-widest">{pres.patientName}</span>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase rounded-full border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Activa
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-1 pt-3 border-t border-[var(--border-color)]/20">
                      <div>
                        <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-0.5 opacity-70">Dosis</p>
                        <p className="text-xs font-bold text-[var(--text-primary)]">{pres.dose}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-0.5 opacity-70">Frecuencia</p>
                        <p className="text-xs font-bold text-[var(--text-primary)]">{pres.frequency}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-0.5 opacity-70">Inicio del Tratamiento</p>
                        <p className="text-xs font-bold text-[var(--text-primary)]">{new Date(pres.start_date).toLocaleDateString('es-AR')}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL CREAR/EDITAR ═══ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm animate-fade-in-quick">
          <div className="bg-[var(--bg-card)] rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl border border-[var(--glass-border)] animate-scale-in flex flex-col">

            {/* ENCABEZADO SOFT UI */}
            <div className="px-6 sm:px-8 py-6 border-b border-[var(--border-color)]/50 bg-[var(--bg-main)]/50 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 shadow-inner">
                  {editingMed ? <Pencil size={22} /> : <Plus size={22} />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight">
                    {editingMed ? 'Editar Medicamento' : 'Nuevo Fármaco'}
                  </h3>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-1">
                    Vademécum Clínico
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/20"
                disabled={submitting}
              >
                <X size={20} />
              </button>
            </div>

            {/* CUERPO DEL FORMULARIO */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 bg-[var(--bg-card)]">
              <div className="space-y-5">

                {/* Input Nombre */}
                <div className="space-y-2">
                  <label htmlFor="name" className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1 opacity-80">
                    Nombre Comercial <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-5 py-3.5 bg-[var(--bg-main)] border border-[var(--border-color)]/60 text-[var(--text-primary)] rounded-2xl text-sm font-bold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 hover:border-[var(--border-color)] transition-all placeholder:text-[var(--text-secondary)]/40 shadow-sm"
                    placeholder="Ej: Clonagin"
                    disabled={submitting}
                  />
                </div>

                {/* Input Dosis */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end ml-1">
                    <label htmlFor="doses" className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-80">
                      Dosis Disponibles
                    </label>
                    <span className="text-[9px] font-bold text-[var(--text-secondary)] opacity-50 uppercase tracking-widest">
                      Separadas por guion (-)
                    </span>
                  </div>
                  <input
                    id="doses"
                    name="doses"
                    type="text"
                    value={formData.doses}
                    onChange={(e) => setFormData({ ...formData, doses: e.target.value })}
                    className="w-full px-5 py-3.5 bg-[var(--bg-main)] border border-[var(--border-color)]/60 text-[var(--text-primary)] rounded-2xl text-sm font-bold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 hover:border-[var(--border-color)] transition-all placeholder:text-[var(--text-secondary)]/40 shadow-sm"
                    placeholder="Ej: 0.5 mg - 2 mg - gotas"
                    disabled={submitting}
                  />
                </div>

                {/* Textarea Descripción */}
                <div className="space-y-2">
                  <label htmlFor="description" className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1 opacity-80">
                    Descripción / Notas
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-5 py-3.5 bg-[var(--bg-main)] border border-[var(--border-color)]/60 text-[var(--text-primary)] rounded-2xl text-sm font-bold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 hover:border-[var(--border-color)] transition-all resize-none placeholder:text-[var(--text-secondary)]/40 shadow-sm"
                    placeholder="Indicaciones especiales, contraindicaciones..."
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* BOTONERA */}
              <div className="flex gap-3 pt-4 border-t border-[var(--border-color)]/40">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="flex-1 py-3.5 bg-[var(--bg-main)] border border-[var(--border-color)]/60 text-[var(--text-secondary)] font-bold rounded-xl hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)] transition-all disabled:opacity-50 shadow-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] py-3.5 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 hover:-translate-y-0.5 shadow-[0_4px_12px_rgba(244,63,94,0.2)] transition-all disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>{editingMed ? 'Actualizar' : 'Guardar'} Fármaco</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="¿Eliminar medicamento?"
        message="Esta acción quitará el fármaco del vademécum global. No afectará a las prescripciones ya realizadas a pacientes."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
        confirmText="Sí, eliminar"
        type="danger"
      />
    </div>
  );
}
