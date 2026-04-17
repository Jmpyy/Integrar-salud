import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../../../stores/useStore';
import {
  Search, Users, FileText, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import PatientHistoryViewer from '../../../components/PatientHistoryViewer';

export default function PacientesPage() {
  const store = useStore();
  const patients           = store.patients;
  const pagination         = store.patientsPagination;
  const patientsLoading    = store.patientsLoading;

  const [searchTerm,      setSearchTerm]      = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage,     setCurrentPage]     = useState(1);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loadingPatient,  setLoadingPatient]  = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const viewId = searchParams.get('view');

  // ── Debounce 400ms antes de disparar la búsqueda al servidor
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
      page:   currentPage,
      limit:  25,
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
    setLoadingPatient(true);
    try {
      const full = await import('../../../services/patients').then(m => m.patientsService.getById(patient.id));
      setSelectedPatient(full || patient);
    } catch {
      setSelectedPatient(patient);
    } finally {
      setLoadingPatient(false);
    }
  };

  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // ── Pantalla de carga de ficha clínica
  if (loadingPatient) {
    return (
      <div className="flex items-center justify-center h-[60vh] flex-col gap-6 animate-pulse">
        <div className="w-12 h-12 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin shadow-lg shadow-[var(--accent-primary)]/20" />
        <div className="flex flex-col items-center">
          <p className="text-[var(--text-primary)] font-black text-sm uppercase tracking-widest">Cargando Historia Clínica</p>
          <p className="text-[var(--text-secondary)] text-[10px] font-bold opacity-50 uppercase tracking-[0.2em] mt-2">Seguridad y Privacidad Integrada</p>
        </div>
      </div>
    );
  }

  if (selectedPatient) {
    return (
      <PatientHistoryViewer
        patient={selectedPatient}
        onBack={() => setSelectedPatient(null)}
      />
    );
  }

  const totalPages = pagination.pages ?? 1;
  const totalItems = pagination.total ?? patients.length;

  const getPageRange = () => {
    const delta = 2;
    const range = [];
    const left  = Math.max(1, currentPage - delta);
    const right = Math.min(totalPages, currentPage + delta);
    for (let i = left; i <= right; i++) range.push(i);
    return range;
  };

  return (
    <div className="space-y-6 animate-fade-in-quick">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 glass-effect p-8 rounded-[2.5rem] shadow-[var(--glass-shadow)] border border-[var(--glass-border)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-primary)]/5 rounded-bl-full -z-0 transition-transform group-hover:scale-110 duration-700"></div>
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-3 tracking-tighter">
            <div className="w-10 h-10 bg-[var(--accent-primary)]/10 rounded-2xl flex items-center justify-center text-[var(--accent-primary)]">
              <Users size={22} />
            </div>
            Directorio de Pacientes
          </h2>
          <p className="text-sm text-[var(--text-secondary)] font-medium mt-1.5 opacity-70">
            {totalItems > 0 ? `${totalItems} pacientes registrados` : 'Gestión centralizada de expedientes y triaje clínico digital'}
          </p>
        </div>

        <div className="relative group w-full lg:max-w-md z-10">
          {patientsLoading
            ? <Loader2 size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--accent-primary)] animate-spin" />
            : <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-40 group-focus-within:text-[var(--accent-primary)] group-focus-within:opacity-100 transition-all" />
          }
          <input
            type="text"
            placeholder="Buscar por Nombre, DNI o NHC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-10 py-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-[2rem] text-sm font-bold text-[var(--text-primary)] focus:border-[var(--accent-primary)]/50 focus:ring-8 focus:ring-[var(--accent-primary)]/5 transition-all outline-none shadow-inner placeholder:text-[var(--text-secondary)]/30"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] text-xs font-black opacity-50 hover:opacity-100 transition-all"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* TABLA */}
      <div className="card-premium overflow-hidden border border-[var(--glass-border)] rounded-2xl sm:rounded-[2.5rem] shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">

          {/* DESKTOP */}
          <table className="w-full text-left border-collapse hidden md:table">
            <thead>
              <tr className="bg-[var(--bg-sidebar)]/50 backdrop-blur-xl border-b border-[var(--border-color)]/30 uppercase text-[10px] font-black tracking-[0.2em] text-[var(--text-secondary)] opacity-60">
                <th className="p-6 pl-8">#NHC</th>
                <th className="p-6">Paciente</th>
                <th className="p-6">Documento</th>
                <th className="p-6">Cobertura / OS</th>
                <th className="p-6 text-center">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]/20 text-sm">
              {patientsLoading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-6 pl-8"><div className="h-4 w-20 bg-[var(--border-color)] rounded-full" /></td>
                    <td className="p-6"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-2xl bg-[var(--border-color)]" /><div className="h-4 w-32 bg-[var(--border-color)] rounded-full" /></div></td>
                    <td className="p-6"><div className="h-4 w-24 bg-[var(--border-color)] rounded-full" /></td>
                    <td className="p-6"><div className="h-6 w-20 bg-[var(--border-color)] rounded-full" /></td>
                    <td className="p-6"><div className="h-8 w-8 bg-[var(--border-color)] rounded-2xl mx-auto" /></td>
                  </tr>
                ))
              ) : patients.length > 0 ? (
                patients.map(patient => (
                  <tr
                    key={patient.id}
                    className="group/row hover:bg-[var(--accent-light)] transition-all cursor-pointer"
                    onClick={() => handleOpenPatient(patient)}
                  >
                    <td className="p-6 pl-8 font-black text-[var(--accent-primary)] opacity-60 group-hover/row:opacity-100 transition-opacity">
                      {patient.nhc || <span className="text-[var(--text-secondary)] opacity-20">N/A</span>}
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-hover)] text-white flex items-center justify-center font-black text-xs shadow-lg group-hover/row:scale-110 transition-transform">
                          {patient.name?.charAt(0) || '?'}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-[var(--text-primary)] text-base group-hover/row:text-[var(--accent-primary)] transition-colors">{patient.name}</span>
                          <span className="text-[10px] font-bold text-[var(--text-secondary)] opacity-50 uppercase tracking-widest">{patient.phone || 'Sin teléfono'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 font-bold text-[var(--text-primary)] opacity-80">{patient.dni}</td>
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        patient.coverage === 'Particular'
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        : 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/20'
                      }`}>
                        {patient.coverage || 'Sin Datos'}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center justify-center">
                        <button className="p-3 bg-[var(--bg-main)] text-[var(--accent-primary)] border border-[var(--border-color)] rounded-2xl group-hover/row:bg-[var(--accent-primary)] group-hover/row:text-white group-hover/row:border-[var(--accent-primary)] shadow-sm group-hover/row:shadow-lg group-hover/row:shadow-[var(--accent-primary)]/20 transition-all transform group-hover/row:scale-110">
                          <FileText size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <Search size={48} />
                      <p className="text-sm font-black uppercase tracking-[0.25em]">
                        {debouncedSearch ? `Sin resultados para "${debouncedSearch}"` : 'No hay pacientes registrados'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* MÓVIL */}
          <div className="md:hidden divide-y divide-[var(--border-color)]/20">
            {patientsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-5 animate-pulse flex gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--border-color)] shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-[var(--border-color)] rounded-full" />
                    <div className="h-3 w-1/2 bg-[var(--border-color)] rounded-full" />
                  </div>
                </div>
              ))
            ) : patients.length > 0 ? (
              patients.map(patient => (
                <div
                  key={patient.id}
                  className="p-5 active:bg-[var(--accent-light)] transition-all flex flex-col gap-3"
                  onClick={() => handleOpenPatient(patient)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-hover)] text-white flex items-center justify-center font-black text-sm shadow-lg">
                        {patient.name?.charAt(0) || '?'}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-[var(--text-primary)] text-base">{patient.name}</span>
                        <span className="text-[10px] font-bold text-[var(--accent-primary)] opacity-60 uppercase tracking-widest">{patient.nhc || 'SIN NHC'}</span>
                      </div>
                    </div>
                    <button className="p-2.5 bg-[var(--bg-main)] text-[var(--accent-primary)] border border-[var(--border-color)] rounded-xl">
                      <FileText size={18} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-1">
                    <div>
                      <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-0.5">Documento</p>
                      <p className="text-xs font-bold text-[var(--text-primary)] opacity-80">{patient.dni}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-0.5">Cobertura</p>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        patient.coverage === 'Particular'
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        : 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/20'
                      }`}>
                        {patient.coverage || 'Particular'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-16 text-center">
                <div className="flex flex-col items-center gap-4 opacity-30">
                  <Search size={40} />
                  <p className="text-xs font-black uppercase tracking-[0.25em]">Sin resultados</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER: paginación + info */}
        <div className="bg-[var(--bg-card)]/30 backdrop-blur-md border-t border-[var(--border-color)]/20 p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">
            <div className="w-2 h-2 bg-[var(--accent-primary)] rounded-full animate-pulse shadow-[0_0_10px_var(--accent-primary)]"></div>
            <span>
              {totalItems > 0
                ? `Mostrando ${((currentPage - 1) * (pagination.limit ?? 25)) + 1}–${Math.min(currentPage * (pagination.limit ?? 25), totalItems)} de ${totalItems} pacientes`
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
              >
                <ChevronLeft size={16} />
              </button>

              {currentPage > 3 && (
                <>
                  <button onClick={() => handlePageChange(1)} className="w-8 h-8 text-xs font-black rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all">1</button>
                  {currentPage > 4 && <span className="text-[var(--text-secondary)] opacity-40 text-xs px-1">…</span>}
                </>
              )}

              {getPageRange().map(p => (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  disabled={patientsLoading}
                  className={`w-8 h-8 text-xs font-black rounded-xl border transition-all ${
                    p === currentPage
                      ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-lg shadow-[var(--accent-primary)]/20'
                      : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]'
                  }`}
                >
                  {p}
                </button>
              ))}

              {currentPage < totalPages - 2 && (
                <>
                  {currentPage < totalPages - 3 && <span className="text-[var(--text-secondary)] opacity-40 text-xs px-1">…</span>}
                  <button onClick={() => handlePageChange(totalPages)} className="w-8 h-8 text-xs font-black rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all">{totalPages}</button>
                </>
              )}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || patientsLoading}
                className="p-2 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
