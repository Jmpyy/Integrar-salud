import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../../../stores/useStore';
import {
  Search, Users, FileText, ChevronLeft, ChevronRight, Loader2,
  UserCheck, HeartPulse, Calendar, Activity, X, Filter
} from 'lucide-react';
import PatientHistoryViewer from '../../../components/PatientHistoryViewer';
import { calculateAge } from '../../../utils/helpers';

export default function PacientesPage() {
  const store = useStore();
  const patients = store.patients;
  const pagination = store.patientsPagination;
  const patientsLoading = store.patientsLoading;
  const userRole = store.userRole;
  const isDoctorOrAdmin = ['medico', 'admin'].includes(userRole);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [quickFilter, setQuickFilter] = useState('all'); // 'all', 'particular', 'cobertura'

  const [searchParams, setSearchParams] = useSearchParams();
  const viewId = searchParams.get('view');

  // ── Debounce 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ── Fetch cuando cambia búsqueda o página
  useEffect(() => {
    store.fetchPatients({
      page: currentPage,
      limit: 25,
      search: debouncedSearch || undefined,
    });
    store.fetchDoctors();
    store.fetchAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, currentPage]);

  // ── Auto-abrir historia si viene con ?view=ID
  useEffect(() => {
    if (viewId && patients.length > 0 && !selectedPatient) {
      const patient = patients.find(p => String(p.id) === String(viewId));
      if (patient) {
        handleOpenPatient(patient);
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('view');
        setSearchParams(newParams, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewId, patients, selectedPatient]);

  const handleOpenPatient = async (patient) => {
    if (!patient?.id) return;
    setLoadingPatient(true);
    try {
      const { patientsService } = await import('../../../services/patients');
      const full = await patientsService.getById(patient.id);

      if (full) {
        store.setPatients(store.patients.map(p => p.id === full.id ? full : p));
      }

      setSelectedPatient(full || patient);
    } catch (err) {
      console.error("Error al cargar paciente:", err);
      setSelectedPatient(patient);
    } finally {
      setLoadingPatient(false);
    }
  };

  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // ── Stats calculados dinámicamente
  const stats = useMemo(() => {
    const total = pagination.total ?? patients.length;
    const conCobertura = patients.filter(p => p.coverage && p.coverage !== 'Particular').length;
    const particular = patients.filter(p => !p.coverage || p.coverage === 'Particular').length;

    // Calcular edad promedio solo de la página actual
    const edades = patients
      .map(p => calculateAge(p.birthDate || p.birth_date))
      .filter(e => e !== null && !isNaN(e));
    const edadPromedio = edades.length > 0
      ? (edades.reduce((a, b) => a + b, 0) / edades.length).toFixed(1)
      : null;

    return { total, conCobertura, particular, edadPromedio };
  }, [patients, pagination]);

  // ── Pantalla de carga
  if (loadingPatient) {
    return (
      <div className="flex items-center justify-center h-[60vh] flex-col gap-6">
        <div className="relative">
          <div className="w-14 h-14 border-4 border-[var(--accent-primary)]/20 rounded-full" />
          <div className="w-14 h-14 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
        </div>
        <div className="flex flex-col items-center">
          <p className="text-[var(--text-primary)] font-black text-sm uppercase tracking-widest">Cargando Historia Clínica</p>
          <p className="text-[var(--text-secondary)] text-[10px] font-bold opacity-50 uppercase tracking-[0.2em] mt-2">Verificando permisos de acceso...</p>
        </div>
      </div>
    );
  }

  if (selectedPatient) {
    return (
      <PatientHistoryViewer
        patient={selectedPatient}
        onBack={() => {
          setSelectedPatient(null);
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('action');
          newParams.delete('date');
          setSearchParams(newParams, { replace: true });
        }}
        initialAction={searchParams.get('action')}
        initialDate={searchParams.get('date')}
      />
    );
  }

  const totalPages = pagination.pages ?? 1;
  const totalItems = pagination.total ?? patients.length;

  const getPageRange = () => {
    const delta = 2;
    const range = [];
    const left = Math.max(1, currentPage - delta);
    const right = Math.min(totalPages, currentPage + delta);
    for (let i = left; i <= right; i++) range.push(i);
    return range;
  };

  // ── Configuración de stats
  const statsConfig = [
    {
      label: 'Total Pacientes',
      value: stats.total,
      icon: Users,
      colorClass: 'text-indigo-500 dark:text-indigo-400',
      bgClass: 'bg-indigo-500/10 dark:bg-indigo-500/15',
      borderClass: 'border-indigo-500/20',
      filter: 'all'
    },
    {
      label: 'Con Cobertura',
      value: stats.conCobertura,
      icon: UserCheck,
      colorClass: 'text-emerald-500 dark:text-emerald-400',
      bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      borderClass: 'border-emerald-500/20',
      filter: 'cobertura'
    },
    {
      label: 'Particulares',
      value: stats.particular,
      icon: HeartPulse,
      colorClass: 'text-rose-500 dark:text-rose-400',
      bgClass: 'bg-rose-500/10 dark:bg-rose-500/15',
      borderClass: 'border-rose-500/20',
      filter: 'particular'
    },
    {
      label: 'Edad Promedio',
      value: stats.edadPromedio ? `${stats.edadPromedio}` : 'N/A',
      suffix: stats.edadPromedio ? 'años' : '',
      icon: Calendar,
      colorClass: 'text-amber-500 dark:text-amber-400',
      bgClass: 'bg-amber-500/10 dark:bg-amber-500/15',
      borderClass: 'border-amber-500/20',
      filter: null
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in-quick">
      {/* ═══ HEADER ═══ */}
      <div className="glass-effect p-5 sm:p-6 rounded-3xl shadow-[var(--glass-shadow)] border border-[var(--glass-border)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[var(--accent-primary)]/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50 pointer-events-none transition-transform duration-1000 group-hover:scale-110"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-hover)] rounded-2xl text-white shadow-lg shadow-[var(--accent-primary)]/20 transform group-hover:rotate-6 transition-transform duration-500">
              <Users size={24} />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
                Directorio <span className="text-[var(--accent-primary)]">Médico</span>
              </h2>
              <p className="text-sm text-[var(--text-secondary)] font-medium opacity-70 mt-0.5">
                Gestión centralizada de expedientes clínicos
              </p>
            </div>
          </div>

          <div className="relative group/search w-full lg:max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within/search:text-[var(--accent-primary)] transition-colors" />
            <input
              id="searchTerm"
              name="searchTerm"
              type="text"
              placeholder="Buscar por Nombre, DNI o NHC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-10 py-3.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl text-sm font-medium text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-light)] transition-all outline-none shadow-sm placeholder:text-[var(--text-secondary)]/60"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-lg transition-all"
              >
                <X size={14} />
              </button>
            )}
            {patientsLoading && (
              <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--accent-primary)] animate-spin" />
            )}
          </div>
        </div>
      </div>

      {/* ═══ STATS CARDS ═══ */}
      <div className="flex md:grid md:grid-cols-4 gap-3 sm:gap-4 overflow-x-auto md:overflow-visible hide-scrollbar snap-x snap-mandatory py-1">
        {statsConfig.map((stat, idx) => {
          const Icon = stat.icon;
          const isActive = stat.filter && quickFilter === stat.filter;

          return (
            <button
              key={idx}
              onClick={() => stat.filter && setQuickFilter(stat.filter)}
              disabled={!stat.filter}
              className={`shrink-0 min-w-[180px] md:min-w-0 snap-start relative bg-[var(--bg-card)] border rounded-2xl p-4 sm:p-5 shadow-sm transition-all duration-300 group flex items-center gap-3 sm:gap-4 overflow-hidden text-left
                ${isActive
                  ? 'border-[var(--accent-primary)]/50 ring-2 ring-[var(--accent-light)] shadow-md'
                  : 'border-[var(--glass-border)] hover:border-[var(--border-color)] hover:shadow-md'
                }
                ${!stat.filter ? 'cursor-default' : 'cursor-pointer hover:-translate-y-0.5'}`}
            >
              <div className={`${stat.bgClass} border ${stat.borderClass} p-2.5 sm:p-3 rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-110`}>
                <Icon size={18} className={`${stat.colorClass} sm:w-5 sm:h-5`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] sm:text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-70 mb-0.5">
                  {stat.label}
                </p>
                <div className="flex items-baseline gap-1.5">
                  <h4 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
                    {stat.value}
                  </h4>
                  {stat.suffix && (
                    <span className="text-[10px] sm:text-xs font-bold text-[var(--text-secondary)] opacity-50">
                      {stat.suffix}
                    </span>
                  )}
                </div>
              </div>
              {isActive && (
                <div className="absolute top-2 right-2">
                  <div className="w-2 h-2 bg-[var(--accent-primary)] rounded-full animate-pulse" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══ TABLA DE PACIENTES ═══ */}
      <div className="card-premium overflow-hidden border border-[var(--glass-border)] rounded-3xl shadow-sm">
        {/* Header de la tabla */}
        <div className="px-5 sm:px-6 py-4 border-b border-[var(--border-color)]/30 bg-[var(--bg-sidebar)]/50 flex items-center justify-between">
          <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2 text-sm sm:text-base">
            <Activity size={18} className="text-[var(--accent-primary)]" />
            Listado de Pacientes
          </h3>
          <span className="text-[10px] sm:text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--border-color)]/40">
            {patients.length} en esta página
          </span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          {/* ═══ DESKTOP ═══ */}
          <table className="w-full text-left border-collapse hidden md:table">
            <thead>
              <tr className="bg-[var(--bg-sidebar)]/30 border-b border-[var(--border-color)]/30 uppercase text-[10px] font-black tracking-widest text-[var(--text-secondary)] opacity-70">
                <th className="p-5 pl-6">#NHC</th>
                <th className="p-5">Paciente</th>
                <th className="p-5">Documento</th>
                <th className="p-5">Edad</th>
                <th className="p-5">Cobertura</th>
                <th className="p-5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]/20 text-sm">
              {patientsLoading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-5 pl-6"><div className="h-4 w-20 bg-[var(--border-color)]/50 rounded-full" /></td>
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--border-color)]/50" />
                        <div className="space-y-1.5">
                          <div className="h-4 w-32 bg-[var(--border-color)]/50 rounded-full" />
                          <div className="h-3 w-20 bg-[var(--border-color)]/30 rounded-full" />
                        </div>
                      </div>
                    </td>
                    <td className="p-5"><div className="h-4 w-24 bg-[var(--border-color)]/50 rounded-full" /></td>
                    <td className="p-5"><div className="h-4 w-12 bg-[var(--border-color)]/50 rounded-full" /></td>
                    <td className="p-5"><div className="h-6 w-24 bg-[var(--border-color)]/50 rounded-full" /></td>
                    <td className="p-5"><div className="h-9 w-9 bg-[var(--border-color)]/50 rounded-xl mx-auto" /></td>
                  </tr>
                ))
              ) : patients.length > 0 ? (
                patients.map(patient => {
                  const edad = calculateAge(patient.birthDate || patient.birth_date);

                  return (
                    <tr
                      key={patient.id}
                      className={`group/row transition-all duration-200 ${isDoctorOrAdmin ? 'hover:bg-[var(--accent-light)]/50 cursor-pointer' : ''}`}
                      onClick={() => isDoctorOrAdmin && handleOpenPatient(patient)}
                    >
                      <td className="p-5 pl-6">
                        <span className="font-black text-[var(--accent-primary)] opacity-70 group-hover/row:opacity-100 transition-opacity text-xs">
                          {patient.nhc || <span className="text-[var(--text-secondary)] opacity-30">—</span>}
                        </span>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-hover)] text-white flex items-center justify-center font-black text-sm shadow-md shadow-[var(--accent-primary)]/20 group-hover/row:scale-110 transition-transform">
                            {patient.name?.charAt(0) || '?'}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-black text-[var(--text-primary)] text-sm group-hover/row:text-[var(--accent-primary)] transition-colors truncate">
                              {patient.name}
                            </span>
                            <span className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase tracking-wider truncate">
                              {patient.phone || 'Sin teléfono'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-5">
                        <span className="font-bold text-[var(--text-primary)] opacity-80 text-xs font-mono">
                          {patient.dni || '—'}
                        </span>
                      </td>
                      <td className="p-5">
                        <span className="text-sm font-bold text-[var(--text-primary)]">
                          {edad !== null ? `${edad} años` : <span className="text-[var(--text-secondary)] opacity-40 text-xs">N/A</span>}
                        </span>
                      </td>
                      <td className="p-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border
                          ${patient.coverage === 'Particular'
                            ? 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            : 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          }`}>
                          {patient.coverage === 'Particular' ? (
                            <HeartPulse size={10} />
                          ) : (
                            <UserCheck size={10} />
                          )}
                          {patient.coverage || 'Sin datos'}
                        </span>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center justify-center">
                          {isDoctorOrAdmin ? (
                            <button
                              className="p-2.5 bg-[var(--bg-main)] text-[var(--accent-primary)] border border-[var(--border-color)] rounded-xl group-hover/row:bg-[var(--accent-primary)] group-hover/row:text-white group-hover/row:border-[var(--accent-primary)] shadow-sm group-hover/row:shadow-lg group-hover/row:shadow-[var(--accent-primary)]/20 transition-all transform group-hover/row:scale-110"
                              title="Ver historia clínica"
                            >
                              <FileText size={16} />
                            </button>
                          ) : (
                            <div className="p-2.5 bg-[var(--bg-main)] text-[var(--text-secondary)] opacity-30 border border-[var(--border-color)] rounded-xl">
                              <FileText size={16} />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)]/40 flex items-center justify-center">
                        <Search size={36} className="text-[var(--text-secondary)] opacity-30" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[var(--text-primary)] opacity-80 uppercase tracking-wider">
                          {debouncedSearch ? `Sin resultados para "${debouncedSearch}"` : 'No hay pacientes registrados'}
                        </p>
                        {debouncedSearch && (
                          <p className="text-xs text-[var(--text-secondary)] opacity-60 mt-1">
                            Intenta con otros términos de búsqueda
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* ═══ MÓVIL ═══ */}
          <div className="md:hidden divide-y divide-[var(--border-color)]/20">
            {patientsLoading ? (
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
            ) : patients.length > 0 ? (
              patients.map(patient => {
                const edad = calculateAge(patient.birthDate || patient.birth_date);

                return (
                  <div
                    key={patient.id}
                    className={`p-4 sm:p-5 transition-all flex flex-col gap-3 ${isDoctorOrAdmin ? 'active:bg-[var(--accent-light)]/50 hover:bg-[var(--accent-light)]/30' : ''}`}
                    onClick={() => isDoctorOrAdmin && handleOpenPatient(patient)}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-hover)] text-white flex items-center justify-center font-black text-base shadow-md shadow-[var(--accent-primary)]/20 shrink-0">
                          {patient.name?.charAt(0) || '?'}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-black text-[var(--text-primary)] text-base truncate">
                            {patient.name}
                          </span>
                          <span className="text-[10px] font-bold text-[var(--accent-primary)] opacity-70 uppercase tracking-wider">
                            {patient.nhc || 'SIN NHC'}
                          </span>
                        </div>
                      </div>
                      {isDoctorOrAdmin ? (
                        <button
                          className="p-2.5 bg-[var(--bg-main)] text-[var(--accent-primary)] border border-[var(--border-color)] rounded-xl shrink-0"
                          title="Ver historia clínica"
                        >
                          <FileText size={16} />
                        </button>
                      ) : (
                        <div className="p-2.5 bg-[var(--bg-main)] text-[var(--text-secondary)] opacity-30 border border-[var(--border-color)] rounded-xl shrink-0">
                          <FileText size={16} />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-1 pt-3 border-t border-[var(--border-color)]/20">
                      <div>
                        <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-0.5 opacity-70">DNI</p>
                        <p className="text-xs font-bold text-[var(--text-primary)] font-mono">{patient.dni || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-0.5 opacity-70">Edad</p>
                        <p className="text-xs font-bold text-[var(--text-primary)]">
                          {edad !== null ? `${edad} años` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-0.5 opacity-70">Cobertura</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border
                          ${patient.coverage === 'Particular'
                            ? 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            : 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          }`}>
                          {patient.coverage}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-16 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)]/40 flex items-center justify-center">
                    <Search size={28} className="text-[var(--text-secondary)] opacity-30" />
                  </div>
                  <p className="text-xs font-black text-[var(--text-primary)] opacity-70 uppercase tracking-widest">Sin resultados</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ FOOTER: PAGINACIÓN ═══ */}
        <div className="bg-[var(--bg-sidebar)]/30 backdrop-blur-md border-t border-[var(--border-color)]/20 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-[10px] sm:text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            <div className="w-2 h-2 bg-[var(--accent-primary)] rounded-full animate-pulse shadow-[0_0_8px_var(--accent-primary)]"></div>
            <span>
              {totalItems > 0
                ? `Página ${currentPage} de ${totalPages} • ${totalItems} pacientes`
                : 'Sin registros'
              }
            </span>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || patientsLoading}
                className="p-2 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                aria-label="Página anterior"
              >
                <ChevronLeft size={16} />
              </button>

              {currentPage > 3 && (
                <>
                  <button
                    onClick={() => handlePageChange(1)}
                    className="w-8 h-8 text-xs font-black rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all"
                  >
                    1
                  </button>
                  {currentPage > 4 && <span className="text-[var(--text-secondary)] opacity-40 text-xs px-1">…</span>}
                </>
              )}

              {getPageRange().map(p => (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  disabled={patientsLoading}
                  className={`w-8 h-8 text-xs font-black rounded-xl border transition-all ${p === currentPage
                    ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-md shadow-[var(--accent-primary)]/25 scale-105'
                    : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]'
                    }`}
                >
                  {p}
                </button>
              ))}

              {currentPage < totalPages - 2 && (
                <>
                  {currentPage < totalPages - 3 && <span className="text-[var(--text-secondary)] opacity-40 text-xs px-1">…</span>}
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className="w-8 h-8 text-xs font-black rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all"
                  >
                    {totalPages}
                  </button>
                </>
              )}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || patientsLoading}
                className="p-2 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                aria-label="Página siguiente"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
