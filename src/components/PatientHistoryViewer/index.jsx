import { useState } from 'react';
import { ShieldAlert, HeartPulse, AlertCircle, FileText, ChevronRight, Calendar, User, Wallet, CheckCircle2, Clock, Pencil, X, Save, Plus, Trash2 } from 'lucide-react';
import { calculateAge, formatDateTime, formatDate } from '../../utils/helpers';
import { useStore } from '../../stores/useStore';
import toast from 'react-hot-toast';

/**
 * Componente compartido para ver la historia clínica de un paciente.
 */
export default function PatientHistoryViewer({
  patient,
  onBack,
  showEditActions = false,
}) {
  const store = useStore();
  const allAppointments = store.appointments || [];
  const doctors = store.doctors || [];

  const activeHistory = patient?.history || [];
  const activeMedications = patient?.medications || [];

  // Helper para normalizar el objeto de paciente que viene del store (puede tener snake_case de la DB)
  const normPatient = {
    ...patient,
    birthDate: patient.birthDate || patient.birth_date || '',
    coverageNumber: patient.coverageNumber || patient.coverage_number || '',
    emergencyContact: patient.emergencyContact || patient.emergency_contact || '',
  };

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isAddingMed, setIsAddingMed] = useState(false);
  const [activeDoctorId, setActiveDoctorId] = useState(null);

  const [editFormData, setEditFormData] = useState({
    name: normPatient.name || '',
    birthDate: normPatient.birthDate || '',
    dni: normPatient.dni || '',
    nhc: normPatient.nhc || '',
    coverage: normPatient.coverage || '',
    coverageNumber: normPatient.coverageNumber || '',
    plan: normPatient.plan || '',
    diagnosis: normPatient.diagnosis || '',
  });

  // Estados para Aclaratorias
  const [isAclaracion, setIsAclaracion] = useState(false);
  const [linkedNoteId, setLinkedNoteId] = useState(null);

  const [soapData, setSoapData] = useState({
    subjective: '',
    objective: '',
    analysis: '',
    plan: '',
  });

  const [medData, setMedData] = useState({
    drug: '',
    dose: '',
    frequency: '',
  });

  // Auto-detect logged-in doctor
  const loggedInDoctor = doctors.find(d => 
    (store.user?.doctor_id && Number(d.id) === Number(store.user.doctor_id)) ||
    (d.name === store.user?.name)
  );

  useState(() => {
    if (loggedInDoctor) setActiveDoctorId(loggedInDoctor.id);
    else if (doctors.length > 0) setActiveDoctorId(doctors[0].id);
  }, [doctors, loggedInDoctor]);

  const handleSaveInfo = async () => {
    try {
      if (editFormData.name === '') return toast.error('El nombre es requerido');
      const dataToSave = { ...editFormData };
      if (dataToSave.birthDate === '') dataToSave.birthDate = null;
      
      await store.updatePatient(patient.id, dataToSave);
      setIsEditingInfo(false);
      toast.success('Ficha médica actualizada');
    } catch (err) {
      console.error('Error updating patient:', err);
      toast.error('Error al actualizar datos');
    }
  };

  const handleSaveNote = async () => {
    if (!soapData.subjective && !soapData.objective && !soapData.analysis && !soapData.plan) {
      return toast.error('Debes completar al menos un campo del reporte');
    }
    
    try {
      const doc = doctors.find(d => Number(d.id) === Number(activeDoctorId));
      await store.addHistoryEntry(patient.id, {
        ...soapData,
        doctorId: activeDoctorId,
        doctorName: doc?.name || 'Profesional',
        isAclaracion: isAclaracion ? 1 : 0,
        linkedToId: linkedNoteId
      });
      setIsAddingNote(false);
      setIsAclaracion(false);
      setLinkedNoteId(null);
      setSoapData({ subjective: '', objective: '', analysis: '', plan: '' });
      toast.success(isAclaracion ? 'Aclaratoria registrada' : 'Evolución guardada con éxito');
    } catch (err) {
      console.error('Error saving note:', err);
      toast.error('Error al guardar reporte clínico');
    }
  };

  const handleSaveMedication = async () => {
    if (!medData.drug || !medData.dose) return toast.error('Medicamento y Dosis son obligatorios');
    try {
      await store.addMedication(patient.id, medData);
      setIsAddingMed(false);
      setMedData({ drug: '', dose: '', frequency: '' });
      toast.success('Medicación recetada con éxito');
    } catch (err) {
      toast.error('Error al registrar medicación');
    }
  };

  const handleSuspendMedication = async (medId) => {
    if (!confirm('¿Deseas suspender esta medicación?')) return;
    try {
      await store.suspendMedication(patient.id, medId);
      toast.success('Medicación suspendida');
    } catch (err) {
      toast.error('Error al suspender medicación');
    }
  };

  // 1. Filtrar turnos de este paciente
  const patientAppointments = allAppointments.filter(app => 
    Number(app.patientId) === Number(patient.id) || 
    (app.patient === patient.name && app.dni === patient.dni)
  );

  // 2. Crear una línea de tiempo unificada
  const timeline = [
    ...activeHistory.map(h => ({ 
      ...h, 
      timelineType: 'clinical_note', 
      sortDate: new Date(h.date || h.created_at) // Usar created_at si date no existe
    })),
    ...patientAppointments.map(app => ({ 
      ...app, 
      timelineType: 'appointment', 
      sortDate: new Date(`${app.date}T${app.time || '00:00'}`) 
    }))
  ].sort((a, b) => b.sortDate - a.sortDate);

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-8rem)] animate-fade-in-quick">
        {/* CABECERA CLÍNICA */}
        <div className="glass-effect p-5 rounded-3xl shadow-[var(--glass-shadow)] border border-[var(--glass-border)] shrink-0 mb-6 relative overflow-hidden flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--accent-light)] rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

          <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
            <button
              onClick={onBack}
              className="p-3 bg-[var(--bg-main)] hover:bg-[var(--accent-light)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] rounded-2xl transition-colors shrink-0 outline-none border border-[var(--border-color)]"
              aria-label="Volver a la lista de pacientes"
            >
              <ChevronRight size={24} className="rotate-180" />
            </button>
            <div className="w-14 h-14 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-hover)] border border-[var(--glass-border)] rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shrink-0">
              {normPatient?.name?.charAt(0) || '?'}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-[var(--text-primary)] leading-none tracking-tight">{normPatient.name}</h2>
                <span className="px-2.5 py-0.5 bg-[var(--accent-light)] text-[var(--accent-primary)] text-[10px] uppercase font-black tracking-wider rounded border border-[var(--border-color)] shadow-sm">
                  {normPatient.nhc || "NHC N/D"}
                </span>
              </div>
              <p className="text-sm font-semibold text-[var(--text-secondary)] mt-1 flex items-center gap-2 tracking-wide opacity-80">
                DNI {normPatient.dni || "S/D"} • <span className="text-[var(--text-primary)] font-bold">{calculateAge(normPatient.birthDate) ?? 'N/D'} Años</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <button
              onClick={() => setIsAddingNote(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-primary)] text-white rounded-xl font-black text-xs transition-all shadow-lg hover:bg-[var(--accent-hover)] hover:-translate-y-0.5"
            >
              <FileText size={14} />
              Nueva Evolución
            </button>

            <button
              onClick={() => setIsEditingInfo(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)] rounded-xl font-black text-xs transition-all shadow-sm group"
            >
              <Pencil size={14} className="group-hover:rotate-12 transition-transform" />
              Editar Ficha
            </button>
            
            <div className="w-px h-8 bg-[var(--border-color)] mx-1 hidden md:block opacity-50"></div>

            <div className="w-full md:w-64 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-3 flex flex-col justify-center min-h-[4rem]">
              <div className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1 pl-1 opacity-70">
                Diagnóstico Principal
              </div>
              <div className="px-1 text-sm font-bold text-[var(--text-primary)] break-words line-clamp-2">
                {patient.diagnosis || <span className="text-[var(--text-secondary)] italic opacity-40">No especificado</span>}
              </div>
            </div>
          </div>
        </div>

        {/* CUERPO: Alergias + Historia + Medicación */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-y-auto custom-scrollbar">
          {/* LATERAL IZQUIERDO: Alertas */}
          <div className="w-full lg:w-72 shrink-0 space-y-4">
            <AllergyCard patient={patient} />

            <div className="card-premium p-5 space-y-1 border border-[var(--glass-border)]">
              <div className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-3 flex items-center gap-1.5 opacity-70">
                <HeartPulse size={14} /> Cobertura y OS
              </div>
              <div className="font-black text-lg text-[var(--text-primary)] tracking-tight">{patient.coverage}</div>
              {patient.coverageNumber && (
                <div className="font-bold text-xs mt-1 text-[var(--text-secondary)] font-mono tracking-wider opacity-80">
                  {patient.coverageNumber} {patient.plan && `• ${patient.plan}`}
                </div>
              )}
            </div>

            <div className="card-premium p-5 space-y-1 border border-[var(--glass-border)]">
              <div className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-3 flex items-center gap-1.5 opacity-70">
                <AlertCircle size={14} /> Contacto de Emergencia
              </div>
              <div className="bg-[var(--bg-main)] px-3 py-2.5 rounded-xl font-black text-sm text-[var(--text-primary)] border border-[var(--border-color)] flex items-center gap-2 shadow-sm">
                {patient.emergencyContact || "No especificado"}
              </div>
            </div>
          </div>

          {/* CUERPO CENTRAL */}
          <div className="flex-1 space-y-6 min-h-0">
            <div className="card-premium border border-[var(--glass-border)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] flex items-center gap-2">
                <Calendar size={18} className="text-[var(--accent-primary)]" />
                <h3 className="font-black text-[var(--text-primary)] uppercase text-xs tracking-widest">Línea de Tiempo Cronológica</h3>
                <span className="text-[10px] font-black text-[var(--text-secondary)] ml-auto opacity-70">
                  {timeline.length} evento{timeline.length !== 1 ? 's' : ''}
                </span>
              </div>

              {timeline.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <FileText size={48} className="mx-auto mb-4 text-slate-200" />
                  <p className="font-bold text-slate-600">Sin historial registrado</p>
                  <p className="text-sm mt-1">Aquí aparecerán todas las visitas y evoluciones médicas.</p>
                </div>
              ) : (
                <div className="p-6 relative">
                  <div className="absolute left-9 top-8 bottom-8 w-px bg-slate-100 pointer-events-none"></div>
                  <div className="space-y-8">
                    {timeline.map((item, idx) => {
                      if (item.timelineType === 'clinical_note') {
                        return (
                          <div key={`note-${item.id || idx}`} className="relative pl-12">
                            <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-indigo-600 border-4 border-white shadow-sm z-10 flex items-center justify-center">
                              <FileText size={10} className="text-white" />
                            </div>
                            <div className="card-premium border border-[var(--border-color)]/50 p-5 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-full bg-[var(--bg-main)] text-[var(--accent-primary)] flex items-center justify-center font-black text-xs border border-[var(--border-color)]">
                                  {item.doctorName?.split(' ').map(w => w[0]).slice(0, 2).join('') || 'DR'}
                                </div>
                                <div>
                                  <p className="text-sm font-black text-[var(--text-primary)]">Evolución Médica — {item.doctorName}</p>
                                  <p className="text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-wider">{formatDateTime(item.date || item.created_at)}</p>
                                </div>
                                <div className="ml-auto flex items-center gap-2">
                                  {item.isAclaracion ? (
                                    <span className="px-2 py-0.5 bg-[var(--accent-light)] text-[var(--accent-primary)] text-[10px] font-bold uppercase rounded-full border border-[var(--border-color)]">Aclaración</span>
                                  ) : (
                                    <button 
                                      onClick={() => {
                                        setLinkedNoteId(item.id);
                                        setIsAclaracion(true);
                                        setIsAddingNote(true);
                                      }}
                                      className="flex items-center gap-1.5 px-3 py-1 bg-[var(--bg-main)] hover:bg-[var(--accent-light)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] rounded-lg text-[10px] font-black uppercase transition-all border border-[var(--border-color)]"
                                      title="Añadir aclaratoria legal"
                                    >
                                      <Plus size={12} /> Aclarar
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {item.subjective && <div className="bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]/50">
                                  <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1.5 opacity-60">S (Subjetivo)</p>
                                  <p className="text-sm text-[var(--text-primary)] leading-relaxed font-medium">{item.subjective}</p>
                                </div>}
                                {item.objective && <div className="bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]/50">
                                  <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1.5 opacity-60">O (Objetivo)</p>
                                  <p className="text-sm text-[var(--text-primary)] leading-relaxed font-medium">{item.objective}</p>
                                </div>}
                                {item.analysis && <div className="bg-[var(--accent-light)] rounded-xl p-4 border border-[var(--accent-primary)]/20">
                                  <p className="text-[9px] font-black text-[var(--accent-primary)] uppercase tracking-widest mb-1.5">A (Análisis)</p>
                                  <p className="text-sm text-[var(--text-primary)] leading-relaxed font-medium">{item.analysis}</p>
                                </div>}
                                {item.plan && <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/10">
                                  <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1.5">P (Plan)</p>
                                  <p className="text-sm text-[var(--text-primary)] leading-relaxed font-medium">{item.plan}</p>
                                </div>}
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        const doctor = doctors.find(d => d.id === item.doctorId);
                        return (
                          <div key={`app-${item.id || idx}`} className="relative pl-12">
                            <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-slate-200 border-4 border-white shadow-sm z-10 flex items-center justify-center">
                              <Clock size={10} className="text-slate-500" />
                            </div>
                            <div className="bg-[var(--bg-card)] border border-[var(--border-color)]/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] shadow-sm shrink-0">
                                  <Calendar size={20} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">Turno Programado</p>
                                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded border ${
                                      item.attendance === 'finalizado' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                      item.attendance === 'ausente' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                                      'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]'
                                    }`}>
                                      {item.attendance === 'finalizado' ? 'Asistió' : item.attendance === 'ausente' ? 'No Asistió' : 'Pendiente'}
                                    </span>
                                  </div>
                                  <p className="text-xs font-bold text-[var(--text-secondary)] mt-0.5 opacity-70">
                                    {formatDate(item.date)} a las {item.time}hs con <span className="text-[var(--accent-primary)] font-black">{doctor?.name || 'Profesional'}</span>
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase rounded-lg border ${
                                  item.paymentStatus === 'pagado' ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg' :
                                  item.paymentStatus === 'senado' ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-lg' :
                                  'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]'
                                }`}>
                                  <Wallet size={12} /> {item.paymentStatus === 'pagado' ? 'ABONADO' : item.paymentStatus === 'senado' ? 'SEÑADO' : 'PENDIENTE'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              )}
            </div>
            
            <div className="card-premium border border-[var(--glass-border)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HeartPulse size={18} className="text-[var(--accent-primary)]" />
                  <h3 className="font-black text-[var(--text-primary)] uppercase text-xs tracking-widest">Medicación Activa</h3>
                </div>
                <button 
                  onClick={() => setIsAddingMed(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent-primary)] text-white rounded-lg text-[10px] font-black uppercase hover:bg-[var(--accent-hover)] transition-colors shadow-lg"
                >
                  <Plus size={12} /> Nueva Indicación
                </button>
              </div>
              <div className="p-4 space-y-3">
                {activeMedications.length === 0 ? (
                  <div className="p-8 text-center text-[var(--text-secondary)] opacity-50">
                    <p className="text-sm font-bold">Sin medicación activa registrada.</p>
                  </div>
                ) : (
                  activeMedications.map(med => (
                    <div key={med.id} className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-4 flex items-center justify-between group hover:border-[var(--accent-primary)]/30 hover:bg-[var(--accent-light)] transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[var(--bg-card)] flex items-center justify-center text-lg border border-[var(--border-color)]">💊</div>
                        <div>
                          <div className="font-black text-[var(--text-primary)]">{med.drug} <span className="text-[var(--accent-primary)]">{med.dose}</span></div>
                          <div className="text-xs font-bold text-[var(--text-secondary)] opacity-70">{med.frequency}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleSuspendMedication(med.id)}
                        className="p-2.5 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-red-500/20"
                        title="Suspender Medicación"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE NUEVA EVOLUCIÓN (SOAP) */}
      {isAddingNote && (
        <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in-quick">
          <div className="bg-[var(--bg-card)] rounded-[2.5rem] w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] border border-[var(--glass-border)]">
            <div className="p-8 border-b border-[var(--border-color)] flex items-center justify-between shrink-0 bg-[var(--bg-sidebar)]">
              <div>
                <h3 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-3"><FileText className="text-[var(--accent-primary)]" /> Registro de Sesión (SOAP)</h3>
                <p className="text-sm font-bold text-[var(--text-secondary)] mt-1 opacity-70">Ingresa el reporte clínico de la consulta actual.</p>
              </div>
              <button onClick={() => setIsAddingNote(false)} className="p-3 hover:bg-[var(--bg-main)] rounded-2xl text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors"><X size={24} /></button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar bg-[var(--bg-card)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-wider pl-1 flex items-center gap-2 opacity-70">
                    <span className="w-5 h-5 rounded bg-sky-500/10 text-[var(--accent-primary)] flex items-center justify-center font-black border border-sky-500/20">S</span> Subjetivo
                  </label>
                  <textarea 
                    value={soapData.subjective} 
                    onChange={e => setSoapData({...soapData, subjective: e.target.value})}
                    placeholder="Lo que el paciente refiere, síntomas, motivo de consulta..." 
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-medium text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none h-32 resize-none transition-all placeholder:text-[var(--text-secondary)]/30"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-wider pl-1 flex items-center gap-2 opacity-70">
                    <span className="w-5 h-5 rounded bg-amber-500/10 text-amber-500 flex items-center justify-center font-black border border-amber-500/20">O</span> Objetivo
                  </label>
                  <textarea 
                    value={soapData.objective} 
                    onChange={e => setSoapData({...soapData, objective: e.target.value})}
                    placeholder="Observaciones clínicas, signos físicos, estado mental..." 
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-medium text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none h-32 resize-none transition-all placeholder:text-[var(--text-secondary)]/30"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-wider pl-1 flex items-center gap-2 opacity-70">
                    <span className="w-5 h-5 rounded bg-purple-500/10 text-purple-500 flex items-center justify-center font-black border border-purple-500/20">A</span> Análisis
                  </label>
                  <textarea 
                    value={soapData.analysis} 
                    onChange={e => setSoapData({...soapData, analysis: e.target.value})}
                    placeholder="Impresión diagnóstica, evolución del cuadro..." 
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-medium text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none h-32 resize-none transition-all placeholder:text-[var(--text-secondary)]/30"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-wider pl-1 flex items-center gap-2 opacity-70">
                    <span className="w-5 h-5 rounded bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black border border-emerald-500/20">P</span> Plan
                  </label>
                  <textarea 
                    value={soapData.plan} 
                    onChange={e => setSoapData({...soapData, plan: e.target.value})}
                    placeholder="Tratamiento, medicación, derivaciones, próxima cita..." 
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-medium text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none h-32 resize-none transition-all placeholder:text-[var(--text-secondary)]/30"
                  />
                </div>
              </div>

              <div className="mt-8 p-6 bg-[var(--bg-main)] rounded-3xl border border-[var(--border-color)] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent-primary)] shadow-md">
                    <User size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-70">Profesional Responsable</p>
                    <select 
                      value={activeDoctorId} 
                      onChange={e => setActiveDoctorId(e.target.value)}
                      className="bg-transparent font-black text-[var(--text-primary)] outline-none cursor-pointer hover:text-[var(--accent-primary)] transition-colors"
                    >
                      {doctors.map(d => (
                        <option key={d.id} value={d.id} className="bg-[var(--bg-card)]">{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-70">Fecha del Registro</p>
                  <p className="font-black text-[var(--text-primary)]">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)] flex gap-4 shrink-0">
              <button 
                onClick={() => setIsAddingNote(false)} 
                className="flex-1 py-4 text-sm font-black text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveNote} 
                className="flex-[2] bg-[var(--accent-primary)] text-white font-black py-4 rounded-3xl shadow-xl hover:bg-[var(--accent-hover)] transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} /> Sellar y Guardar Reporte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN DE DATOS BÁSICOS */}
      {isEditingInfo && (
        <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in-quick">
          <div className="bg-[var(--bg-card)] rounded-[2.5rem] w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] border border-[var(--glass-border)]">
            <div className="p-8 border-b border-[var(--border-color)] flex items-center justify-between shrink-0 bg-[var(--bg-sidebar)]">
              <h3 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-3"><Pencil className="text-[var(--accent-primary)]" /> Editar Ficha Médica</h3>
              <button onClick={() => setIsEditingInfo(false)} className="p-3 hover:bg-[var(--bg-main)] rounded-2xl text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors"><X size={24} /></button>
            </div>
            <div className="p-8 overflow-y-auto custom-scrollbar space-y-6 bg-[var(--bg-card)]">
              <div className="grid grid-cols-2 gap-6">
                <Input label="Nombre Completo" value={editFormData.name} onChange={v => setEditFormData({...editFormData, name: v})} />
                <Input label="Fecha de Nacimiento" type="date" value={editFormData.birthDate} onChange={v => setEditFormData({...editFormData, birthDate: v})} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <Input label="DNI" value={editFormData.dni} onChange={v => setEditFormData({...editFormData, dni: v})} />
                <Input label="NHC" value={editFormData.nhc} disabled />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input label="Cobertura" value={editFormData.coverage} onChange={v => setEditFormData({...editFormData, coverage: v})} />
                <Input label="N° Carnet" value={editFormData.coverageNumber} onChange={v => setEditFormData({...editFormData, coverageNumber: v})} />
                <Input label="Plan" value={editFormData.plan} onChange={v => setEditFormData({...editFormData, plan: v})} />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-wider pl-1 opacity-70">Diagnóstico Principal</label>
                <textarea value={editFormData.diagnosis} onChange={e => setEditFormData({...editFormData, diagnosis: e.target.value})} rows="2" className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none transition-all resize-none placeholder:text-[var(--text-secondary)]/30" />
              </div>
            </div>
            <div className="p-8 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)] flex gap-4 shrink-0">
              <button onClick={() => setIsEditingInfo(false)} className="flex-1 py-4 text-sm font-black text-[var(--text-secondary)]">Cancelar</button>
              <button onClick={handleSaveInfo} className="flex-[2] bg-[var(--accent-primary)] text-white font-black py-4 rounded-3xl shadow-xl hover:bg-[var(--accent-hover)] transition-all flex items-center justify-center gap-2"><Save size={18} /> Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE NUEVA MEDICACIÓN */}
      {isAddingMed && (
        <div className="fixed inset-0 bg-slate-900/40 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in-quick">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3"><HeartPulse className="text-indigo-600" /> Recetar Medicamentox</h3>
              <button onClick={() => setIsAddingMed(false)} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 transition-colors"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6">
              <Input label="Fármaco / Droga" value={medData.drug} onChange={v => setMedData({...medData, drug: v})} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Dosis (Ej: 500mg)" value={medData.dose} onChange={v => setMedData({...medData, dose: v})} />
                <Input label="Frecuencia (Ej: Cada 8hs)" value={medData.frequency} onChange={v => setMedData({...medData, frequency: v})} />
              </div>
            </div>
            <div className="p-8 border-t border-slate-100 bg-slate-50 flex gap-4 shrink-0">
              <button onClick={() => setIsAddingMed(false)} className="flex-1 py-4 text-sm font-black text-slate-400">Cancelar</button>
              <button onClick={handleSaveMedication} className="flex-[2] bg-indigo-600 text-white font-black py-4 rounded-3xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"><Plus size={18} /> Confirmar Receta</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Input({ label, value, onChange, type = "text", disabled = false }) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-wider pl-1 opacity-70">{label}</label>
      <input 
        type={type} 
        value={value} 
        disabled={disabled} 
        onChange={e => onChange?.(e.target.value)} 
        className={`w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-light)] outline-none transition-all ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`} 
      />
    </div>
  );
}

function AllergyCard({ patient }) {
  return (
    <div className="card-premium p-5 space-y-3 relative overflow-hidden border border-[var(--glass-border)]">
      <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl opacity-60 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      <h3 className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-1.5 relative z-10 opacity-70">
        <ShieldAlert size={14} className="text-red-500" /> Alertas Clínicas
      </h3>
      <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl shadow-sm relative z-10">
        <div className="text-red-500 font-bold text-[10px] uppercase tracking-wider mb-1 opacity-80">Alergias Conocidas</div>
        <p className="text-sm font-black text-red-600 leading-snug">
          {patient.allergies ? patient.allergies : <span className="text-red-500/40 font-medium">Sin alergias declaradas.</span>}
        </p>
      </div>
    </div>
  );
}

function MedicationList({ medications }) {
  if (!medications || medications.length === 0) return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden p-8 text-center text-slate-400">
      <HeartPulse size={48} className="mx-auto mb-4 text-slate-200" />
      <p className="font-bold text-slate-600">Sin medicación activa</p>
    </div>
  );
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
        <HeartPulse size={18} className="text-indigo-500" />
        <h3 className="font-bold text-slate-800">Medicación Activa</h3>
      </div>
      <div className="p-4 space-y-3">
        {medications.map(med => (
          <div key={med.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 text-lg">💊</div>
              <div>
                <div className="font-extrabold text-slate-800">{med.drug} <span className="text-indigo-600">{med.dose}</span></div>
                <div className="text-xs font-bold text-slate-500">{med.frequency}</div>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase rounded-full">Activa</span>
          </div>
        ))}
      </div>
    </div>
  );
}
