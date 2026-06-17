import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldAlert, HeartPulse, AlertCircle, FileText, ChevronRight,
  Calendar, User, Wallet, CheckCircle2, Clock, Pencil, X, Save,
  Plus, Trash2, Download, File, Trash, Activity, RefreshCw
} from 'lucide-react';
import { calculateAge, formatDateTime, formatDate } from '../../utils/helpers';
import { useStore } from '../../stores/useStore';
import { patientsService } from '../../services/patients';
import { medicationsService } from '../../services/medications';
import toast from 'react-hot-toast';
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog';
import SignatureModal from '../SignatureModal';
import { generateMedicalDocumentPDF } from '../../utils/pdfGenerator';

export default function PatientHistoryViewer({ patient, onBack, initialAction, initialDate }) {
  const store = useStore();
  const doctors = store.doctors || [];
  const allAppointments = store.appointments || [];
  const storePatient = store.patients.find(p => p.id === patient?.id) || patient;

  const loggedInDoctor = doctors.find(d =>
    (store.user?.doctor_id && Number(d.id) === Number(store.user.doctor_id)) ||
    (d.name === store.user?.name)
  );

  const activeHistory = storePatient?.history || [];
  const activeMedications = (storePatient?.medications || []).filter(m => Number(m.active) !== 0);

  const normPatient = {
    ...storePatient,
    birthDate: storePatient.birthDate || storePatient.birth_date || '',
    coverageNumber: storePatient.coverageNumber || storePatient.coverage_number || '',
    emergencyContact: storePatient.emergencyContact || storePatient.emergency_contact || '',
  };

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isAddingMed, setIsAddingMed] = useState(false);
  const [activeDoctorId, setActiveDoctorId] = useState(() => {
    if (loggedInDoctor) return loggedInDoctor.id;
    if (doctors.length > 0) return doctors[0].id;
    return null;
  });

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
    date: new Date().toISOString().slice(0, 16) // Formato correcto: "2026-06-16T22:00"
  });

  useEffect(() => {
    if (initialAction === 'add_evolution') {
      setIsAddingNote(true);
      if (initialDate) setSoapData(prev => ({ ...prev, date: initialDate }));
      setTimeout(() => document.getElementById('subjective')?.focus(), 100);
    }
  }, [initialAction, initialDate]);

  const [extraSections, setExtraSections] = useState([]);
  const [confirmConfig, setConfirmConfig] = useState({
    open: false, title: '', message: '', onConfirm: null, type: 'danger'
  });
  const [activeTab, setActiveTab] = useState('history');
  const [medData, setMedData] = useState({ drug: '', dose: '', frequency: '' });
  const [availableDoses, setAvailableDoses] = useState([]);

  const [docType, setDocType] = useState('Receta Médica');
  const [docContent, setDocContent] = useState('');
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [patientSignatureUrl, setPatientSignatureUrl] = useState(null);

  const handleTemplateSelect = (type) => {
    setDocType(type);
    setPatientSignatureUrl(null);
    if (type === 'Receta Médica') setDocContent('');
    else if (type === 'Certificado Médico') {
      setDocContent(`Certifico que el paciente ${storePatient.name || ''}${storePatient.dni ? `, DNI ${storePatient.dni}` : ''}, ha sido atendido en el día de la fecha en este centro médico, y se le indica reposo por el término de ___ horas/días a partir de la fecha.\n\nDiagnóstico: ${storePatient.diagnosis || '________________'}`);
    } else if (type === 'Consentimiento Informado') {
      setDocContent(`Por la presente presto mi libre y voluntario consentimiento para que el/la profesional tratante realice el procedimiento/tratamiento médico propuesto.\n\nSe me ha explicado de forma clara y comprensible la naturaleza y propósito del mismo, así como sus posibles riesgos, beneficios y alternativas disponibles.\n\nHe tenido la oportunidad de formular preguntas y todas han sido respondidas a mi entera satisfacción. Por lo tanto, AUTORIZO la realización del procedimiento.`);
    }
  };

  const handleGenerateDocument = async () => {
    return toast.error('Próximamente: La generación de documentos digitales requiere integración oficial con el sistema de Firma Digital gubernamental.', { duration: 6000, icon: '🔒' });
  };

  useEffect(() => {
    if (patient?.id) store.fetchFiles(patient.id);
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
    if (!hasContent) return toast.error('Debes completar al menos un campo del reporte');

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
      setSoapData({
        subjective: '', objective: '', analysis: '', plan: '',
        date: new Date().toISOString().split('T')[0] + 'T' + new Date().toTimeString().slice(0, 5)
      });
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
        } catch {
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
      date: note.date
        ? note.date.replace(' ', 'T').slice(0, 16)
        : new Date(note.created_at).toISOString().replace('Z', '').slice(0, 16)
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
      const freshPatient = await patientsService.getById(patient.id);
      if (freshPatient) store.updatePatient(patient.id, freshPatient);
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
        } catch {
          toast.error('Error al suspender medicación');
        }
      }
    });
  };

  const patientAppointments = allAppointments.filter(app =>
    Number(app.patientId) === Number(patient.id) ||
    (app.patient === patient.name && app.dni === patient.dni)
  );

  const timeline = [
    ...activeHistory.map(h => ({
      ...h,
      timelineType: 'clinical_note',
      sortDate: new Date(h.date || h.created_at)
    })),
    ...patientAppointments.map(app => ({
      ...app,
      timelineType: 'appointment',
      sortDate: new Date(`${app.date}T${app.time || '00:00'}`)
    }))
  ].sort((a, b) => b.sortDate - a.sortDate);

  const tabs = [
    { id: 'history', label: 'Historial & SOAP', icon: Calendar },
    { id: 'files', label: 'Estudios y Archivos', icon: File, badge: store.patientFiles?.length },
    { id: 'docs', label: 'Documentos Médicos', icon: FileText, accent: true },
  ];

  return (
    <>
      <div className="flex flex-col h-full animate-fade-in-quick pb-24 md:pb-0">
        {/* ═══ CABECERA CLÍNICA ═══ */}
        <div className="glass-effect p-4 sm:p-6 md:rounded-[32px] border-b md:border border-[var(--glass-border)] shrink-0 mb-0 md:mb-6 relative flex flex-col md:flex-row gap-4 sm:gap-6 items-start md:items-center justify-between shadow-[var(--glass-shadow)] overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--accent-primary)] rounded-full blur-[120px] opacity-[0.07] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

          <div className="flex items-center gap-3 sm:gap-5 relative z-10 w-full md:w-auto">
            <button
              onClick={onBack}
              className="p-2.5 sm:p-3 bg-[var(--bg-main)] hover:bg-[var(--accent-light)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] rounded-xl sm:rounded-2xl transition-all shrink-0 outline-none border border-[var(--border-color)]"
              aria-label="Volver a la lista de pacientes"
            >
              <ChevronRight size={20} className="sm:w-6 sm:h-6 rotate-180" />
            </button>

            <div className="w-11 h-11 sm:w-16 sm:h-16 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-hover)] border border-[var(--accent-primary)]/20 rounded-xl sm:rounded-2xl flex items-center justify-center text-white font-black text-lg sm:text-3xl shadow-lg shadow-[var(--accent-primary)]/20 shrink-0">
              {normPatient?.name?.charAt(0) || '?'}
            </div>

            <div className="space-y-0.5 sm:space-y-1">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h2 className="text-lg sm:text-3xl font-black text-[var(--text-primary)] leading-none tracking-tight">
                  {normPatient.name}
                </h2>
                <span className="px-2 py-0.5 bg-[var(--accent-light)] text-[var(--accent-primary)] text-[9px] sm:text-[10px] uppercase font-black tracking-[0.15em] rounded-md border border-[var(--accent-primary)]/20 hidden sm:inline-block">
                  {normPatient.nhc || 'NHC N/D'}
                </span>
              </div>
              <p className="text-[11px] sm:text-[13px] font-medium text-[var(--text-secondary)] flex items-center gap-1.5 sm:gap-2 tracking-wide mt-1 sm:mt-1.5">
                DNI {normPatient.dni || 'S/D'}
                <span className="w-1 h-1 rounded-full bg-[var(--border-color)] hidden sm:inline-block" />
                <span className="text-[var(--text-primary)] font-bold">{calculateAge(normPatient.birthDate) ?? 'N/A'} Años</span>
              </p>
            </div>
          </div>

          {/* ACCIONES - DESKTOP */}
          <div className="hidden md:flex flex-wrap md:flex-nowrap items-center gap-3 relative z-10 w-full md:w-auto mt-2 md:mt-0">
            <button
              onClick={() => setIsAddingNote(true)}
              className="flex-1 md:flex-none justify-center flex items-center gap-2 px-6 py-3 bg-[var(--accent-primary)] text-white rounded-xl font-bold text-[13px] transition-all shadow-lg shadow-[var(--accent-primary)]/20 hover:bg-[var(--accent-hover)] hover:-translate-y-0.5 active:scale-95 whitespace-nowrap"
            >
              <FileText size={16} />
              Nueva Evolución
            </button>

            <button
              onClick={() => setIsEditingInfo(true)}
              className="flex-1 md:flex-none justify-center flex items-center gap-2 px-5 py-3 bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-primary)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]/40 rounded-xl font-bold text-[13px] transition-all group active:scale-95 whitespace-nowrap"
            >
              <Pencil size={14} className="group-hover:-translate-y-0.5 transition-transform" />
              Editar Ficha
            </button>

            <div className="w-px h-10 bg-[var(--border-color)] mx-1 hidden lg:block" />

            <div className="w-full lg:w-64 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-3.5 flex flex-col justify-center min-h-[4.5rem] shadow-sm shrink-0">
              <div className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.15em] mb-1 pl-1 opacity-70">
                Diagnóstico Principal
              </div>
              <div className="px-1 text-sm font-semibold text-[var(--text-primary)] break-words line-clamp-2">
                {storePatient.diagnosis || <span className="text-[var(--text-secondary)] italic opacity-60">No especificado</span>}
              </div>
            </div>
          </div>
        </div>

        {/* ACCIONES - MOBILE */}
        <div className="md:hidden flex flex-wrap items-center gap-3 py-4 px-1 shrink-0">
          <button
            onClick={() => setIsAddingNote(true)}
            className="flex-1 justify-center flex items-center gap-2 px-4 py-3 bg-[var(--accent-primary)] text-white rounded-xl font-bold text-[13px] shadow-lg shadow-[var(--accent-primary)]/20 active:scale-95 whitespace-nowrap"
          >
            <FileText size={16} />
            Nueva Evolución
          </button>

          <button
            onClick={() => setIsEditingInfo(true)}
            className="flex-1 justify-center flex items-center gap-2 px-4 py-3 bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl font-bold text-[13px] active:scale-95 whitespace-nowrap"
          >
            <Pencil size={14} />
            Editar Ficha
          </button>

          <div className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-3.5 flex flex-col justify-center min-h-[4rem] shadow-sm mt-1">
            <div className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.15em] mb-1 pl-1 opacity-70">
              Diagnóstico Principal
            </div>
            <div className="px-1 text-sm font-semibold text-[var(--text-primary)] break-words line-clamp-2">
              {storePatient.diagnosis || <span className="text-[var(--text-secondary)] italic opacity-60">No especificado</span>}
            </div>
          </div>
        </div>

        {/* ═══ PESTAÑAS ═══ */}
        <div className="flex items-center gap-1 mb-6 bg-[var(--bg-card)] p-1.5 rounded-2xl border border-[var(--border-color)]/50 w-fit shadow-sm overflow-x-auto hide-scrollbar">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 sm:px-6 py-2.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-[0.08em] transition-all flex items-center gap-2 whitespace-nowrap
                  ${isActive
                    ? (tab.accent
                      ? 'bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/25'
                      : 'bg-[var(--bg-main)] text-[var(--text-primary)] border border-[var(--border-color)] shadow-sm')
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-light)]'
                  }`}
              >
                <Icon size={14} />
                {tab.label}
                {tab.badge > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black
                    ${isActive ? 'bg-white/20 text-white' : 'bg-[var(--accent-light)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/20'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ═══ CUERPO PRINCIPAL ═══ */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          {/* LATERAL IZQUIERDO */}
          <div className="w-full lg:w-72 shrink-0 space-y-4">
            <AllergyCard patient={storePatient} />

            <div className="card-premium p-5 space-y-2">
              <div className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.15em] mb-3 flex items-center gap-2 opacity-80">
                <HeartPulse size={14} className="text-emerald-500" /> Cobertura y OS
              </div>
              <div className="font-black text-xl text-[var(--text-primary)] tracking-tight">
                {storePatient.coverage || <span className="text-[var(--text-secondary)] opacity-50 text-base">No especificada</span>}
              </div>
              {(storePatient.coverage_number || storePatient.plan) && (
                <div className="font-mono font-bold text-[13px] text-[var(--text-secondary)] tracking-wider">
                  {storePatient.coverage_number} {storePatient.plan && <span className="text-[var(--text-secondary)] opacity-60"> / {storePatient.plan}</span>}
                </div>
              )}
            </div>

            <div className="card-premium p-5 space-y-2">
              <div className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.15em] mb-3 flex items-center gap-2 opacity-80">
                <AlertCircle size={14} className="text-rose-500" /> Contacto de Emergencia
              </div>
              <div className="bg-[var(--bg-main)] px-4 py-3 rounded-xl font-semibold text-[13px] text-[var(--text-primary)] border border-[var(--border-color)] flex items-center gap-2 shadow-sm">
                {storePatient.emergency_contact || <span className="text-[var(--text-secondary)] opacity-50 italic">No especificado</span>}
              </div>
            </div>
          </div>

          {/* COLUMNA CENTRAL */}
          <div className="flex-1 space-y-6 min-h-0">
            {activeTab === 'docs' ? (
              <div className="card-premium overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--border-color)]/40 bg-[var(--bg-sidebar)]/50 flex items-center gap-2">
                  <FileText size={18} className="text-[var(--accent-primary)]" />
                  <h3 className="font-black text-[var(--text-primary)] uppercase text-[11px] tracking-[0.15em]">Recetas y Consentimientos</h3>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex flex-wrap gap-3">
                    {['Receta Médica', 'Certificado Médico', 'Consentimiento Informado'].map(type => (
                      <button
                        key={type}
                        onClick={() => handleTemplateSelect(type)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border
                          ${docType === type
                            ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-lg shadow-[var(--accent-primary)]/25'
                            : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--accent-primary)]/40 hover:text-[var(--text-primary)]'
                          }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest pl-1 opacity-80">
                      Contenido del Documento
                    </label>
                    <textarea
                      value={docContent}
                      onChange={(e) => setDocContent(e.target.value)}
                      placeholder={`Escriba aquí el contenido para su ${docType.toLowerCase()}...`}
                      className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-4 text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-light)] transition-all resize-y min-h-[200px] placeholder:text-[var(--text-secondary)]/40"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]/40">
                    {docType === 'Consentimiento Informado' && !patientSignatureUrl && (
                      <button
                        onClick={() => setIsSignatureModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-purple-500/10 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 border border-purple-500/25 hover:border-purple-500/40 rounded-xl font-bold text-[13px] transition-all"
                      >
                        <Pencil size={16} />
                        Solicitar Firma Digital
                      </button>
                    )}
                    {patientSignatureUrl && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 rounded-xl text-[13px] font-bold">
                        <CheckCircle2 size={16} /> Firma Capturada
                      </div>
                    )}
                    <button
                      onClick={handleGenerateDocument}
                      className="flex items-center gap-2 px-6 py-2.5 bg-[var(--accent-primary)] text-white rounded-xl font-bold text-[13px] hover:bg-[var(--accent-hover)] shadow-lg shadow-[var(--accent-primary)]/25 transition-all active:scale-95"
                    >
                      <Download size={16} />
                      Generar PDF
                    </button>
                  </div>
                </div>
              </div>
            ) : activeTab === 'history' ? (
              <>
                {/* TIMELINE */}
                <div className="card-premium overflow-hidden">
                  <div className="px-6 py-4 border-b border-[var(--border-color)]/40 bg-[var(--bg-sidebar)]/50 flex items-center gap-2">
                    <Calendar size={18} className="text-[var(--accent-primary)]" />
                    <h3 className="font-black text-[var(--text-primary)] uppercase text-[11px] tracking-[0.15em]">Línea de Tiempo Cronológica</h3>
                    <span className="text-[10px] font-black text-[var(--text-secondary)] ml-auto uppercase tracking-widest opacity-70 bg-[var(--bg-main)] px-2.5 py-1 rounded-md border border-[var(--border-color)]/40">
                      {timeline.length} evento{timeline.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {timeline.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)]/40 flex items-center justify-center">
                        <FileText size={36} className="text-[var(--text-secondary)] opacity-30" />
                      </div>
                      <p className="font-bold text-[var(--text-primary)] opacity-80">Sin historial registrado</p>
                      <p className="text-[13px] font-medium mt-1 text-[var(--text-secondary)] opacity-70">Aquí aparecerán todas las visitas y evoluciones médicas.</p>
                    </div>
                  ) : (
                    <div className="p-6 sm:p-8 relative">
                      <div className="absolute left-[38px] sm:left-[46px] top-8 bottom-8 w-px border-l-2 border-dashed border-[var(--border-color)] pointer-events-none" />
                      <div className="space-y-8">
                        {timeline.map((item, idx) => {
                          if (item.timelineType === 'clinical_note') {
                            return (
                              <div key={`note-${item.id || idx}`} className="relative pl-10 sm:pl-12 group/timeline">
                                <div className="absolute left-[-2px] sm:left-0 top-0 w-8 h-8 rounded-full bg-[var(--bg-card)] border-4 border-[var(--bg-main)] shadow-[0_0_0_1px_var(--border-color)] z-10 flex items-center justify-center group-hover/timeline:scale-110 transition-transform">
                                  <FileText size={12} className="text-indigo-500 dark:text-indigo-400" />
                                </div>
                                <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm hover:border-[var(--accent-primary)]/30 hover:shadow-md transition-all">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 flex items-center justify-center font-black text-sm shrink-0">
                                        {item.doctorName?.split(' ').map(w => w[0]).slice(0, 2).join('') || 'DR'}
                                      </div>
                                      <div>
                                        <p className="text-sm font-black text-[var(--text-primary)]">
                                          Evolución Médica {item.doctorName && `— ${item.doctorName}`}
                                        </p>
                                        <p className="text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-wider">
                                          {formatDateTime(item.date || item.created_at)}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="w-full sm:w-auto overflow-x-auto hide-scrollbar">
                                      <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] w-max sm:w-auto">
                                        {item.isAclaracion ? (
                                          <span className="px-3 py-1.5 bg-[var(--accent-light)] text-[var(--accent-primary)] text-[10px] font-black uppercase rounded-lg border border-[var(--accent-primary)]/20">
                                            Aclaración
                                          </span>
                                        ) : (
                                          <button
                                            onClick={() => {
                                              setLinkedNoteId(item.id);
                                              setIsAclaracion(true);
                                              setIsAddingNote(true);
                                              setSoapData(s => ({ ...s, date: new Date().toISOString().split('T')[0] + 'T' + new Date().toTimeString().slice(0, 5) }));
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent-light)] hover:bg-[var(--accent-primary)] hover:text-white text-[var(--accent-primary)] rounded-lg text-[10px] font-black uppercase transition-all border border-[var(--accent-primary)]/20 shadow-sm shrink-0"
                                          >
                                            <Plus size={12} /> Aclarar
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleEditNote(item)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-main)] rounded-lg transition-all border border-transparent hover:border-[var(--border-color)] shrink-0"
                                          title="Editar nota"
                                        >
                                          <Pencil size={14} className="text-[var(--accent-primary)]" />
                                          <span className="text-[9px] font-black uppercase tracking-tighter hidden sm:inline">Editar</span>
                                        </button>
                                        <button
                                          onClick={() => handleDeleteNote(item.id)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/15 rounded-lg transition-all border border-transparent hover:border-red-500/20 shrink-0"
                                          title="Borrar nota"
                                        >
                                          <Trash2 size={14} />
                                          <span className="text-[9px] font-black uppercase tracking-tighter hidden sm:inline">Borrar</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {item.subjective && (
                                      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] hover:border-sky-500/30 transition-all group/soap">
                                        <div className="flex items-center gap-2 mb-3">
                                          <div className="w-6 h-6 rounded-lg bg-sky-500/10 dark:bg-sky-500/15 text-sky-500 dark:text-sky-400 flex items-center justify-center text-[10px] font-black border border-sky-500/20">S</div>
                                          <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.15em] group-hover/soap:text-sky-500 transition-colors">Subjetivo</p>
                                        </div>
                                        <p className="text-[13px] text-[var(--text-primary)] leading-relaxed font-medium whitespace-pre-wrap">{item.subjective}</p>
                                      </div>
                                    )}
                                    {item.objective && (
                                      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] hover:border-amber-500/30 transition-all group/soap">
                                        <div className="flex items-center gap-2 mb-3">
                                          <div className="w-6 h-6 rounded-lg bg-amber-500/10 dark:bg-amber-500/15 text-amber-500 dark:text-amber-400 flex items-center justify-center text-[10px] font-black border border-amber-500/20">O</div>
                                          <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.15em] group-hover/soap:text-amber-500 transition-colors">Objetivo</p>
                                        </div>
                                        <p className="text-[13px] text-[var(--text-primary)] leading-relaxed font-medium whitespace-pre-wrap">{item.objective}</p>
                                      </div>
                                    )}
                                    {item.analysis && (
                                      <div className="bg-indigo-500/5 dark:bg-indigo-500/10 rounded-xl p-4 border border-indigo-500/20 hover:border-indigo-500/40 transition-all group/soap">
                                        <div className="flex items-center gap-2 mb-3">
                                          <div className="w-6 h-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-[10px] font-black">A</div>
                                          <p className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.15em] group-hover/soap:text-indigo-600 dark:group-hover/soap:text-indigo-300 transition-colors">Análisis Clínico</p>
                                        </div>
                                        <p className="text-[13px] text-[var(--text-primary)] leading-relaxed font-bold whitespace-pre-wrap">{item.analysis}</p>
                                      </div>
                                    )}
                                    {item.plan && (
                                      <div className="bg-emerald-500/5 dark:bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20 hover:border-emerald-500/40 transition-all group/soap">
                                        <div className="flex items-center gap-2 mb-3">
                                          <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black">P</div>
                                          <p className="text-[10px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-[0.15em] group-hover/soap:text-emerald-600 dark:group-hover/soap:text-emerald-300 transition-colors">Plan Terapéutico</p>
                                        </div>
                                        <p className="text-[13px] text-[var(--text-primary)] leading-relaxed font-bold whitespace-pre-wrap">{item.plan}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          } else {
                            const doctor = doctors.find(d => d.id === item.doctorId);
                            return (
                              <div key={`app-${item.id || idx}`} className="relative pl-10 sm:pl-12 group/timeline">
                                <div className="absolute left-[-2px] sm:left-0 top-0 w-8 h-8 rounded-full bg-[var(--bg-card)] border-4 border-[var(--bg-main)] shadow-[0_0_0_1px_var(--border-color)] z-10 flex items-center justify-center group-hover/timeline:scale-110 transition-transform">
                                  <Clock size={12} className="text-[var(--text-secondary)]" />
                                </div>
                                <div className="bg-[var(--bg-main)] border border-[var(--border-color)] hover:border-[var(--accent-primary)]/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] shadow-sm shrink-0">
                                        <Calendar size={18} />
                                      </div>
                                      <div>
                                        <p className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">Turno Programado</p>
                                        <p className="text-xs font-bold text-[var(--text-secondary)] mt-0.5">
                                          {formatDate(item.date)} a las {item.time}hs con <span className="text-[var(--accent-primary)] font-black">{doctor?.name || 'Profesional'}</span>
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto mt-2 sm:mt-0">
                                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md border shrink-0
                                        ${item.attendance === 'finalizado' ? 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25' :
                                          item.attendance === 'ausente' ? 'bg-red-500/10 dark:bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25' :
                                            'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)]'
                                        }`}>
                                        {item.attendance === 'finalizado' ? 'Asistió' : item.attendance === 'ausente' ? 'No Asistió' : 'Pendiente'}
                                      </span>
                                      {item.title && (
                                        <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-md border bg-purple-500/10 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25 shrink-0">
                                          {item.title}
                                        </span>
                                      )}
                                      {(() => {
                                        const mod = (item.modalidad || item.type || 'Presencial').trim();
                                        if (['psicologia', 'psicología', 'psiquiatria', 'psiquiatría'].includes(mod.toLowerCase())) return null;
                                        
                                        const isVirtual = mod.toLowerCase().includes('virtual');
                                        const isDomicilio = mod.toLowerCase().includes('domicilio');
                                        
                                        return (
                                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md border flex items-center gap-1 shrink-0
                                            ${isVirtual ? 'bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/25' :
                                              isDomicilio ? 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25' :
                                                'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                                            }`}>
                                            {mod}
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 mt-2 sm:mt-0 shrink-0 sm:ml-auto w-full sm:w-auto">
                                    <span className={`flex items-center justify-center sm:justify-start gap-1.5 w-full sm:w-auto px-3 py-1.5 text-[10px] font-black uppercase rounded-lg border
                                      ${item.paymentStatus === 'pagado' ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/20' :
                                        item.paymentStatus === 'señado' ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-md shadow-[var(--accent-primary)]/20' :
                                          'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)]'
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

                {/* MEDICACIÓN ACTIVA */}
                <div className="card-premium overflow-hidden">
                  <div className="px-6 py-4 border-b border-[var(--border-color)]/40 bg-[var(--bg-sidebar)]/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HeartPulse size={18} className="text-rose-500" />
                      <h3 className="font-black text-[var(--text-primary)] uppercase text-[11px] tracking-[0.15em]">Medicación Activa</h3>
                    </div>
                    <button
                      onClick={() => setIsAddingMed(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent-primary)] text-white rounded-lg text-[10px] font-black uppercase hover:bg-[var(--accent-hover)] transition-colors shadow-md shadow-[var(--accent-primary)]/20"
                    >
                      <Plus size={12} /> Nueva Indicación
                    </button>
                  </div>
                  <div className="p-4 space-y-3">
                    {activeMedications.length === 0 ? (
                      <div className="p-8 text-center text-[var(--text-secondary)] opacity-50">
                        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)]/40 flex items-center justify-center">
                          <HeartPulse size={24} />
                        </div>
                        <p className="text-sm font-bold">Sin medicación activa registrada.</p>
                      </div>
                    ) : (
                      activeMedications.map(med => (
                        <div key={med.id} className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-4 flex items-center justify-between group hover:border-[var(--accent-primary)]/30 hover:bg-[var(--accent-light)]/50 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-[var(--bg-card)] flex items-center justify-center text-lg border border-[var(--border-color)]">💊</div>
                            <div>
                              <div className="font-black text-[var(--text-primary)]">
                                {med.drug} <span className="text-[var(--accent-primary)]">{med.dose}</span>
                              </div>
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
              <FileSection patientId={patient.id} setConfirmConfig={setConfirmConfig} />
            )}
          </div>
        </div>
      </div>

      {/* ═══ MODAL SOAP ═══ */}
      {isAddingNote && createPortal(
        <div className="fixed inset-0 bg-black/50 z-[1050] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in-quick">
          <div className="bg-[var(--bg-card)] rounded-3xl w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] border border-[var(--glass-border)]">
            <div className="p-6 sm:p-8 border-b border-[var(--border-color)] flex items-center justify-between shrink-0 bg-[var(--bg-sidebar)]">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] flex items-center gap-3">
                  <FileText className="text-[var(--accent-primary)]" />
                  {isEditingNote ? 'Editar Reporte Clínico' : (isAclaracion ? 'Nueva Aclaratoria Legal' : 'Registro de Sesión (SOAP)')}
                </h3>
                <p className="text-sm font-bold text-[var(--text-secondary)] mt-1 opacity-70">
                  {isEditingNote ? 'Modifica la información registrada anteriormente.' : 'Ingresa el reporte clínico de la consulta actual.'}
                </p>
              </div>
              <button onClick={() => { setIsAddingNote(false); setIsEditingNote(false); setEditingNoteId(null); }} className="p-3 hover:bg-[var(--bg-main)] rounded-2xl text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors">
                <X size={22} />
              </button>
            </div>

            <div className="p-5 sm:p-8 overflow-y-auto custom-scrollbar bg-[var(--bg-card)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {[
                  { key: 'subjective', label: 'Subjetivo', color: 'sky', placeholder: 'Lo que el paciente refiere, síntomas, motivo de consulta...' },
                  { key: 'objective', label: 'Objetivo', color: 'amber', placeholder: 'Observaciones clínicas, signos físicos, estado mental...' },
                  { key: 'analysis', label: 'Análisis', color: 'purple', placeholder: 'Impresión diagnóstica, evolución del cuadro...' },
                  { key: 'plan', label: 'Plan', color: 'emerald', placeholder: 'Tratamiento, medicación, derivaciones, próxima cita...' },
                ].map(field => {
                  const colorMap = {
                    sky: 'bg-sky-500/10 dark:bg-sky-500/15 text-sky-500 dark:text-sky-400 border-sky-500/20',
                    amber: 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/20',
                    purple: 'bg-purple-500/10 dark:bg-purple-500/15 text-purple-500 dark:text-purple-400 border-purple-500/20',
                    emerald: 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/20',
                  };
                  return (
                    <div key={field.key} className="space-y-2">
                      <label htmlFor={field.key} className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-wider pl-1 flex items-center gap-2 opacity-80">
                        <span className={`w-5 h-5 rounded flex items-center justify-center font-black border text-[10px] ${colorMap[field.color]}`}>
                          {field.label[0]}
                        </span>
                        {field.label}
                      </label>
                      <textarea
                        id={field.key}
                        name={field.key}
                        value={soapData[field.key]}
                        onChange={e => setSoapData({ ...soapData, [field.key]: e.target.value })}
                        placeholder={field.placeholder}
                        className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-medium text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-light)] outline-none h-32 resize-none transition-all placeholder:text-[var(--text-secondary)]/40"
                      />
                    </div>
                  );
                })}
              </div>

              {extraSections.map((sec, idx) => (
                <div key={idx} className="space-y-2 mt-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nombre de la categoría (ej: Seguimiento, Interconsulta)..."
                      value={sec.title}
                      onChange={e => setExtraSections(prev => prev.map((s, i) => i === idx ? { ...s, title: e.target.value } : s))}
                      className="flex-1 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm font-black text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none transition-all uppercase tracking-wide placeholder:normal-case placeholder:font-medium placeholder:normal-case placeholder:tracking-normal placeholder:text-[var(--text-secondary)]/50"
                    />
                    <button
                      onClick={() => setExtraSections(prev => prev.filter((_, i) => i !== idx))}
                      className="p-2 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <textarea
                    value={sec.content}
                    onChange={e => setExtraSections(prev => prev.map((s, i) => i === idx ? { ...s, content: e.target.value } : s))}
                    placeholder="Escribe el contenido de esta sección..."
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-medium text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none h-24 resize-none transition-all placeholder:text-[var(--text-secondary)]/40"
                  />
                </div>
              ))}
              <button
                onClick={() => setExtraSections(prev => [...prev, { title: '', content: '' }])}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[var(--border-color)] hover:border-[var(--accent-primary)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
              >
                <Plus size={14} /> Agregar Sección
              </button>

              <div className="mt-8 p-4 sm:p-6 bg-[var(--bg-main)] rounded-3xl border border-[var(--border-color)] flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full md:w-auto">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent-primary)] shadow-sm shrink-0">
                    <User size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label htmlFor="activeDoctorId" className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-70 mb-1">Profesional Responsable</label>
                    <select
                      id="activeDoctorId"
                      name="activeDoctorId"
                      value={activeDoctorId}
                      onChange={e => setActiveDoctorId(e.target.value)}
                      className="bg-transparent font-black text-[var(--text-primary)] outline-none cursor-pointer hover:text-[var(--accent-primary)] transition-colors w-full truncate"
                    >
                      {doctors.map(d => (
                        <option key={d.id} value={d.id} className="bg-[var(--bg-card)]">{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col md:items-end gap-2 w-full md:w-auto shrink-0">
                  <label htmlFor="date" className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-70">Fecha y Hora del Registro</label>
                  <input
                    id="date"
                    name="date"
                    type="datetime-local"
                    key={editingNoteId || 'new'}
                    defaultValue={soapData.date}
                    onChange={e => {
                      if (e.target.value) {
                        setSoapData(prev => ({ ...prev, date: e.target.value }));
                      }
                    }}
                    className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm font-black text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none transition-all w-full"
                  />
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-8 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)] flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 shrink-0">
              <button
                onClick={() => setIsAddingNote(false)}
                className="w-full sm:flex-1 py-4 text-sm font-black text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] rounded-2xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNote}
                className="w-full sm:flex-[2] bg-[var(--accent-primary)] text-white font-black py-4 rounded-2xl shadow-lg shadow-[var(--accent-primary)]/25 hover:bg-[var(--accent-hover)] transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <CheckCircle2 size={18} /> Sellar y Guardar Reporte
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ═══ MODAL EDITAR FICHA ═══ */}
      {isEditingInfo && createPortal(
        <div className="fixed inset-0 bg-black/50 z-[1050] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in-quick">
          <div className="bg-[var(--bg-card)] rounded-3xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] border border-[var(--glass-border)]">
            <div className="p-5 sm:p-8 border-b border-[var(--border-color)] flex items-center justify-between shrink-0 bg-[var(--bg-sidebar)]">
              <h3 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] flex items-center gap-3">
                <Pencil className="text-[var(--accent-primary)]" /> Editar Ficha Médica
              </h3>
              <button onClick={() => setIsEditingInfo(false)} className="p-3 hover:bg-[var(--bg-main)] rounded-2xl text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors">
                <X size={22} />
              </button>
            </div>
            <div className="p-5 sm:p-8 overflow-y-auto custom-scrollbar space-y-6 bg-[var(--bg-card)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <Input label="Nombre Completo" value={editFormData.name} onChange={v => setEditFormData({ ...editFormData, name: v })} />
                <Input label="Fecha de Nacimiento" type="date" value={editFormData.birthDate} onChange={v => setEditFormData({ ...editFormData, birthDate: v })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <Input label="DNI" value={editFormData.dni} onChange={v => setEditFormData({ ...editFormData, dni: v })} />
                <Input label="NHC" value={editFormData.nhc} disabled />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <Input label="Cobertura" value={editFormData.coverage} onChange={v => setEditFormData({ ...editFormData, coverage: v })} />
                <Input label="N° Carnet" value={editFormData.coverageNumber} onChange={v => setEditFormData({ ...editFormData, coverageNumber: v })} />
                <Input label="Plan" value={editFormData.plan} onChange={v => setEditFormData({ ...editFormData, plan: v })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <Input label="Teléfono" value={editFormData.phone} onChange={v => setEditFormData({ ...editFormData, phone: v })} />
                <Input label="Email" value={editFormData.email} onChange={v => setEditFormData({ ...editFormData, email: v })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <Input label="Dirección" value={editFormData.address} onChange={v => setEditFormData({ ...editFormData, address: v })} />
                <Input label="Contacto de Emergencia" value={editFormData.emergencyContact} onChange={v => setEditFormData({ ...editFormData, emergencyContact: v })} />
              </div>
              <div className="space-y-2">
                <label htmlFor="allergies" className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-wider pl-1 opacity-80">Alergias</label>
                <textarea
                  id="allergies"
                  name="allergies"
                  value={editFormData.allergies}
                  onChange={e => setEditFormData({ ...editFormData, allergies: e.target.value })}
                  rows="2"
                  placeholder="Ej: Penicilina, látex..."
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-light)] outline-none transition-all resize-none placeholder:text-[var(--text-secondary)]/40"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="diagnosis" className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-wider pl-1 opacity-80">Diagnóstico Principal</label>
                <textarea
                  id="diagnosis"
                  name="diagnosis"
                  value={editFormData.diagnosis}
                  onChange={e => setEditFormData({ ...editFormData, diagnosis: e.target.value })}
                  rows="2"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-light)] outline-none transition-all resize-none placeholder:text-[var(--text-secondary)]/40"
                />
              </div>
            </div>
            <div className="p-5 sm:p-8 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)] flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 shrink-0">
              <button onClick={() => setIsEditingInfo(false)} className="w-full sm:flex-1 py-4 text-sm font-black text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] rounded-2xl transition-colors">Cancelar</button>
              <button onClick={handleSaveInfo} className="w-full sm:flex-[2] bg-[var(--accent-primary)] text-white font-black py-4 rounded-2xl shadow-lg shadow-[var(--accent-primary)]/25 hover:bg-[var(--accent-hover)] transition-all flex items-center justify-center gap-2">
                <Save size={18} /> Guardar Cambios
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ═══ MODAL MEDICACIÓN ═══ */}
      {isAddingMed && createPortal(
        <div className="fixed inset-0 bg-black/50 z-[1050] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in-quick">
          <div className="bg-[var(--bg-card)] rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col border border-[var(--glass-border)]">
            <div className="p-5 sm:p-8 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] flex items-center justify-between shrink-0">
              <h3 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] flex items-center gap-3">
                <HeartPulse className="text-[var(--accent-primary)]" /> Recetar Medicamento
              </h3>
              <button onClick={() => setIsAddingMed(false)} className="p-3 hover:bg-[var(--bg-main)] rounded-2xl text-[var(--text-secondary)] transition-colors">
                <X size={22} />
              </button>
            </div>
            <div className="p-5 sm:p-8 space-y-6 bg-[var(--bg-card)]">
              <DrugAutocomplete
                value={medData.drug}
                onChange={v => setMedData({ ...medData, drug: v })}
                onSelectMed={med => {
                  setMedData({ ...medData, drug: med.name });
                  if (med.doses) {
                    setAvailableDoses(med.doses.split(/[,|-]/).map(d => d.trim()).filter(Boolean));
                  } else {
                    setAvailableDoses([]);
                  }
                }}
              />
              <div className="grid grid-cols-2 gap-4 relative">
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <label htmlFor="dose" className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-wider pl-1 opacity-80">Dosis (Ej: 500mg)</label>
                  <input
                    id="dose"
                    name="dose"
                    type="text"
                    value={medData.dose}
                    onChange={e => setMedData({ ...medData, dose: e.target.value })}
                    placeholder="Escribí o seleccioná la dosis"
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-light)] outline-none transition-all placeholder:text-[var(--text-secondary)]/40"
                  />
                  {availableDoses.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {availableDoses.map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setMedData({ ...medData, dose: d })}
                          className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg border transition-all
                            ${medData.dose === d
                              ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-md'
                              : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]'
                            }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <label htmlFor="frequency" className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-wider pl-1 opacity-80">Frecuencia (Ej: Cada 8hs)</label>
                  <input
                    id="frequency"
                    name="frequency"
                    type="text"
                    value={medData.frequency}
                    onChange={e => setMedData({ ...medData, frequency: e.target.value })}
                    placeholder="Ej: Cada 8hs"
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-light)] outline-none transition-all placeholder:text-[var(--text-secondary)]/40"
                  />
                </div>
              </div>
            </div>
            <div className="p-5 sm:p-8 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)] flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 shrink-0">
              <button onClick={() => setIsAddingMed(false)} className="w-full sm:flex-1 py-4 text-sm font-black text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] rounded-2xl transition-colors">Cancelar</button>
              <button onClick={handleSaveMedication} className="w-full sm:flex-[2] bg-[var(--accent-primary)] text-white font-black py-4 rounded-2xl shadow-lg shadow-[var(--accent-primary)]/25 hover:bg-[var(--accent-hover)] transition-all flex items-center justify-center gap-2">
                <Plus size={18} /> Confirmar Receta
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSave={(url) => {
          setPatientSignatureUrl(url);
          toast.success('Firma capturada con éxito');
        }}
      />

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

// ═══ FILE SECTION ═══
function FileSection({ patientId, setConfirmConfig }) {
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
        } catch {
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

  const handleDownloadFile = async (file) => {
    try {
      const blob = await store.downloadFile(patientId, file.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Error al descargar el archivo');
    }
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
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleUpload}
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="px-8 py-3 bg-[var(--accent-primary)] text-white font-black rounded-2xl shadow-lg shadow-[var(--accent-primary)]/25 hover:bg-[var(--accent-hover)] transition-all flex items-center gap-2 disabled:opacity-60"
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
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                  ${file.type.includes('pdf')
                    ? 'bg-rose-500/10 dark:bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/20'
                    : 'bg-blue-500/10 dark:bg-blue-500/15 text-blue-500 dark:text-blue-400 border border-blue-500/20'
                  }`}>
                  {file.type.includes('pdf') ? <FileText size={20} /> : <File size={20} />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--text-primary)] truncate" title={file.name}>{file.name}</p>
                  <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-tighter opacity-70">
                    {formatSize(file.size)} • {new Date(file.date).toLocaleDateString('es-AR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDownloadFile(file)}
                  className="p-2 text-[var(--accent-primary)] hover:bg-[var(--accent-light)] rounded-lg transition-colors"
                  title="Ver / Descargar"
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={() => handleDelete(file.id)}
                  className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
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

// ═══ INPUT COMPONENT ═══
function Input({ label, value, onChange, type = "text", disabled = false, id, name }) {
  const generatedId = id || name || label.replace(/\s+/g, '-').toLowerCase();
  const inputName = name || generatedId;
  return (
    <div className="space-y-2">
      <label htmlFor={generatedId} className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-wider pl-1 opacity-80">{label}</label>
      <input
        id={generatedId}
        name={inputName}
        type={type}
        value={value}
        disabled={disabled}
        onChange={e => onChange?.(e.target.value)}
        autoComplete="off"
        className={`w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-light)] outline-none transition-all
          ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      />
    </div>
  );
}

// ═══ DRUG AUTOCOMPLETE ═══
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
      <label htmlFor="drug" className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-wider pl-1 opacity-80">Fármaco / Droga</label>
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--accent-primary)] transition-colors">
          <HeartPulse size={18} />
        </div>
        <input
          id="drug"
          name="drug"
          type="text"
          value={value}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => value.length >= 1 && setOpen(suggestions.length > 0)}
          placeholder="Escribí el nombre del medicamento..."
          className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl pl-12 pr-5 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-light)] outline-none transition-all placeholder:text-[var(--text-secondary)]/40"
          autoComplete="off"
        />
      </div>
      {open && (
        <ul className="absolute z-[130] w-full bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-2xl shadow-2xl overflow-hidden mt-2 max-h-60 overflow-y-auto animate-fade-in-quick backdrop-blur-xl">
          <div className="px-4 py-2 bg-[var(--bg-sidebar)]/70 border-b border-[var(--border-color)]/40 text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">
            Sugerencias encontradas
          </div>
          {suggestions.map(s => (
            <li
              key={s.id}
              onMouseDown={() => { onChange(s.name); onSelectMed?.(s); setOpen(false); }}
              className="px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--accent-light)] hover:text-[var(--accent-primary)] cursor-pointer transition-all flex items-center gap-3 border-b border-[var(--border-color)]/20 last:border-0"
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-main)] flex items-center justify-center text-xs shadow-sm border border-[var(--border-color)]">💊</div>
              {s.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ═══ ALLERGY CARD ═══
function AllergyCard({ patient }) {
  const hasAllergies = !!patient.allergies;
  return (
    <div className="card-premium p-5 space-y-3 relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none
        ${hasAllergies ? 'bg-red-500/15 dark:bg-red-500/20' : 'bg-emerald-500/10 dark:bg-emerald-500/15'}`} />
      <h3 className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-1.5 relative z-10 opacity-80">
        <ShieldAlert size={14} className={hasAllergies ? 'text-red-500' : 'text-emerald-500'} /> Alertas Clínicas
      </h3>
      <div className={`p-3 rounded-xl shadow-sm relative z-10 border
        ${hasAllergies
          ? 'bg-red-500/5 dark:bg-red-500/10 border-red-500/20'
          : 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20'
        }`}>
        <div className={`font-black text-[10px] uppercase tracking-wider mb-1
          ${hasAllergies ? 'text-red-500 dark:text-red-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
          {hasAllergies ? 'Alergias Conocidas' : 'Sin Alergias'}
        </div>
        <p className={`text-sm font-black leading-snug
          ${hasAllergies ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {hasAllergies ? patient.allergies : 'Sin alergias declaradas ✓'}
        </p>
      </div>
    </div>
  );
}
