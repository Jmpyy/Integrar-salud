import { useState, useRef, useEffect } from 'react';
import { ShieldAlert, HeartPulse, AlertCircle, FileText, ChevronRight, Calendar, User, Wallet, CheckCircle2, Clock, Pencil, X, Save, Plus, Trash2, Download, Smartphone, File, Trash, Activity, RefreshCw } from 'lucide-react';
import { calculateAge, formatDateTime, formatDate } from '../../utils/helpers';
import { useStore } from '../../stores/useStore';
import { patientsService } from '../../services/patients';
import { medicationsService } from '../../services/medications';
import toast from 'react-hot-toast';
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog';

// Lista de medicamentos psicotrópicos comunes en Argentina
const FARMACOS_AR = [
  'Alprazolam','Aripiprazol','Atomoxetina','Biperideno','Bupropión','Carbamazepina',
  'Citalopram','Clomipramine','Clonazepam','Clozapina','Desvenlafaxina','Diazepam',
  'Duloxetina','Escitalopram','Fluoxetina','Fluvoxamina','Gabapentina','Haloperidol',
  'Ibuprofeno','Ketamina','Lamotrigina','Levetiracetam','Litio','Lorazepam','Metilfenidato',
  'Mirtazapina','Modafinilo','Naltrexona','Olanzapina','Oxcarbazepina','Paliperidona',
  'Paroxetina','Pregabalina','Quetiapina','Risperidona','Sertralina','Topiramato',
  'Trazodona','Valproato','Venlafaxina','Ziprasidona','Zolpidem','Amitriptilina',
  'Bromazepam','Buspirona','Clordiacepóxido','Flufenazina','Imipramine','Levomepromazina',
  'Litio carbonato','Lorazepam','Nortriptilina','Pimozide','Sulpiride','Tioridazina','Amisulpride'
];

/**
 * Componente compartido para ver la historia clínica de un paciente.
 */
export default function PatientHistoryViewer({
  patient,
  onBack,
  showEditActions = false,
}) {
  const store = useStore();
  const doctors = store.doctors || [];
  const allAppointments = store.appointments || [];

  // Fuente de verdad: buscar el paciente en el store global para tener reactividad
  const storePatient = store.patients.find(p => p.id === patient?.id) || patient;

  const activeHistory = storePatient?.history || [];
  const activeMedications = (storePatient?.medications || []).filter(m => Number(m.active) !== 0);

  // Helper para normalizar el objeto de paciente
  const normPatient = {
    ...storePatient,
    birthDate: storePatient.birthDate || storePatient.birth_date || '',
    coverageNumber: storePatient.coverageNumber || storePatient.coverage_number || '',
    emergencyContact: storePatient.emergencyContact || storePatient.emergency_contact || '',
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
    phone: normPatient.phone || '',
    email: normPatient.email || '',
    address: normPatient.address || '',
    emergencyContact: normPatient.emergencyContact || '',
    allergies: normPatient.allergies || '',
  });

  const [isAclaracion, setIsAclaracion] = useState(false);
  const [linkedNoteId, setLinkedNoteId] = useState(null);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);

  const [soapData, setSoapData] = useState({
    subjective: '',
    objective: '',
    analysis: '',
    plan: '',
    date: new Date().toISOString().split('T')[0] + 'T' + new Date().toTimeString().slice(0,5),
  });
  // Secciones libres adicionales: [{ title, content }]
  const [extraSections, setExtraSections] = useState([]);
  const [confirmConfig, setConfirmConfig] = useState({ 
    open: false, 
    title: '', 
    message: '', 
    onConfirm: null, 
    type: 'danger' 
  });
  const [activeTab, setActiveTab] = useState('history'); // 'history' o 'files'

  const [medData, setMedData] = useState({
    drug: '',
    dose: '',
    frequency: '',
  });
  const [availableDoses, setAvailableDoses] = useState([]);

  // Auto-detect logged-in doctor
  const loggedInDoctor = doctors.find(d => 
    (store.user?.doctor_id && Number(d.id) === Number(store.user.doctor_id)) ||
    (d.name === store.user?.name)
  );

  // 1. Efecto para inicializar el médico activo (solo una vez o cuando cambie la lista de médicos)
  useEffect(() => {
    if (!activeDoctorId) {
      if (loggedInDoctor) setActiveDoctorId(loggedInDoctor.id);
      else if (doctors.length > 0) setActiveDoctorId(doctors[0].id);
    }
  }, [doctors, loggedInDoctor, activeDoctorId]);

  // 2. Efecto para cargar archivos (solo cuando cambie el ID del paciente)
  useEffect(() => {
    if (patient?.id) {
      store.fetchFiles(patient.id);
    }
  }, [patient?.id]);

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
    const hasContent = soapData.subjective || soapData.objective || soapData.analysis || soapData.plan || extraSections.some(s => s.content);
    if (!hasContent) {
      return toast.error('Debes completar al menos un campo del reporte');
    }
    
    try {
      const doc = doctors.find(d => Number(d.id) === Number(activeDoctorId));
      const extraText = extraSections
        .filter(s => s.title || s.content)
        .map(s => `[${s.title || 'Nota'}]: ${s.content}`)
        .join('\n');
      
      const payload = {
        subjective: soapData.subjective,
        objective: soapData.objective + (extraText ? (soapData.objective ? '\n\n' + extraText : extraText) : ''),
        analysis: soapData.analysis,
        plan: soapData.plan,
        doctorId: activeDoctorId,
        doctorName: doc?.name || 'Profesional',
        isAclaracion: isAclaracion ? 1 : 0,
        linkedToId: linkedNoteId || null,
        date: soapData.date
      };

      if (isEditingNote && editingNoteId) {
        await store.updateHistoryEntry(patient.id, editingNoteId, payload);
        toast.success('Evolución actualizada');
      } else {
        await store.addHistoryEntry(patient.id, payload);
        toast.success(isAclaracion ? 'Aclaratoria registrada' : 'Evolución guardada con éxito');
      }

      setIsAddingNote(false);
      setIsAclaracion(false);
      setIsEditingNote(false);
      setEditingNoteId(null);
      setLinkedNoteId(null);
      setSoapData({ subjective: '', objective: '', analysis: '', plan: '', date: new Date().toISOString().split('T')[0] + 'T' + new Date().toTimeString().slice(0,5) });
      setExtraSections([]);
    } catch (err) {
      console.error('Error saving note:', err);
      toast.error('Error al guardar reporte clínico: ' + (err?.response?.data?.message || err.message || 'Error desconocido'));
    }
  };

  const handleDeleteNote = (entryId) => {
    setConfirmConfig({
      open: true,
      title: 'Eliminar Evolución',
      message: '¿Estás seguro de eliminar esta evolución médica? Esta acción no se puede deshacer.',
      type: 'danger',
      onConfirm: async () => {
        try {
          await store.deleteHistoryEntry(patient.id, entryId);
          toast.success('Entrada eliminada');
          setConfirmConfig(prev => ({ ...prev, open: false }));
        } catch (err) {
          toast.error('Error al eliminar');
        }
      }
    });
  };



  const handleEditNote = (note) => {
    setSoapData({
      subjective: note.subjective || '',
      objective: note.objective || '',
      analysis: note.analysis || '',
      plan: note.plan || '',
      date: note.date ? note.date.replace(' ', 'T').slice(0, 16) : new Date(note.created_at).toISOString().replace('Z', '').slice(0, 16)
    });
    setActiveDoctorId(note.doctor_id);
    setEditingNoteId(note.id);
    setIsEditingNote(true);
    setIsAddingNote(true);
    setIsAclaracion(note.is_aclaracion);
  };

  const handleSaveMedication = async () => {
    if (!medData.drug || !medData.dose) return toast.error('Medicamento y Dosis son obligatorios');
    try {
      await store.addMedication(patient.id, medData);
      // Refrescar el paciente completo desde el servidor para que aparezca la medicación sin recargar
      const freshPatient = await patientsService.getById(patient.id);
      if (freshPatient) {
        store.updatePatient(patient.id, freshPatient);
        // Actualizar el objeto local que se está mostrando
        if (freshPatient.medications) {
          patient.medications = freshPatient.medications;
        }
      }
      setIsAddingMed(false);
      setMedData({ drug: '', dose: '', frequency: '' });
      setAvailableDoses([]);
      toast.success('Medicación recetada con éxito');
    } catch (err) {
      console.error(err);
      toast.error('Error al registrar medicación');
    }
  };

  const handleSuspendMedication = (medId) => {
    setConfirmConfig({
      open: true,
      title: 'Suspender Medicación',
      message: '¿Deseas suspender esta medicación para el paciente?',
      type: 'warning',
      onConfirm: async () => {
        try {
          await store.suspendMedication(patient.id, medId);
          toast.success('Medicación suspendida');
          setConfirmConfig(prev => ({ ...prev, open: false }));
        } catch (err) {
          toast.error('Error al suspender');
        }
      }
    });
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
        <div className="glass-effect p-4 sm:p-5 rounded-3xl shadow-[var(--glass-shadow)] border border-[var(--glass-border)] shrink-0 mb-4 sm:mb-6 relative overflow-hidden flex flex-col md:flex-row gap-4 sm:gap-6 items-start md:items-center justify-between">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--accent-light)] rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

          <div className="flex items-center gap-3 sm:gap-4 relative z-10 w-full md:w-auto">
            <button
              onClick={onBack}
              className="p-2.5 sm:p-3 bg-[var(--bg-main)] hover:bg-[var(--accent-light)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] rounded-2xl transition-colors shrink-0 outline-none border border-[var(--border-color)]"
              aria-label="Volver a la lista de pacientes"
            >
              <ChevronRight size={20} className="sm:w-6 sm:h-6 rotate-180" />
            </button>
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-hover)] border border-[var(--glass-border)] rounded-2xl flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-lg shrink-0">
              {normPatient?.name?.charAt(0) || '?'}
            </div>
            <div>
              <div className="flex items-center gap-2 sm:gap-3">
                <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] leading-none tracking-tight">{normPatient.name}</h2>
                <span className="px-2 py-0.5 bg-[var(--accent-light)] text-[var(--accent-primary)] text-[9px] sm:text-[10px] uppercase font-black tracking-wider rounded border border-[var(--border-color)] shadow-sm">
                  {normPatient.nhc || "NHC N/D"}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)] mt-1 flex items-center gap-2 tracking-wide opacity-80">
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
                {storePatient.diagnosis || <span className="text-[var(--text-secondary)] italic opacity-40">No especificado</span>}
              </div>
            </div>
          </div>
        </div>

        {/* --- NUEVO: PESTAÑAS DE NAVEGACIÓN INTERNA --- */}
        <div className="flex items-center gap-2 mb-6 bg-[var(--bg-sidebar)]/30 p-1.5 rounded-2xl border border-[var(--border-color)]/30 w-fit">
          <button 
            onClick={() => setActiveTab('history')} 
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-[var(--accent-primary)] text-white shadow-lg' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-light)]'}`}
          >
            Historial & SOAP
          </button>
          <button 
            onClick={() => setActiveTab('files')} 
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'files' ? 'bg-[var(--accent-primary)] text-white shadow-lg' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-light)]'}`}
          >
            Estudios y Archivos
            {store.patientFiles.length > 0 && <span className="bg-white/20 px-1.5 py-0.5 rounded-md text-[9px]">{store.patientFiles.length}</span>}
          </button>
        </div>

        {/* CUERPO: Alergias + Historia + Medicación */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-y-auto custom-scrollbar">
          {/* LATERAL IZQUIERDO: Alertas */}
          <div className="w-full lg:w-72 shrink-0 space-y-4">
            <AllergyCard patient={storePatient} />

            <div className="card-premium p-5 space-y-1 border border-[var(--glass-border)]">
              <div className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-3 flex items-center gap-1.5 opacity-70">
                <HeartPulse size={14} /> Cobertura y OS
              </div>
              <div className="font-black text-lg text-[var(--text-primary)] tracking-tight">{storePatient.coverage}</div>
              {(storePatient.coverage_number || storePatient.plan) && (
                <div className="font-bold text-xs mt-1 text-[var(--text-secondary)] font-mono tracking-wider opacity-80">
                  {storePatient.coverage_number} {storePatient.plan && `• ${storePatient.plan}`}
                </div>
              )}
            </div>

            <div className="card-premium p-5 space-y-1 border border-[var(--glass-border)]">
              <div className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-3 flex items-center gap-1.5 opacity-70">
                <AlertCircle size={14} /> Contacto de Emergencia
              </div>
              <div className="bg-[var(--bg-main)] px-3 py-2.5 rounded-xl font-black text-sm text-[var(--text-primary)] border border-[var(--border-color)] flex items-center gap-2 shadow-sm">
                {storePatient.emergency_contact || "No especificado"}
              </div>
            </div>
          </div>

          {/* COLUMNA CENTRAL DINÁMICA SEGÚN PESTAÑA */}
          <div className="flex-1 space-y-6 min-h-0">
            {activeTab === 'history' ? (
              <>
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
                                    <div className="ml-auto flex items-center gap-2 shrink-0">
                                      <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-sidebar)] rounded-xl border border-[var(--border-color)]">
                                        {item.isAclaracion ? (
                                          <span className="px-3 py-1.5 bg-[var(--accent-light)] text-[var(--accent-primary)] text-[10px] font-black uppercase rounded-lg border border-[var(--border-color)]/30">Aclaración</span>
                                        ) : (
                                          <button 
                                            onClick={() => {
                                              setLinkedNoteId(item.id);
                                              setIsAclaracion(true);
                                              setIsAddingNote(true);
                                              setSoapData(s => ({...s, date: new Date().toISOString().split('T')[0] + 'T' + new Date().toTimeString().slice(0,5)}));
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[var(--accent-light)] text-[var(--accent-primary)] rounded-lg text-[10px] font-black uppercase transition-all border border-[var(--border-color)] shadow-sm"
                                          >
                                            <Plus size={12} /> Aclarar
                                          </button>
                                        )}
                                        
                                        <button 
                                          onClick={() => handleEditNote(item)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 text-[var(--text-primary)] hover:bg-white rounded-lg transition-all border border-transparent hover:border-[var(--border-color)] group"
                                          title="Editar nota"
                                        >
                                          <Pencil size={14} className="text-[var(--accent-primary)]" />
                                          <span className="text-[9px] font-black uppercase tracking-tighter">Editar</span>
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteNote(item.id)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100 group"
                                          title="Borrar nota"
                                        >
                                          <Trash2 size={14} />
                                          <span className="text-[9px] font-black uppercase tracking-tighter">Borrar</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {item.subjective && (
                                      <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-200/60 shadow-sm hover:shadow-md transition-all group/soap">
                                        <div className="flex items-center gap-2 mb-3">
                                          <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-[10px] font-black border border-indigo-500/20">S</div>
                                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover/soap:text-indigo-600 transition-colors">Subjetivo</p>
                                        </div>
                                        <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{item.subjective}</p>
                                      </div>
                                    )}
                                    {item.objective && (
                                      <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-200/60 shadow-sm hover:shadow-md transition-all group/soap">
                                        <div className="flex items-center gap-2 mb-3">
                                          <div className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center text-[10px] font-black border border-purple-500/20">O</div>
                                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover/soap:text-purple-600 transition-colors">Objetivo</p>
                                        </div>
                                        <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{item.objective}</p>
                                      </div>
                                    )}
                                    {item.analysis && (
                                      <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100 shadow-sm hover:shadow-md transition-all group/soap">
                                        <div className="flex items-center gap-2 mb-3">
                                          <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">A</div>
                                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest group-hover/soap:text-indigo-600 transition-colors">Análisis Clínico</p>
                                        </div>
                                        <p className="text-sm text-slate-800 leading-relaxed font-bold whitespace-pre-wrap">{item.analysis}</p>
                                      </div>
                                    )}
                                    {item.plan && (
                                      <div className="bg-emerald-50/50 rounded-2xl p-5 border border-emerald-100 shadow-sm hover:shadow-md transition-all group/soap">
                                        <div className="flex items-center gap-2 mb-3">
                                          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">P</div>
                                          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest group-hover/soap:text-emerald-600 transition-colors">Plan Terapéutico</p>
                                        </div>
                                        <p className="text-sm text-slate-800 leading-relaxed font-bold whitespace-pre-wrap">{item.plan}</p>
                                      </div>
                                    )}
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
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">Turno Programado</p>
                                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded border ${
                                          item.attendance === 'finalizado' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                          item.attendance === 'ausente' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                                          'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]'
                                        }`}>
                                          {item.attendance === 'finalizado' ? 'Asistió' : item.attendance === 'ausente' ? 'No Asistió' : 'Pendiente'}
                                        </span>
                                        {item.title && (
                                          <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded border bg-purple-500/10 text-purple-600 border-purple-500/20">
                                            🧠 {item.title}
                                          </span>
                                        )}
                                        {item.type && !['psicologia', 'psicología', 'psiquiatria', 'psiquiatría'].includes(item.type.toLowerCase().trim()) && (
                                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded border flex items-center gap-1 ${
                                            item.type.toLowerCase().includes('virtual') ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' :
                                            item.type.toLowerCase().includes('domicilio') ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                            'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                          }`}>
                                            {item.type.toLowerCase().includes('virtual') ? '💻' : 
                                             item.type.toLowerCase().includes('domicilio') ? '🏠' : '🏥'} {item.type}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs font-bold text-[var(--text-secondary)] mt-0.5 opacity-70">
                                        {formatDate(item.date)} a las {item.time}hs con <span className="text-[var(--accent-primary)] font-black">{doctor?.name || 'Profesional'}</span>
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase rounded-lg border ${
                                      item.paymentStatus === 'pagado' ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg' :
                                      item.paymentStatus === 'señado' ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-lg' :
                                      'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]'
                                    }`}>
                                      <Wallet size={12} /> {item.paymentStatus === 'pagado' ? 'ABONADO' : item.paymentStatus === 'señado' ? 'SEÑADO' : 'PENDIENTE'}
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
              </>
            ) : (
              <FileSection patientId={patient.id} />
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE NUEVA EVOLUCIÓN (SOAP) */}
      {isAddingNote && (
        <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in-quick">
          <div className="bg-[var(--bg-card)] rounded-[2.5rem] w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] border border-[var(--glass-border)]">
            <div className="p-8 border-b border-[var(--border-color)] flex items-center justify-between shrink-0 bg-[var(--bg-sidebar)]">
              <div>
                <h3 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-3">
                  <FileText className="text-[var(--accent-primary)]" /> 
                  {isEditingNote ? 'Editar Reporte Clínico' : (isAclaracion ? 'Nueva Aclaratoria Legal' : 'Registro de Sesión (SOAP)')}
                </h3>
                <p className="text-sm font-bold text-[var(--text-secondary)] mt-1 opacity-70">
                  {isEditingNote ? 'Modifica la información registrada anteriormente.' : 'Ingresa el reporte clínico de la consulta actual.'}
                </p>
              </div>
              <button onClick={() => { setIsAddingNote(false); setIsEditingNote(false); setEditingNoteId(null); }} className="p-3 hover:bg-[var(--bg-main)] rounded-2xl text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors"><X size={24} /></button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar bg-[var(--bg-card)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-wider pl-1 flex items-center gap-2 opacity-70">
                    <span className="w-5 h-5 rounded bg-sky-500/10 text-[var(--accent-primary)] flex items-center justify-center font-black border border-sky-500/20">S</span> Subjetivo
                  </label>
                  <textarea id="subjective" name="subjective" 
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
                  <textarea id="objective" name="objective" 
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
                  <textarea id="analysis" name="analysis" 
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
                  <textarea id="plan" name="plan" 
                    value={soapData.plan} 
                    onChange={e => setSoapData({...soapData, plan: e.target.value})}
                    placeholder="Tratamiento, medicación, derivaciones, próxima cita..." 
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-medium text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none h-32 resize-none transition-all placeholder:text-[var(--text-secondary)]/30"
                  />
                </div>
              </div>

              {/* SECCIONES PERSONALIZADAS */}
              {extraSections.map((sec, idx) => (
                <div key={idx} className="space-y-2 mt-4">
                  <div className="flex items-center gap-2">
                    <input id="title" name="title"
                      type="text"
                      placeholder="Nombre de la categoría (ej: Seguimiento, Interconsulta)..."
                      value={sec.title}
                      onChange={e => setExtraSections(prev => prev.map((s, i) => i === idx ? { ...s, title: e.target.value } : s))}
                      className="flex-1 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm font-black text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none transition-all uppercase tracking-wide"
                    />
                    <button
                      onClick={() => setExtraSections(prev => prev.filter((_, i) => i !== idx))}
                      className="p-2 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <textarea id="content" name="content"
                    value={sec.content}
                    onChange={e => setExtraSections(prev => prev.map((s, i) => i === idx ? { ...s, content: e.target.value } : s))}
                    placeholder="Escribe el contenido de esta sección..."
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-medium text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none h-24 resize-none transition-all placeholder:text-[var(--text-secondary)]/30"
                  />
                </div>
              ))}
              <button
                onClick={() => setExtraSections(prev => [...prev, { title: '', content: '' }])}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[var(--border-color)] hover:border-[var(--accent-primary)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
              >
                <Plus size={14} /> Agregar Sección
              </button>

              <div className="mt-8 p-6 bg-[var(--bg-main)] rounded-3xl border border-[var(--border-color)] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent-primary)] shadow-md">
                    <User size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-70">Profesional Responsable</p>
                    <select id="activeDoctorId" name="activeDoctorId" 
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
                <div className="text-right flex flex-col items-end gap-2">
                  <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-70">Fecha y Hora del Registro</p>
                  <input id="date" name="date"
                    type="datetime-local"
                    value={soapData.date}
                    onChange={e => setSoapData({...soapData, date: e.target.value})}
                    className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm font-black text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none transition-all"
                  />
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
              <div className="grid grid-cols-2 gap-6">
                <Input label="Teléfono" value={editFormData.phone} onChange={v => setEditFormData({...editFormData, phone: v})} />
                <Input label="Email" value={editFormData.email} onChange={v => setEditFormData({...editFormData, email: v})} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <Input label="Dirección" value={editFormData.address} onChange={v => setEditFormData({...editFormData, address: v})} />
                <Input label="Contacto de Emergencia" value={editFormData.emergencyContact} onChange={v => setEditFormData({...editFormData, emergencyContact: v})} />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-wider pl-1 opacity-70">Alergias</label>
                <textarea id="allergies" name="allergies" 
                  value={editFormData.allergies} 
                  onChange={e => setEditFormData({...editFormData, allergies: e.target.value})} 
                  rows="2" 
                  placeholder="Ej: Penicilina, látex..."
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none transition-all resize-none placeholder:text-[var(--text-secondary)]/30" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-wider pl-1 opacity-70">Diagnóstico Principal</label>
                <textarea id="diagnosis" name="diagnosis" value={editFormData.diagnosis} onChange={e => setEditFormData({...editFormData, diagnosis: e.target.value})} rows="2" className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none transition-all resize-none placeholder:text-[var(--text-secondary)]/30" />
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
        <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in-quick">
          <div className="bg-[var(--bg-card)] rounded-[2.5rem] w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col border border-[var(--glass-border)]">
            <div className="p-8 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] flex items-center justify-between shrink-0">
              <h3 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-3"><HeartPulse className="text-[var(--accent-primary)]" /> Recetar Medicamento</h3>
              <button onClick={() => setIsAddingMed(false)} className="p-3 hover:bg-[var(--bg-main)] rounded-2xl text-[var(--text-secondary)] transition-colors"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6 bg-[var(--bg-card)]">
              <DrugAutocomplete
                value={medData.drug}
                onChange={v => setMedData({...medData, drug: v})}
                onSelectMed={med => {
                  setMedData({...medData, drug: med.name});
                  if (med.doses) {
                    setAvailableDoses(med.doses.split(/[,|-]/).map(d => d.trim()).filter(Boolean));
                  } else {
                    setAvailableDoses([]);
                  }
                }}
              />
              <div className="grid grid-cols-2 gap-4 relative">
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <label className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-wider pl-1 opacity-70">Dosis (Ej: 500mg)</label>
                  <input id="dose" name="dose" 
                    type="text"
                    value={medData.dose} 
                    onChange={e => setMedData({...medData, dose: e.target.value})}
                    placeholder="Escribí o seleccioná la dosis"
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-light)] outline-none transition-all placeholder:text-[var(--text-secondary)]/30"
                  />
                  {availableDoses.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {availableDoses.map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setMedData({...medData, dose: d})}
                          className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg border transition-all ${medData.dose === d ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-md' : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]'}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <label className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-wider pl-1 opacity-70">Frecuencia (Ej: Cada 8hs)</label>
                  <input id="frequency" name="frequency" 
                    type="text"
                    value={medData.frequency} 
                    onChange={e => setMedData({...medData, frequency: e.target.value})}
                    placeholder="Ej: Cada 8hs"
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-light)] outline-none transition-all placeholder:text-[var(--text-secondary)]/30"
                  />
                </div>
              </div>
            </div>
            <div className="p-8 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)] flex gap-4 shrink-0">
              <button onClick={() => setIsAddingMed(false)} className="flex-1 py-4 text-sm font-black text-[var(--text-secondary)]">Cancelar</button>
              <button onClick={handleSaveMedication} className="flex-[2] bg-[var(--accent-primary)] text-white font-black py-4 rounded-3xl shadow-xl hover:bg-[var(--accent-hover)] transition-all flex items-center justify-center gap-2"><Plus size={18} /> Confirmar Receta</button>
            </div>
          </div>
        </div>
      )}

      {/* DIÁLOGO DE CONFIRMACIÓN PROFESIONAL */}
      <ConfirmDialog
        isOpen={confirmConfig.open}
        onClose={() => setConfirmConfig(prev => ({ ...prev, open: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText="Confirmar"
        cancelText="Cancelar"
        type={confirmConfig.type}
      />
    </>
  );
}

function FileSection({ patientId }) {
  const store = useStore();
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await store.uploadFile(patientId, file);
      toast.success('Archivo subido correctamente');
    } catch (err) {
      toast.error('Error al subir archivo: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = (fileId) => {
    setConfirmConfig({
      open: true,
      title: 'Eliminar Archivo',
      message: '¿Seguro que deseas eliminar este archivo adjunto? Esta acción no se puede deshacer.',
      type: 'danger',
      onConfirm: async () => {
        try {
          await store.deleteFile(patientId, fileId);
          toast.success('Archivo eliminado');
          setConfirmConfig(prev => ({ ...prev, open: false }));
        } catch (err) {
          toast.error('Error al eliminar');
        }
      }
    });
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 animate-fade-in-quick">
      <div className="card-premium p-8 border-dashed border-2 border-[var(--border-color)] flex flex-col items-center justify-center text-center gap-4 group hover:border-[var(--accent-primary)]/50 transition-all">
        <div className="w-16 h-16 bg-[var(--accent-light)] text-[var(--accent-primary)] rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
          {isUploading ? <RefreshCw className="animate-spin" size={32} /> : <File size={32} />}
        </div>
        <div>
          <h4 className="text-lg font-black text-[var(--text-primary)]">Subir Documentación Médica</h4>
          <p className="text-sm text-[var(--text-secondary)] font-medium mt-1">PDFs, Laboratorios, Radiografías o Imágenes (Máx 10MB)</p>
        </div>
        <input id="field_49363" name="field_49363" 
          type="file" 
          ref={fileInputRef}
          onChange={handleUpload}
          className="hidden" 
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="px-8 py-3 bg-[var(--accent-primary)] text-white font-black rounded-2xl shadow-lg hover:bg-[var(--accent-hover)] transition-all flex items-center gap-2"
        >
          {isUploading ? 'Subiendo...' : <><Plus size={18} /> Seleccionar Archivo</>}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {store.patientFiles.length === 0 ? (
          <div className="col-span-full py-12 text-center opacity-40">
            <p className="text-sm font-bold italic">No hay archivos adjuntos en esta ficha.</p>
          </div>
        ) : (
          store.patientFiles.map(file => (
            <div key={file.id} className="card-premium p-4 flex items-center justify-between group hover:border-[var(--accent-primary)]/30 transition-all">
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${file.type.includes('pdf') ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'}`}>
                  {file.type.includes('pdf') ? <FileText size={20} /> : <File size={20} />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--text-primary)] truncate" title={file.name}>{file.name}</p>
                  <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-tighter opacity-60">
                    {formatSize(file.size)} • {new Date(file.date).toLocaleDateString('es-AR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => window.open(`${import.meta.env.VITE_API_URL}/../../uploads/${file.path || file.file_path}`, '_blank')}
                  className="p-2 text-[var(--accent-primary)] hover:bg-[var(--accent-light)] rounded-lg transition-colors"
                  title="Ver / Descargar"
                >
                  <Download size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(file.id)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Eliminar"
                >
                  <Trash size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", disabled = false }) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-wider pl-1 opacity-70">{label}</label>
      <input id="value" name="value" 
        type={type} 
        value={value} 
        disabled={disabled} 
        onChange={e => onChange?.(e.target.value)} 
        className={`w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-light)] outline-none transition-all ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`} 
      />
    </div>
  );
}

function DrugAutocomplete({ value, onChange, onSelectMed }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = async (v) => {
    onChange(v);
    if (v.length >= 1) {
      try {
        const meds = await medicationsService.getAll({ search: v });
        setSuggestions(meds.slice(0, 8));
        setOpen(meds.length > 0);
      } catch (err) {
        console.error("Error fetching drug suggestions", err);
      }
    } else {
      setOpen(false);
    }
  };

  return (
    <div className="space-y-2 relative" ref={ref}>
      <label className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-wider pl-1 opacity-70">Fármaco / Droga</label>
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--accent-primary)] transition-colors">
          <HeartPulse size={18} />
        </div>
        <input id="value" name="value"
          type="text"
          value={value}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => value.length >= 1 && setOpen(suggestions.length > 0)}
          placeholder="Escribí el nombre del medicamento..."
          className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl pl-12 pr-5 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-light)] outline-none transition-all placeholder:text-[var(--text-secondary)]/30"
          autoComplete="off"
        />
      </div>
      {open && (
        <ul className="absolute z-[130] w-full bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-2xl shadow-2xl overflow-hidden mt-2 max-h-60 overflow-y-auto animate-fade-in-quick backdrop-blur-xl">
          <div className="px-4 py-2 bg-[var(--bg-sidebar)]/50 border-b border-[var(--border-color)]/30 text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Sugerencias encontradas</div>
          {suggestions.map(s => (
            <li
              key={s.id}
              onMouseDown={() => { onChange(s.name); onSelectMed?.(s); setOpen(false); }}
              className="px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--accent-light)] hover:text-[var(--accent-primary)] cursor-pointer transition-all flex items-center gap-3 border-b border-[var(--border-color)]/20 last:border-0"
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-main)] flex items-center justify-center text-xs shadow-sm">💊</div>
              {s.name}
            </li>
          ))}
        </ul>
      )}
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
