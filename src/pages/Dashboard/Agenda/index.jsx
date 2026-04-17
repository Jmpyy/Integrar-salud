import { useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../../../stores/useStore';
import { toast } from 'react-hot-toast';
import {
  ChevronLeft, ChevronRight, Plus, Search, Clock, User, Landmark,
  MoreHorizontal, X, UserCheck, AlertCircle, CheckCircle2, UserX, UserMinus, Filter, CalendarDays, Lock, Wallet, RefreshCw,
  Calendar, Stethoscope, Receipt, Eye, Trash2, ReceiptText, MessageCircle, Activity
} from 'lucide-react';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import PaymentReceiptModal from '../../../components/PaymentReceiptModal/PaymentReceiptModal';
import { generateNHC } from '../../../utils/helpers';
import { BUSINESS_HOURS, TIME_SLOT_ROUNDING } from '../../../config/constants';

export default function AgendaPage() {
  const store = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const appointments = store.appointments;
  const doctors = store.doctors;
  const patients = store.patients;
  const { userRole, user } = store;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'weekly'

  const getLocalDayString = (date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const todayString = getLocalDayString(new Date());
  const currentSelectedDateString = getLocalDayString(currentDate);

  // Configuración global (días y horas de atención)
  const config = store.globalConfig || {
    hours: {
      1: { enabled: true,  start: '09:00', end: '18:00' },
      2: { enabled: true,  start: '09:00', end: '18:00' },
      3: { enabled: true,  start: '09:00', end: '18:00' },
      4: { enabled: true,  start: '09:00', end: '18:00' },
      5: { enabled: true,  start: '09:00', end: '18:00' },
      6: { enabled: false, start: '09:00', end: '13:00' },
      0: { enabled: false, start: '09:00', end: '13:00' },
    }
  };

  // Calcular rango de horas dinámico (Min Start y Max End de los días habilitados)
  const hours = (() => {
    let minStart = 24;
    let maxEnd = 0;
    let hasAnyEnabled = false;

    Object.values(config.hours).forEach(h => {
      if (h.enabled) {
        hasAnyEnabled = true;
        const s = parseInt(h.start.split(':')[0]);
        const e = parseInt(h.end.split(':')[0]) + (h.end.split(':')[1] === '00' ? 0 : 1);
        if (s < minStart) minStart = s;
        if (e > maxEnd) maxEnd = e;
      }
    });

    if (!hasAnyEnabled) return Array.from({ length: 14 }, (_, i) => i + 8); // Fallback 8-22
    
    // Asegurar un mínimo de rango para que no se vea vacía
    if (maxEnd <= minStart) maxEnd = minStart + 8;

    return Array.from({ length: maxEnd - minStart }, (_, i) => i + minStart);
  })();

  const [selectedDoctorWeekly, setSelectedDoctorWeekly] = useState('');

  // Estados visuales y de filtrado
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [menuApp, setMenuApp] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Resize listener
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [hiddenDoctors, setHiddenDoctors] = useState([]);

  const visibleDoctors = (doctors || []).filter(d => !hiddenDoctors.includes(d.id));

  // Modal y Formularios
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState(null);
  const [draggedApp, setDraggedApp] = useState(null);

  const [isBlockMode, setIsBlockMode] = useState(false);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [recurringWeeks, setRecurringWeeks] = useState(0);

  // ConfirmDialog states
  const [workHoursAlert, setWorkHoursAlert] = useState(null);
  const [confirmOverlapSave, setConfirmOverlapSave] = useState(false);
  const [confirmOverlapDrop, setConfirmOverlapDrop] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [pendingDrop, setPendingDrop] = useState(null); // { targetCol, newTime }
  const [senasInput, setSenasInput] = useState({ appId: null, value: '' }); // inline seña input
  const [receiptApp, setReceiptApp] = useState(null);   // appointment for which to show receipt

  // "Mis turnos" filter — for medico role, default to true
  const [myTurnosOnly, setMyTurnosOnly] = useState(userRole === 'medico');

  // Match logged-in medico to a doctor entity using authoritative doctor_id from backend
  const myDoctor = userRole === 'medico' && user?.doctor_id
    ? (doctors.find(d => d && Number(d.id) === Number(user.doctor_id)) || null)
    : (userRole === 'medico' ? doctors.find(d => d && d.name === user?.name) : null);

  const defaultForm = {
    title: '',
    date: currentSelectedDateString,
    time: '12:00',
    duration: 1,
    type: 'psicologia',
    doctorId: doctors && doctors.length > 0 && doctors[0] ? doctors[0].id : '',
    patientId: '',
    newPatientName: '',
    newPatientPhone: '',
    notes: '',
    paymentStatus: 'pendiente',
    attendance: 'agendado',
    coverage: 'Particular',
    coverageNumber: '',
    plan: '',
    dni: '',
    birthDate: '',
    gender: 'femenino',
    email: '',
    address: '',
    emergencyContact: '',
    referrer: '',
    paymentAmount: '35000',
    paymentMethod: 'Efectivo',
    paidAmount: ''
  };

  const [formData, setFormData] = useState(defaultForm);
  const [cashReceived, setCashReceived] = useState('');



  // Handle auto-open for "New Appointment" via query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('new') === 'true') {
      setIsModalOpen(true);
      setEditingAppointmentId(null);
      setFormData(defaultForm);
      // Limpiar el parámetro de la URL
      navigate('/agenda', { replace: true });
    }
  }, [location.search]);

  // Generación dinámica de columnas según la vista
  const isWeekly = viewMode === 'weekly';
  const getDayOffset = (d) => d.getDay() === 0 ? 6 : d.getDay() - 1; // Lunes=0, Domingo=6

  let columns = [];
  if (isWeekly) {
    const activeDoctorId = selectedDoctorWeekly || (doctors && doctors[0] ? doctors[0].id : null);
    const activeDoctor = doctors ? doctors.find(d => d.id === Number(activeDoctorId)) : null;
    
    // Generar columnas solo de días habilitados
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - getDayOffset(currentDate));
    
    for (let i = 0; i < 7; i++) {
       const colDate = new Date(startOfWeek);
       colDate.setDate(startOfWeek.getDate() + i);
       const dayNum = colDate.getDay();
       
       // Verificar si el día está habilitado en la config
       if (config.hours[dayNum]?.enabled) {
         const dateStr = getLocalDayString(colDate);
         columns.push({
            id: `day-${dateStr}`,
            type: 'day',
            dateStr: dateStr,
            dayNum: dayNum,
            doctorId: activeDoctorId,
            doctor: activeDoctor,
            title: colDate.toLocaleDateString('es-ES', { weekday: 'long' }).replace(/^\w/, c => c.toUpperCase()),
            subtitle: colDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
         });
       }
    }
  } else {
    // Vista Diaria (Daily)
    (visibleDoctors || []).forEach(d => {
       if (!d) return;
       columns.push({
          id: `doc-${d.id}`,
          type: 'doctor',
          dateStr: currentSelectedDateString,
          dayNum: currentDate.getDay(),
          doctorId: d.id,
          doctor: d,
          title: d.name || 'Sin nombre',
          subtitle: d.specialty || 'Sin especialidad'
       });
    });
  }

  // Prevenir Solapamiento
  const checkOverlap = (docId, dStr, tStr, durH, excludeAppId) => {
    const getMinutes = (ts) => {
      const [h,m] = ts.split(':').map(Number);
      return h*60 + m;
    };
    const startM = getMinutes(tStr);
    const endM = startM + (durH * 60);

    return appointments.some(app => {
      if (!app || !app.id) return false; // Protección: evitar errores si el turno es nulo
      if (app.id === excludeAppId) return false;
      if (app.doctorId !== docId) return false;
      if (app.date !== dStr) return false;
      if (app.attendance === 'ausente') return false; 
      
      const aStartM = getMinutes(app.time);
      const aEndM = aStartM + (app.duration * 60);

      return (startM < aEndM && endM > aStartM);
    });
  };

  // Manejo de Guardado
  const handleSaveAppointment = async (e) => {
    e.preventDefault();

    // 1. Validar Día Laboral
    const selDate = new Date(formData.date + 'T00:00:00');
    const dayOfWeek = selDate.getDay(); // 0-6
    const dayConfig = config.hours[dayOfWeek];

    if (!dayConfig || !dayConfig.enabled) {
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      setWorkHoursAlert({
        title: 'Consultorio Cerrado',
        description: `El consultorio no atiende los días ${dayNames[dayOfWeek]}. Por favor, selecciona otra fecha.`,
        variant: 'danger'
      });
      return;
    }

    // 2. Validar Rango Horario
    const getMinutes = (ts) => {
      const [h, m] = ts.split(':').map(Number);
      return h * 60 + m;
    };
    const startM = getMinutes(formData.time);
    const endM = startM + (formData.duration * 60);
    const configStartM = getMinutes(dayConfig.start);
    const configEndM = getMinutes(dayConfig.end);

    if (startM < configStartM || endM > configEndM) {
      setWorkHoursAlert({
        title: 'Horario Restringido',
        description: `El horario seleccionado (${formData.time}) se encuentra fuera del rango de atención para el día ${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dayOfWeek]} (${dayConfig.start} a ${dayConfig.end}).`,
        variant: 'warning'
      });
      return;
    }

    // 3. Verificar Choque de Turnos
    if (checkOverlap(formData.doctorId, formData.date, formData.time, formData.duration, editingAppointmentId)) {
        setConfirmOverlapSave(true);
        return;
    }

    await proceedSave();
  };

  const proceedSave = async () => {
    setIsSaving(true);
    try {
      let finalPatientName = '';
      let finalPatientPhone = '';
      let finalCoverage = '';
      let finalCoverageNumber = '';
      let finalPatientId = formData.patientId;

      if (!isBlockMode) {
        if (!isNewPatient) {
          const selectedPatient = patients.find(p => p.id === Number(formData.patientId));
          finalPatientName = selectedPatient?.name || 'Desconocido';
          finalPatientPhone = selectedPatient?.phone || '';
          finalCoverage = selectedPatient?.coverage || 'Particular';
          finalCoverageNumber = selectedPatient?.coverageNumber || '';
        } else {
          finalPatientName = formData.newPatientName;
          finalPatientPhone = formData.newPatientPhone;
          finalCoverage = formData.coverage;
          finalCoverageNumber = formData.coverageNumber;

          // Guardar nuevo paciente en la BD
          const newPatient = await store.createPatient({
            name: finalPatientName,
            phone: finalPatientPhone,
            coverage: finalCoverage,
            coverageNumber: finalCoverageNumber,
            plan: formData.plan,
            dni: formData.dni,
            birthDate: formData.birthDate,
            gender: formData.gender,
            email: formData.email,
            address: formData.address,
            emergencyContact: formData.emergencyContact,
            allergies: "",
            history: []
          });
          
          if (!newPatient || !newPatient.id) {
              throw new Error('Error al crear el paciente en el servidor');
          }
          finalPatientId = newPatient.id;
        }
      }

      const doctor = doctors.find(d => d.id === Number(formData.doctorId));
      
      let baseColorClass = 'bg-indigo-50 border-indigo-200 text-indigo-800';
      if (isBlockMode) {
        baseColorClass = 'bg-stripes bg-slate-100 border-slate-300 text-slate-800';
      } else if (doctor) {
        if (doctor.color === 'esmeralda') baseColorClass = 'bg-emerald-50 border-emerald-200 text-emerald-800';
        if (doctor.color === 'purpura') baseColorClass = 'bg-purple-50 border-purple-200 text-purple-800';
        if (doctor.color === 'indigo') baseColorClass = 'bg-indigo-50 border-indigo-200 text-indigo-800';
      }

      if (editingAppointmentId) {
        const mainApp = appointments.find(a => a.id === editingAppointmentId);
        const isStatusChangeToPaid = formData.paymentStatus === 'pagado' && (mainApp?.paymentStatus !== 'pagado');
        const isStatusChangeToSenado = formData.paymentStatus === 'senado' && (mainApp?.paymentStatus !== 'senado');

        const updatedApp = {
          ...mainApp,
          ...formData,
          patient: isBlockMode ? 'Bloqueo' : finalPatientName,
          phone: isBlockMode ? '' : finalPatientPhone,
          coverage: isBlockMode ? '' : finalCoverage,
          coverageNumber: isBlockMode ? '' : finalCoverageNumber,
          isBlock: isBlockMode,
          color: baseColorClass
        };
        const updateResult = await store.updateAppointment(editingAppointmentId, updatedApp);
        if (!updateResult || !updateResult.id) {
           throw new Error('Error al actualizar el turno en el servidor');
        }

        // Inyectar en Finanzas si corresponde (Solo la diferencia)
        const prevPaid = Number(mainApp?.paymentStatus === 'pagado' ? mainApp?.paymentAmount : (mainApp?.paymentStatus === 'senado' ? mainApp?.paidAmount : 0));
        const currPaid = Number(formData.paymentStatus === 'pagado' ? formData.paymentAmount : (formData.paymentStatus === 'senado' ? formData.paidAmount : 0));
        const netPaymentNow = currPaid - prevPaid;

        if (netPaymentNow > 0) {
          await store.createTransaction({
            id: Date.now(),
            date: new Date().toISOString(),
            type: 'Ingreso',
            concept: `${formData.paymentStatus === 'pagado' ? 'Completa Pago' : 'Refuerzo Seña'} ${formData.title} — ${finalPatientName}`,
            method: formData.paymentMethod || 'Efectivo',
            amount: netPaymentNow,
            notes: `Auto-registrado: Saldo abonado en edición (Turno #${editingAppointmentId})`,
            doctor_id: formData.doctorId,
            patient_id: finalPatientId
          });
        }
      } else {
        let newAppointments = [];
        let baseId = appointments.length > 0 ? Math.max(...appointments.map(a => a.id)) : 0;

        const weeksToGenerate = isBlockMode ? 1 : (recurringWeeks + 1);

        for (let i = 0; i < weeksToGenerate; i++) {
          const entryDate = new Date(formData.date);
          entryDate.setMinutes(entryDate.getMinutes() + entryDate.getTimezoneOffset());
          entryDate.setDate(entryDate.getDate() + (i * 7));

          newAppointments.push({
            ...formData,
            id: ++baseId,
            patientId: finalPatientId,
            date: getLocalDayString(entryDate),
            patient: isBlockMode ? 'Bloqueo' : finalPatientName,
            phone: isBlockMode ? '' : finalPatientPhone,
            coverage: isBlockMode ? '' : finalCoverage,
            coverageNumber: isBlockMode ? '' : finalCoverageNumber,
            isBlock: isBlockMode,
            color: baseColorClass,
            attendance: 'agendado'
          });
        }

        for (const newApp of newAppointments) {
          const createdResult = await store.createAppointment(newApp);
          const created = Array.isArray(createdResult) ? createdResult[0] : createdResult;
          
          if (!created || !created.id) {
            throw new Error('Error al crear el turno en el servidor');
          }

          if ((formData.paymentStatus === 'pagado' || formData.paymentStatus === 'senado') && created) {
            const amountValue = formData.paymentStatus === 'pagado' ? Number(formData.paymentAmount || 0) : Number(formData.paidAmount || 0);
            if (amountValue > 0) {
              await store.createTransaction({
                id: Date.now() + Math.random(),
                date: new Date().toISOString(),
                type: 'Ingreso',
                concept: `${formData.paymentStatus === 'pagado' ? 'Cobro Total' : 'Seña'} ${formData.title} — ${finalPatientName}`,
                method: formData.paymentMethod || 'Efectivo',
                amount: amountValue,
                notes: `Registrado al crear turno (Turno #${newApp.id})`,
                doctor_id: formData.doctorId,
                patient_id: finalPatientId
              });
            }
          }
        }
      }
      
      toast.success(editingAppointmentId ? 'Turno actualizado con éxito' : 'Turno agendado correctamente');
      closeModal();
    } catch (error) {
      console.error('Error saving appointment:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error al guardar el turno';
      toast.error(errorMessage);
      setIsSaving(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(true);
    setTimeout(() => setIsModalOpen(false), 50); // Pequeño delay para animaciones
    setEditingAppointmentId(null);
    setFormData({...defaultForm, date: currentSelectedDateString});
    setIsNewPatient(false);
    setPatientSearch('');
    setIsBlockMode(false);
    setRecurringWeeks(0);
    setIsSaving(false);
  };

  useEffect(() => {
    store.fetchPatients();
    store.fetchDoctors();
  }, []);

  // -- Paginación inteligente basada en fechas --
  // Descarga el mes actual, el anterior y el próximo para navegación fluida
  useEffect(() => {
    const pad = (n) => n.toString().padStart(2, '0');
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    
    const dFrom = new Date(y, m - 1, 1);
    const dTo = new Date(y, m + 2, 0); // último día del mes siguiente

    const dateFrom = `${dFrom.getFullYear()}-${pad(dFrom.getMonth() + 1)}-01`;
    const dateTo = `${dTo.getFullYear()}-${pad(dTo.getMonth() + 1)}-${pad(dTo.getDate())}`;

    store.fetchAppointments({ dateFrom, dateTo });
  }, [currentDate.getFullYear(), currentDate.getMonth()]);

  const handleStatusChange = (e, id, newStatus) => {
    if (e) e.stopPropagation();
    store.updateAppointmentStatus(id, newStatus);
    setMenuApp(null);
    setActiveDropdown(null);
  };

  const handleSendWhatsApp = (app) => {
    if (!app) return;
    const patientRecord = store.patients.find(p => p.id === app.patientId || p.name === app.patient);
    const phone = app.phone || patientRecord?.phone;
    
    if (!phone) {
      toast.error('El paciente no tiene un teléfono registrado');
      return;
    }

    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('54')) cleanPhone = '54' + cleanPhone;

    const consultorio = store.globalConfig?.clinicName || store.globalConfig?.businessName || 'Integrar Salud';
    const message = `Hola *${app.patient}*, te recordamos tu turno de *${app.title}* para hoy a las *${app.time}hs* en *${consultorio}*. ¡Te esperamos! ✨`;
    
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    setMenuApp(null);
  };

  const handleViewPatient = (app) => {
    const patientRecord = store.patients.find(p => p.id === app.patientId || p.name === app.patient);
    if (!patientRecord?.id) {
      toast.error('No se pudo localizar el registro del paciente');
      return;
    }
    navigate(`/pacientes?view=${patientRecord.id}`);
    setMenuApp(null);
    setActiveDropdown(null);
  };

  const handleOpenEdit = useCallback((app) => {
    if (!app) return;
    setActiveDropdown(null);
    setMenuApp(null);
    setEditingAppointmentId(app.id);
    setIsBlockMode(app.isBlock || false);
    
    // Buscar paciente existente
    const existing = (store.patients || []).find(p => 
      p && (p.id === app.patientId || 
      (app.patient && p.name === app.patient))
    );

    setFormData({
      title: app.title || '',
      date: app.date || '',
      time: app.time || '',
      duration: app.duration || 1,
      type: app.type || 'psicologia',
      doctorId: app.doctorId,
      patientId: existing ? existing.id : '',
      newPatientName: existing ? '' : (app.isBlock ? '' : (app.patient || '')),
      newPatientPhone: existing ? '' : (app.isBlock ? '' : (app.phone || '')),
      notes: app.notes || '',
      paymentStatus: app.paymentStatus || 'pendiente',
      attendance: app.attendance || 'agendado',
      coverage: existing ? existing.coverage : (app.coverage || 'Particular'),
      coverageNumber: existing ? existing.coverageNumber : (app.coverageNumber || ''),
      plan: existing ? existing.plan : '',
      dni: existing ? existing.dni : '',
      birthDate: existing ? existing.birthDate : '',
      gender: existing ? existing.gender : 'femenino',
      email: existing ? existing.email : '',
      address: existing ? existing.address : '',
      emergencyContact: existing ? existing.emergencyContact : '',
      referrer: app.referrer || '',
      paymentAmount: app.paymentAmount || '35000',
      paymentMethod: app.paymentMethod || 'Efectivo',
      paidAmount: app.paidAmount || ''
    });
    setIsNewPatient(!existing && !app.isBlock);
    setIsModalOpen(true);
  }, [store.patients]);

  const toggleDoctorVisibility = (docId) => {
    setHiddenDoctors(prev => prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]);
  };

  // Drag & Drop
  const handleDrop = (e, targetCol) => {
    e.preventDefault();
    if (!draggedApp) return;

    const gridRect = e.currentTarget.getBoundingClientRect();
    const y = Math.max(0, e.clientY - gridRect.top);
    
    // Altura = 96px por hora. Hora inicio = 6.
    const totalHoursFromStart = y / 96;
    let rawHour = Math.floor(totalHoursFromStart) + 6;
    let rawMinutes = Math.floor((totalHoursFromStart - Math.floor(totalHoursFromStart)) * 60);

    const remainder = rawMinutes % 15;
    let roundedMinutes = remainder >= 8 ? rawMinutes + (15 - remainder) : rawMinutes - remainder;
    
    if (roundedMinutes >= 60) {
      rawHour += 1;
      roundedMinutes = 0;
    }
    
    if (rawHour < 6) rawHour = 6;
    if (rawHour > 21) { rawHour = 21; roundedMinutes = 45; }

    const newTime = `${rawHour.toString().padStart(2, '0')}:${roundedMinutes.toString().padStart(2, '0')}`;

    // Validar Sobre-turno Visual
    if (checkOverlap(targetCol.doctorId, targetCol.dateStr, newTime, draggedApp.duration, draggedApp.id)) {
        setPendingDrop({ targetCol, newTime });
        setConfirmOverlapDrop(true);
        return;
    }

    proceedDrop(targetCol, newTime);
  };

  const proceedDrop = (targetCol, newTime) => {
    const app = appointments.find(a => a.id === draggedApp.id);
    if (!app) return;
    store.updateAppointment(draggedApp.id, {
      time: newTime,
      doctorId: targetCol.doctorId,
      date: targetCol.dateStr
    });
    setDraggedApp(null);
  };

  // Navegación
  const handlePrev = () => setCurrentDate(new Date(currentDate.getTime() - (isWeekly ? 86400000 * 7 : 86400000)));
  const handleNext = () => setCurrentDate(new Date(currentDate.getTime() + (isWeekly ? 86400000 * 7 : 86400000)));
  const handleSetToday = () => setCurrentDate(new Date());

  const formattedHeaderDate = isWeekly 
  ? `Semana del ${currentDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`
  : currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, (c) => c.toUpperCase());

  const filteredAppointments = (userRole === 'medico' || (myTurnosOnly && myDoctor))
    ? appointments.filter(a => a.doctorId === (myDoctor?.id || user?.doctor_id))
    : appointments;

  // ─── RENDERS ───
  
  // Vista de lista para móviles
  const renderListView = () => {
    const days = isWeekly ? columns : [{ dateStr: currentSelectedDateString }];
    
    return (
      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-6 pt-2">
        {days.map(day => {
          const dayApps = (filteredAppointments || [])
            .filter(app => app && app.date === day.dateStr);
          
          if (dayApps.length === 0 && !isWeekly) return (
            <div key={day.dateStr} className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-[var(--bg-card)] rounded-full flex items-center justify-center mb-4 border border-[var(--border-color)]">
                <CalendarDays size={24} className="opacity-20" />
              </div>
              <p className="text-sm font-bold text-[var(--text-secondary)]">No hay turnos para hoy</p>
            </div>
          );

          if (dayApps.length === 0) return null;

          return (
            <div key={day.dateStr} className="space-y-3">
              <div className="sticky top-0 z-10 py-2 bg-[var(--bg-main)]/80 backdrop-blur-md">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-60">
                  {new Date(day.dateStr + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
              </div>
              
              <div className="grid gap-3">
                {dayApps.sort((a, b) => a.time.localeCompare(b.time)).map(app => (
                  <div 
                    key={app.id} 
                    onClick={() => handleOpenEdit(app)}
                    className={`${app.color} p-4 rounded-2xl border-l-4 shadow-sm active:scale-[0.98] transition-all relative overflow-hidden`}
                    style={{ borderLeftColor: 'currentColor' }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="px-2 py-1 bg-white/50 rounded-lg text-[11px] font-black">
                          {app.time}
                        </div>
                        {app.attendance === 'en_espera' && (
                          <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-ping"></span>
                        )}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setMenuApp(menuApp?.id === app.id ? null : app);
                        }}
                        className="p-2 -mr-2 -mt-2 opacity-40"
                      >
                        <MoreHorizontal size={20} />
                      </button>
                    </div>

                    <h4 className="text-sm font-black mb-1 truncate">{app.title}</h4>
                    
                    <div className="flex flex-wrap gap-2 items-center text-[11px] font-bold opacity-80 mt-2">
                      <div className="flex items-center gap-1">
                        <User size={12} />
                        <span>{app.patient}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Stethoscope size={12} />
                        <span>{doctors.find(d => d.id === app.doctorId)?.name?.split(' ')[0] || 'Doc'}</span>
                      </div>
                    </div>

                    {/* Badge de pago en móvil flotante */}
                    {app.paymentStatus === 'pagado' && (
                      <div className="absolute top-0 right-0 p-1">
                         <div className="bg-emerald-500 text-white p-1 rounded-bl-xl shadow-lg">
                           <CheckCircle2 size={10} />
                         </div>
                      </div>
                    )}

                    {/* Menú móvil eliminado de aquí para ser desacoplado */}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };


  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-effect p-4 rounded-3xl shadow-[var(--glass-shadow)] border border-[var(--glass-border)]">
        
        {/* VIEW TOGGLE */}
        <div className="flex items-center bg-[var(--bg-main)] p-1 rounded-xl border border-[var(--border-color)] shrink-0 shadow-inner">
           <button onClick={() => setViewMode('daily')} className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'daily' ? 'bg-[var(--bg-card)] shadow-md text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] opacity-50 hover:opacity-100'}`}>Diaria</button>
           <button onClick={() => setViewMode('weekly')} className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'weekly' ? 'bg-[var(--bg-card)] shadow-md text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] opacity-50 hover:opacity-100'}`}>Semanal</button>
        </div>

        {/* Nav de Fechas */}
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-[var(--bg-main)] rounded-full border border-[var(--border-color)] p-1 shadow-inner">
            <button onClick={handlePrev} className="p-2.5 hover:bg-[var(--bg-card)] rounded-full transition-all text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:shadow-sm leading-none group">
              <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <span className="px-6 font-black text-[var(--text-primary)] min-w-[200px] text-center capitalize tracking-tight text-sm">
              {formattedHeaderDate}
            </span>
            <button onClick={handleNext} className="p-2.5 hover:bg-[var(--bg-card)] rounded-full transition-all text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:shadow-sm leading-none group">
              <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          <button onClick={handleSetToday} className="hidden sm:block px-5 py-2 text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-light)] rounded-full transition-all border border-transparent hover:border-[var(--accent-primary)]/20">
            Hoy
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Si es vista semanal, mostramos Selector de Doctor exclusivo (Premium Style) */}
          {isWeekly && userRole !== 'medico' && (
             <div className="relative group w-full sm:w-64">
               <select 
                 value={selectedDoctorWeekly} 
                 onChange={(e) => setSelectedDoctorWeekly(Number(e.target.value))} 
                 className="appearance-none w-full pl-5 pr-12 py-3 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] font-black uppercase tracking-widest text-[10px] rounded-full focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-primary)]/10 outline-none transition-all cursor-pointer shadow-md hover:border-[var(--accent-primary)]/50"
               >
                 <option value="" className="bg-[var(--bg-card)] text-[var(--text-secondary)]">Seleccionar Profesional...</option>
                 {(doctors || []).filter(d => d && d.id).map(d => (
                   <option key={d.id} value={d.id} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                     {d.name?.toUpperCase() || 'SIN NOMBRE'}
                   </option>
                 ))}
               </select>
               <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--accent-primary)] group-hover:scale-110 transition-transform">
                 <MoreHorizontal size={14} />
               </div>
             </div>
          )}

          {/* Filtro Dropdown para mostrar/ocultar Doctores SOLO en diaria */}
          {!isWeekly && (
            <div className="relative hidden sm:block">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`p-2.5 rounded-full transition-all relative border shadow-sm ${isFilterOpen ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-[var(--accent-primary)]/20' : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/30 hover:text-[var(--accent-primary)]'}`}
                title="Filtrar Doctores"
              >
                {hiddenDoctors.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full shadow-md border-2 border-[var(--bg-card)]"></span>}
                <Filter size={18} />
              </button>
              
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)}></div>
                  <div className="absolute right-0 mt-3 w-64 bg-[var(--bg-card)] rounded-3xl shadow-2xl border border-[var(--glass-border)] py-3 z-50 animate-fade-in-quick overflow-hidden backdrop-blur-xl">
                    <div className="px-5 py-2.5 text-[10px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-[0.2em] border-b border-[var(--border-color)]/30 mb-2">Columnas visibles</div>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      {(doctors || []).filter(d => d && d.id).map(d => (
                        <button 
                          key={d.id}
                          onClick={() => toggleDoctorVisibility(d.id)} 
                          className={`w-full text-left px-5 py-3 text-sm font-bold transition-all hover:bg-[var(--accent-light)] flex items-center justify-between group ${!hiddenDoctors.includes(d.id) ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] opacity-40'}`}
                        >
                          <span className="truncate">{(d.name || 'Sin nombre').split(' ')[0]} {(d.name || '').split(' ')[1] || ''}</span>
                          {!hiddenDoctors.includes(d.id) ? (
                            <CheckCircle2 size={16} className="text-emerald-500" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-[var(--border-color)] group-hover:border-[var(--accent-primary)]/30" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* "Mis turnos" toggle — only for medico role */}
          {userRole === 'medico' && (
            <button
              onClick={() => setMyTurnosOnly(p => !p)}
              className={`hidden sm:flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-full transition-all border shadow-sm ${
                myTurnosOnly
                  ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-[var(--accent-primary)]/20'
                  : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--accent-primary)]/30 hover:text-[var(--accent-primary)]'
              }`}
              title={myTurnosOnly ? 'Mostrando solo tus turnos' : 'Mostrando todos los turnos'}
            >
              <User size={14} />
              {myTurnosOnly ? 'Mis turnos' : 'Todos'}
            </button>
          )}

          {userRole !== 'medico' && (
            <button 
              onClick={() => {
                // Pre-completar doctor y fecha según la vista
                setFormData({...defaultForm, doctorId: isWeekly ? selectedDoctorWeekly : (doctors[0]?.id || ''), date: currentSelectedDateString});
                setIsModalOpen(true);
              }}
              className="px-6 py-2.5 bg-[var(--accent-primary)] text-white text-xs font-black uppercase tracking-widest rounded-full shadow-lg shadow-[var(--accent-primary)]/20 hover:bg-[var(--accent-hover)] hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              <Plus size={18} />
              <span className="hidden sm:block">Nuevo Turno</span>
            </button>
          )}
        </div>
      </div>

      {/* VISTA MULTICOLUMNA DE AGENDA - RESPONSIVO & FULL SCREEN */}
      <div className="card-premium overflow-x-auto flex flex-col h-[calc(100vh-14rem)] min-h-[500px] flex-1 custom-scrollbar-horizontal border border-[var(--glass-border)]">
        
        {/* Cabeceras de Columnas */}
        <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-sidebar)]">
          <div className="w-14 sm:w-20 border-r border-[var(--border-color)] p-2 sm:p-4 shrink-0 flex items-center justify-center text-[10px] sm:text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest">
            Hora
          </div>
          {columns.map(col => (
            <div key={col.id} className="flex-1 p-2 sm:p-4 flex flex-col items-center justify-center border-r border-[var(--border-color)] last:border-0 min-w-[140px] sm:min-w-[200px]">
              <div className="font-extrabold text-xs sm:text-base text-[var(--text-primary)] truncate w-full text-center tracking-tight">{col.title}</div>
              <div className="text-[10px] sm:text-xs font-bold text-[var(--text-secondary)] uppercase truncate w-full text-center opacity-70 tracking-wider font-mono">{col.subtitle}</div>
            </div>
          ))}
        </div>

        {/* Grilla principal */}
      {/* GRID PRINCIPAL DE LA AGENDA (Desktop) o LISTA (Mobile) */}
      {isMobile ? (
        renderListView()
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="flex relative pt-4 pb-8 min-w-max w-full">
            
            {/* Columna de Horas */}
            <div className="w-20 shrink-0 border-r border-[var(--border-color)] bg-[var(--bg-card)]/50 sticky left-0 z-20 backdrop-blur-sm">
              {hours.map(hour => (
                <div key={`time-${hour}`} className="h-24 relative border-b border-[var(--border-color)]/30">
                  <span className="absolute -top-3 left-0 right-0 text-center text-xs font-black text-[var(--text-secondary)] font-mono">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Columnas Variables (Doctores o Días) */}
            {columns.map((col, colIndex) => {
              // Obtener schedule para aplicar color gris si está fuera de horario
              const sched = col.doctor?.schedule?.[col.dayNum];

              const colAppointments = (filteredAppointments || [])
                .filter(app => app && app.id && app.doctorId === col.doctorId && app.date === col.dateStr);
              
              return (
                <div 
                  key={col.id}
                  className="flex-1 relative min-w-[200px] border-r border-slate-50 last:border-0"
                  onDragOver={(e) => { if (draggedApp) e.preventDefault(); }}
                  onDrop={(e) => handleDrop(e, col)}
                >
              {/* Celdas de hora y bloqueo visual */}
              {hours.map(hour => {
                const isOffHours = !sched || hour < sched.start || hour >= sched.end;
                
                return (
                  <div key={`grid-${hour}`} className={`h-24 w-full absolute pointer-events-none border-b border-[var(--border-color)]/20 ${isOffHours ? 'bg-[var(--text-secondary)]/5' : 'bg-transparent'}`} style={{ top: `${(hour - 6) * 96}px` }}>
                    {isOffHours && <div className="absolute top-2 right-2 opacity-10"><Lock size={12} className="text-[var(--text-secondary)]"/></div>}
                  </div>
                )
              })}

                  {/* LÍNEA DE HORA ACTUAL */}
                  {col.dateStr === todayString && (
                    <div className="absolute left-0 right-0 border-t-2 border-[var(--accent-primary)] z-30 pointer-events-none" style={{ top: `${((new Date().getHours() - 6) + (new Date().getMinutes() / 60)) * 96}px` }}>
                      {colIndex === (isWeekly ? columns.findIndex(c => c.dateStr === todayString) : 0) && (
                        <>
                          <div className="absolute -left-2 -top-1.5 w-3 h-3 bg-[var(--accent-primary)] rounded-full shadow-[0_0_15px_var(--accent-primary)] animate-pulse"></div>
                          <div className="absolute left-2 -top-6 bg-[var(--accent-primary)] text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-lg">
                            {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Renderizado de Turnos */}
                  {colAppointments.map(app => {
                    const [h, m] = app.time.split(':').map(Number);
                    const topOffset = ((h - 6) + (m / 60)) * 96;
                    // Asegurar altura mínima para que los turnos cortos no se vean "rotos"
                    const calculatedHeight = Math.max(42, (Number(app.duration) || 0.5) * 96);
                    
                    const isSuspended = app.attendance === 'suspended' || app.attendance === 'ausente';
                    const isShort = app.duration <= 0.5;
                    const isBlock = app.isBlock;

                    // Estilos dinámicos según estado de asistencia
                    let cardOpacity = 'opacity-100';
                    let cardBorder = '';
                    if (app.attendance === 'ausente') cardOpacity = 'opacity-40 grayscale';
                    if (app.attendance === 'en_espera') cardBorder = 'ring-2 ring-indigo-400 ring-offset-1';
                    if (app.attendance === 'finalizado') cardOpacity = 'opacity-60 bg-slate-50';

                    return (
                      <div 
                        key={app.id} 
                        className={`absolute left-2 right-2 group transition-all duration-200 ${cardOpacity}`}
                        style={{ top: `${topOffset}px`, height: `${calculatedHeight - 4}px`, zIndex: activeDropdown === app.id ? 50 : (draggedApp?.id === app.id ? 40 : 10) }}
                        onClick={(e) => {
                          // Si el evento ya fue manejado por un hijo (como los tres puntos), no abrir el modal
                          if (e.defaultPrevented) return;
                          handleOpenEdit(app);
                        }}
                      >
                        <div
                          draggable={userRole !== 'medico' && !isSuspended}
                          onDragStart={(e) => {
                            if (userRole === 'medico' || isSuspended) { e.preventDefault(); return; }
                            setDraggedApp(app);
                            e.dataTransfer.effectAllowed = 'move';
                            setActiveDropdown(null);
                          }}
                          onDragEnd={() => setDraggedApp(null)}
                          className={`absolute inset-0 rounded-2xl border ${isShort ? 'p-2' : 'p-3'} shadow-sm cursor-pointer hover:shadow-md active:scale-[0.98] transition-all flex flex-col ${app.color} ${cardBorder} ${draggedApp?.id === app.id ? 'opacity-40 border-dashed border-2' : ''} ${activeDropdown === app.id ? 'overflow-visible' : 'overflow-hidden'}`}
                        >
                          <div className="flex justify-between items-start mb-1 relative w-full shrink-0">
                            <div className="pr-2 flex-1 min-w-0">
                              <h4 className={`font-bold ${isShort ? 'text-xs' : 'text-sm'} truncate ${app.attendance === 'ausente' ? 'line-through' : ''}`}>
                                {app.title}
                              </h4>
                              
                              {!isShort && !isBlock && app.notes && (
                                <p className="text-xs mt-0.5 opacity-75 truncate max-w-[200px]" title={app.notes}>
                                  📝 {app.notes}
                                </p>
                              )}
                              
                              {!isShort && !isBlock && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {/* Cobertura Médica */}
                                  {app.coverage && app.coverage !== 'Particular' && (
                                    <span className="inline-block px-1.5 py-0.5 bg-white/70 text-slate-700 text-[10px] font-bold uppercase rounded-md shadow-sm border border-slate-200/50">
                                      {app.coverage}
                                    </span>
                                  )}
                                  {/* Badge Caja Expandido */}
                                  {!isBlock && (
                                    <>
                                      {app.paymentStatus === 'pagado' && (
                                        <span className="inline-block px-1.5 py-0.5 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-md shadow-md border border-emerald-500 flex items-center justify-center">
                                          💵 ABONADO: ${Number(app.paymentAmount || 0).toLocaleString()}
                                        </span>
                                      )}
                                      {app.paymentStatus === 'senado' && (
                                        <span className="inline-block px-1.5 py-0.5 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-md shadow-md border border-indigo-500 flex items-center justify-center">
                                          💰 SEÑADO: ${Number(app.paidAmount || 0).toLocaleString()} (Saldar: ${Math.max(0, (Number(app.paymentAmount) || 0) - (Number(app.paidAmount) || 0))})
                                        </span>
                                      )}
                                    </>
                                  )}
                                  
                                  {/* Asistencia Visual */}
                                  {app.attendance === 'confirmado' && <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase rounded-md shadow-sm border border-emerald-200">OK</span>}
                                  {app.attendance === 'en_curso' && <span className="inline-block px-1.5 py-0.5 bg-emerald-500 text-white text-[10px] font-black uppercase rounded-md shadow-md border border-emerald-400 animate-pulse">ATENDIENDO</span>}
                                  {app.attendance === 'en_espera' && <span className="inline-block px-1.5 py-0.5 bg-indigo-600 text-white text-[10px] font-bold uppercase rounded-md animate-pulse shadow-sm shadow-indigo-300">Sala: {app.waitTicket || "Llamar"}</span>}
                                </div>
                              )}
                              
                              {isShort && !isBlock && (
                                <div className="flex items-center gap-1.5 mt-0.5 opacity-90 text-[10px] uppercase font-bold text-slate-700 w-full min-w-0">
                                  <span className="truncate flex-1 max-w-[80px]" title={app.patient}>{app.patient}</span>
                                </div>
                              )}
                            </div>
                            
                            <button 
                              onClick={(e) => {
                                e.preventDefault(); // Marcar como manejado para el padre
                                e.stopPropagation(); // Frenar burbujeo
                                setActiveDropdown(activeDropdown === app.id ? null : app.id);
                              }}
                              className={`transition-all p-2.5 hover:bg-white/80 rounded-full shrink-0 -mt-2 -mr-2 z-20 ${activeDropdown === app.id ? 'bg-white/80 shadow-sm' : 'opacity-40 group-hover:opacity-100'}`}
                            >
                              <MoreHorizontal size={20} />
                            </button>
                          </div>

                          {!isShort && !isBlock && (
                            <div className="flex items-center gap-3 mt-auto pt-1 opacity-90 overflow-hidden shrink-0">
                              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 min-w-0">
                                <User size={12} className="shrink-0" />
                                <span className="truncate max-w-[90px]">{app.patient}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 shrink-0">
                                <Clock size={12} />
                                <span>{app.time} ({app.duration * 60}m)</span>
                              </div>
                            </div>
                          )}
                          {!isShort && isBlock && (
                             <div className="mt-auto pt-1 flex items-center gap-1 text-[11px] font-bold text-slate-500 opacity-80">
                                <span>{app.duration} H - Ocupado</span>
                             </div>
                          )}
                        </div>

                        {/* Menú Dropdown Asistencia/Opciones */}
                        {activeDropdown === app.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); }}></div>
                            <div className="absolute right-0 top-6 w-48 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-slate-100 py-1 z-[51] animate-fade-in-quick">
                              {!isBlock && (
                                <>
                                  {userRole !== 'medico' && (
                                    <>
                                      <div className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-50">Caja / Cobros</div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          store.updateAppointmentPaymentStatus(app.id, { paymentStatus: 'pendiente' });
                                          setActiveDropdown(null);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors flex items-center justify-between ${app.paymentStatus === 'pendiente' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:bg-slate-50'}`}
                                      >
                                        Pendiente
                                        {app.paymentStatus === 'pendiente' && <CheckCircle2 size={12} />}
                                      </button>
                                    </>
                                  )}
                                  
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const totalFee = Number(app.paymentAmount || 35000);
                                      store.updateAppointmentPaymentStatus(app.id, { 
                                        paymentStatus: 'pagado',
                                        paidAmount: totalFee
                                      });
                                      if (totalFee > 0) {
                                        store.createTransaction({
                                          id: Date.now(),
                                          date: new Date().toISOString(),
                                          type: 'Ingreso',
                                          concept: `Cobro Total ${app.title} — ${app.patient}`,
                                          method: app.paymentMethod || 'Efectivo',
                                          amount: totalFee,
                                          notes: `Desde Agenda (Turno #${app.id})`,
                                          doctor_id: app.doctorId,
                                          patient_id: app.patientId
                                        });
                                      }
                                      setActiveDropdown(null);
                                    }}
                                    className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors flex items-center justify-between ${app.paymentStatus === 'pagado' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-600 hover:bg-slate-50'}`}
                                  >
                                    Abonado
                                    {app.paymentStatus === 'pagado' && <CheckCircle2 size={12} />}
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const defaultAmount = app.paymentAmount || 35000;
                                      setSenasInput({ appId: app.id, value: String(Math.floor(defaultAmount / 2)) });
                                    }}
                                    className={`w-full text-left px-4 py-2 text-xs font-bold border-b border-slate-50 transition-colors flex items-center justify-between ${app.paymentStatus === 'senado' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:bg-slate-50'}`}
                                  >
                                    Señado
                                    {app.paymentStatus === 'senado' && <CheckCircle2 size={12} />}
                                  </button>

                                  {/* Inline seña input - aparece dentro del dropdown */}
                                  {senasInput.appId === app.id && (
                                    <div className="px-3 py-2 border-b border-slate-100 bg-indigo-50/50" onClick={e => e.stopPropagation()}>
                                      <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-2">Monto de la seña</p>
                                      <div className="flex gap-2">
                                        <div className="relative flex-1">
                                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-indigo-500">$</span>
                                          <input
                                            type="number"
                                            autoFocus
                                            min="0"
                                            value={senasInput.value}
                                            onChange={e => setSenasInput(prev => ({ ...prev, value: e.target.value }))}
                                            onKeyDown={e => {
                                              if (e.key === 'Enter') {
                                                const amount = Number(senasInput.value);
                                                store.updateAppointmentPaymentStatus(app.id, { paymentStatus: 'senado', paidAmount: amount });
                                                if (amount > 0) {
                                                  store.createTransaction({
                                                    id: Date.now(),
                                                    date: new Date().toISOString(),
                                                    type: 'Ingreso',
                                                    concept: `Seña ${app.title} — ${app.patient}`,
                                                    method: app.paymentMethod || 'Efectivo',
                                                    amount,
                                                    notes: `Desde Agenda (Seña #${app.id})`,
                                                    doctor_id: app.doctorId,
                                                    patient_id: app.patientId
                                                  });
                                                }
                                                setSenasInput({ appId: null, value: '' });
                                                setActiveDropdown(null);
                                              }
                                              if (e.key === 'Escape') setSenasInput({ appId: null, value: '' });
                                            }}
                                            className="w-full pl-6 pr-2 py-1.5 text-sm font-bold text-indigo-700 bg-white border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200"
                                            placeholder="0"
                                          />
                                        </div>
                                        <button
                                          onClick={e => {
                                            e.stopPropagation();
                                            const amount = Number(senasInput.value);
                                            store.updateAppointmentPaymentStatus(app.id, { paymentStatus: 'senado', paidAmount: amount });
                                            if (amount > 0) {
                                              store.createTransaction({
                                                id: Date.now(),
                                                date: new Date().toISOString(),
                                                type: 'Ingreso',
                                                concept: `Seña ${app.title} — ${app.patient}`,
                                                method: app.paymentMethod || 'Efectivo',
                                                amount,
                                                notes: `Desde Agenda (Seña #${app.id})`,
                                                doctor_id: app.doctorId,
                                                patient_id: app.patientId
                                              });
                                            }
                                            setSenasInput({ appId: null, value: '' });
                                            setActiveDropdown(null);
                                          }}
                                          className="px-2.5 py-1.5 bg-indigo-600 text-white text-xs font-black rounded-lg hover:bg-indigo-700 transition-colors shrink-0"
                                        >
                                          OK
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  <div className="px-4 py-2 text-[10px] font-black text-[var(--text-secondary)] opacity-40 uppercase tracking-[0.2em] bg-[var(--bg-sidebar)]/50 border-b border-[var(--border-color)]/30">Estados de Asistencia</div>
                                  <button onClick={(e) => handleStatusChange(e, app.id, 'agendado')} className="w-full text-left px-5 py-2.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--accent-light)] transition-all flex items-center gap-3"><Clock size={15} className="opacity-40"/> Agendado</button>
                                  <button onClick={(e) => handleStatusChange(e, app.id, 'confirmado')} className="w-full text-left px-5 py-2.5 text-xs font-bold text-emerald-500 hover:bg-emerald-500/10 transition-all flex items-center gap-3"><UserCheck size={15} className="opacity-60"/> Confirmado</button>
                                  <button onClick={(e) => handleStatusChange(e, app.id, 'en_espera')} className="w-full text-left px-5 py-2.5 text-xs font-bold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 transition-all flex items-center gap-3"><CalendarDays size={15} className="opacity-60"/> Llegó a Sala</button>
                                  <button onClick={(e) => handleStatusChange(e, app.id, 'finalizado')} className="w-full text-left px-5 py-2.5 text-xs font-bold text-blue-500 hover:bg-blue-500/10 transition-all flex items-center gap-3"><CheckCircle2 size={15} className="opacity-60"/> Finalizado</button>
                                  <button onClick={(e) => handleStatusChange(e, app.id, 'ausente')} className="w-full text-left px-5 py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-all border-b border-[var(--border-color)]/30 flex items-center gap-3"><UserX size={15} className="opacity-60"/> Ausente / Canceló</button>
                                </>
                              )}

                              {activeDropdown === app.id && userRole === 'medico' && (
                                <div className="px-5 py-2.5 text-[10px] font-black text-[var(--text-secondary)] opacity-30 italic uppercase tracking-widest border-b border-[var(--border-color)]/20">
                                  Información Reservada
                                </div>
                              )}

                               {/* — Comprobante button (only when paid or señado) — */}
                               {(app.paymentStatus === 'pagado' || app.paymentStatus === 'senado') && (
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setReceiptApp(app);
                                     setActiveDropdown(null);
                                   }}
                                   className="w-full text-left px-5 py-3 text-xs font-black text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 transition-all border-b border-[var(--border-color)]/30 flex items-center gap-3"
                                 >
                                   <Receipt size={16} className="opacity-70" /> Imprimir Comprobante
                                 </button>
                               )}

                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   handleSendWhatsApp(app);
                                   setActiveDropdown(null);
                                 }}
                                 className="w-full text-left px-5 py-3 text-xs font-bold text-emerald-600 hover:bg-emerald-500/10 transition-all border-b border-[var(--border-color)]/30 flex items-center gap-3"
                               >
                                 <MessageCircle size={16} className="opacity-70" /> Recordatorio WhatsApp
                               </button>

                              <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   handleOpenEdit(app);
                                 }}
                                className="w-full text-left px-5 py-3 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--accent-light)] transition-all border-b border-[var(--border-color)]/30 flex items-center gap-3"
                              >
                                <Eye size={16} className="opacity-40" /> {userRole === 'medico' ? 'Ver ficha detallada' : 'Editar detalles'}
                              </button>
                              
                              {userRole !== 'medico' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdown(null);
                                    setConfirmDelete(app.id);
                                  }}
                                  className="w-full text-left px-5 py-3 text-xs font-black text-rose-500 hover:bg-rose-500/10 transition-all flex items-center gap-3"
                                >
                                  <Trash2 size={16} className="opacity-60" /> Eliminar {isBlock ? 'bloqueo' : 'turno'}
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>

    {/* MODAL DE NUEVO TURNO / BLOQUEO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-fade-in-quick" onClick={closeModal}></div>
          
          <div className="relative bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-7 border-b border-[var(--border-color)]/30 bg-[var(--bg-sidebar)]/50 backdrop-blur-xl shrink-0">
              <div className="flex flex-col">
                <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight">
                  {editingAppointmentId ? (isBlockMode ? "Editar Bloqueo" : "Ficha del Turno") : "Agendar Paciente o Evento"}
                </h2>
                <p className="text-[10px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-[0.2em] mt-1">Gestión Centralizada de Agenda</p>
              </div>
              <button onClick={closeModal} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-2.5 hover:bg-[var(--accent-light)] rounded-2xl transition-all border border-transparent hover:border-[var(--border-color)]">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSaveAppointment} className="flex-1 overflow-y-auto p-7 space-y-8 custom-scrollbar">
              
              {!editingAppointmentId && (
                <div className="flex gap-2 p-1.5 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)]/50 shadow-inner">
                  <button type="button" onClick={() => setIsBlockMode(false)} className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${!isBlockMode ? 'bg-[var(--bg-card)] text-[var(--accent-primary)] shadow-md border border-[var(--border-color)]' : 'text-[var(--text-secondary)] opacity-50 hover:opacity-100'}`}>Turno de Paciente</button>
                  <button type="button" onClick={() => setIsBlockMode(true)} className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${isBlockMode ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-md border border-[var(--border-color)]' : 'text-[var(--text-secondary)] opacity-50 hover:opacity-100'}`}>Bloqueo de Agenda</button>
                </div>
              )}

              {/* Bloque Condicional: Si NO es Bloqueo, pedir info de paciente */}
              {!isBlockMode && (
                <div className="space-y-6 bg-[var(--bg-main)]/50 p-6 rounded-3xl border border-[var(--border-color)]/50 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[var(--accent-primary)] opacity-20"></div>
                  <div className="flex items-center gap-4 mb-3">
                    <button type="button" onClick={() => setIsNewPatient(false)} className={`text-[10px] font-black uppercase tracking-widest px-5 py-2 rounded-full transition-all border ${!isNewPatient ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-lg shadow-[var(--accent-primary)]/20' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--accent-primary)]/30'}`}>Frecuente</button>
                    <button type="button" onClick={() => setIsNewPatient(true)} className={`text-[10px] font-black uppercase tracking-widest px-5 py-2 rounded-full transition-all border ${isNewPatient ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-lg shadow-[var(--accent-primary)]/20' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--accent-primary)]/30'}`}>Primera Vez</button>
                  </div>

                  {!isNewPatient ? (
                    <div className="space-y-4">
                      <div className="relative group/search">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-40 group-focus-within/search:text-[var(--accent-primary)] group-focus-within/search:opacity-100 transition-all" size={18} />
                        <input 
                          type="text" 
                          placeholder="Buscar por Nombre, DNI o NHC..." 
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-sm font-bold text-[var(--text-primary)] focus:border-[var(--accent-primary)]/50 focus:ring-4 focus:ring-[var(--accent-primary)]/5 transition-all outline-none shadow-sm placeholder:text-[var(--text-secondary)]/30"
                        />
                      </div>
                      
                      <select 
                        required={!isNewPatient} 
                        value={formData.patientId} 
                        onChange={(e) => setFormData({...formData, patientId: e.target.value})} 
                        className="w-full px-5 py-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl focus:border-[var(--accent-primary)]/50 focus:ring-4 focus:ring-[var(--accent-primary)]/5 outline-none transition-all cursor-pointer text-sm font-black text-[var(--text-primary)] shadow-sm appearance-none"
                      >
                        <option value="" disabled className="bg-[var(--bg-card)]">Seleccionar resultado...</option>
                        {(patients || [])
                          .filter(p => p && p.name && (
                            p.name.toLowerCase().includes(patientSearch.toLowerCase()) || 
                            (p.dni || '').includes(patientSearch) ||
                            (p.nhc || '').toLowerCase().includes(patientSearch.toLowerCase())
                          ))
                          .map(p => <option key={p.id} value={p.id} className="bg-[var(--bg-card)]">{p.name} - {p.coverage || 'Particular'} {p.dni ? `(${p.dni})` : ''}</option>)
                        }
                      </select>
                      {patientSearch && patients.filter(p => !p.name.toLowerCase().includes(patientSearch.toLowerCase()) && !(p.dni || '').includes(patientSearch)).length === (patients || []).length && (
                        <p className="text-[10px] font-black text-rose-500 ml-4 flex items-center gap-1 uppercase tracking-wider animate-pulse">
                          <AlertCircle size={12} /> No se encontraron coincidencias
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6 animate-fade-in-quick">
                      {/* Sub-Bloque: Identidad */}
                      <div className="bg-[var(--bg-card)] p-5 rounded-3xl border border-[var(--border-color)]/50 shadow-sm">
                        <h4 className="text-[10px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                           <User size={12} className="text-[var(--accent-primary)]" /> Identidad Personal
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <input type="text" required={isNewPatient} placeholder="Nombre Completo *" value={formData.newPatientName} onChange={(e) => setFormData({...formData, newPatientName: e.target.value})} className="col-span-2 w-full px-5 py-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/50 shadow-inner transition-all" />
                          <input type="text" required={isNewPatient} placeholder="DNI / Pasaporte *" value={formData.dni} onChange={(e) => setFormData({...formData, dni: e.target.value.replace(/[^0-9Aa-z]/g, '')})} className="w-full px-5 py-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/50 shadow-inner transition-all" />
                          <div>
                            <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} className="w-full px-5 py-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/50 shadow-inner cursor-pointer appearance-none transition-all">
                              <option value="femenino" className="bg-[var(--bg-card)]">Femenino</option>
                              <option value="masculino" className="bg-[var(--bg-card)]">Masculino</option>
                              <option value="otro" className="bg-[var(--bg-card)]">Otro</option>
                              <option value="prefiero_no_decir" className="bg-[var(--bg-card)]">Prefiero no decirlo</option>
                            </select>
                          </div>
                          <div className="col-span-2">
                             <label className="block text-[10px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-widest mb-1.5 ml-2">Fecha de Nacimiento *</label>
                             <input type="date" required={isNewPatient} value={formData.birthDate} onChange={(e) => setFormData({...formData, birthDate: e.target.value})} className="w-full px-5 py-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/50 shadow-inner transition-all" />
                          </div>
                        </div>
                      </div>

                      {/* Sub-Bloque: Contacto */}
                      <div className="bg-[var(--bg-card)] p-5 rounded-3xl border border-[var(--border-color)]/50 shadow-sm">
                        <h4 className="text-[10px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                           <Calendar size={12} className="text-[var(--accent-primary)]" /> Contacto & Emergencia
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <input type="tel" required={isNewPatient} placeholder="Celular (11223344) *" value={formData.newPatientPhone} onChange={(e) => setFormData({...formData, newPatientPhone: e.target.value.replace(/[^0-9]/g, '')})} className="w-full px-5 py-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/50 shadow-inner transition-all" />
                          <input type="email" placeholder="Correo Electrónico" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-5 py-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/50 shadow-inner transition-all" />
                          <input type="text" placeholder="Dirección Postal" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="col-span-2 w-full px-5 py-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/50 shadow-inner transition-all" />
                          <div className="col-span-2 relative">
                            <input 
                              type="text" 
                              required={isNewPatient} 
                              placeholder="Contacto de Emergencia *" 
                              value={formData.emergencyContact} 
                              onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})} 
                              className="w-full px-5 py-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/50 shadow-inner transition-all" 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Sub-Bloque: Cobertura */}
                      <div className="bg-[var(--bg-card)] p-5 rounded-3xl border border-[var(--border-color)]/50 shadow-sm">
                         <h4 className="text-[10px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Stethoscope size={12} className="text-[var(--accent-primary)]" /> Cobertura Médica
                         </h4>
                         <div className="grid grid-cols-1 gap-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                               <select value={formData.coverage} onChange={(e) => setFormData({...formData, coverage: e.target.value})} className="w-full px-5 py-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl text-sm font-black text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/50 shadow-inner cursor-pointer appearance-none transition-all">
                                 <option value="Particular" className="bg-[var(--bg-card)]">Particular / Privado</option>
                                 <option value="OSDE" className="bg-[var(--bg-card)]">OSDE</option>
                                 <option value="Swiss Medical" className="bg-[var(--bg-card)]">Swiss Medical</option>
                                 <option value="Galeno" className="bg-[var(--bg-card)]">Galeno</option>
                                 <option value="Sancor Salud" className="bg-[var(--bg-card)]">Sancor Salud</option>
                                 <option value="IOMA" className="bg-[var(--bg-card)]">IOMA</option>
                                 <option value="PAMI" className="bg-[var(--bg-card)]">PAMI</option>
                                 <option value="OSECAC" className="bg-[var(--bg-card)]">OSECAC</option>
                                 <option value="Medifé" className="bg-[var(--bg-card)]">Medifé</option>
                                 <option value="Omint" className="bg-[var(--bg-card)]">Omint</option>
                                 <option value="Unión Personal" className="bg-[var(--bg-card)]">Unión Personal</option>
                               </select>

                               {formData.coverage !== 'Particular' && (
                                 <div className="relative group">
                                   <input 
                                     type="text" 
                                     required 
                                     placeholder="Nº Afiliado *" 
                                     value={formData.coverageNumber} 
                                     onChange={(e) => setFormData({...formData, coverageNumber: e.target.value})} 
                                     className="w-full px-5 py-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/50 shadow-inner transition-all pr-12" 
                                   />
                                   <button 
                                     type="button"
                                     title="Validar en portal oficial"
                                     onClick={() => {
                                       const portals = {
                                         'IOMA': 'https://sistemas.ioma.gba.gov.ar/Arquitectura/Paginas/Consultas/ConsultasPublicas/Padron/ConsultaPadron.aspx',
                                         'PAMI': 'https://www.pami.org.ar/consulta-padron',
                                         'OSDE': 'https://www.osde.com.ar/',
                                         'Swiss Medical': 'https://www.swissmedical.com.ar/',
                                         'OSECAC': 'https://www.osecac.org.ar/'
                                       };
                                       const url = portals[formData.coverage] || `https://www.google.com/search?q=validar+afiliado+${formData.coverage}`;
                                       window.open(url, '_blank');
                                     }}
                                     className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 rounded-xl transition-all"
                                   >
                                     <RefreshCw size={16} />
                                   </button>
                                 </div>
                               )}
                            </div>
                         </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-[var(--accent-light)] p-5 rounded-3xl border border-[var(--accent-primary)]/10 mt-6 relative overflow-hidden group/triaje">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-[var(--accent-primary)]/5 rounded-full -mr-10 -mt-10 transition-transform group-hover/triaje:scale-150 duration-700"></div>
                    <h4 className="text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                       <Plus size={12} /> Motivo y Triaje Clínico
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                         <input type="text" placeholder="Profesional derivante (Opcional)" value={formData.referrer} onChange={(e) => setFormData({...formData, referrer: e.target.value})} className="w-full px-5 py-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] shadow-sm transition-all" />
                      </div>
                      <div>
                         <label className="block text-[10px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-widest mb-1.5 ml-2">Motivo / Tratamiento</label>
                         <input type="text" required placeholder="Ej: Psicoterapia" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-5 py-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] shadow-sm transition-all" />
                      </div>
                      <div>
                         <label className="block text-[10px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-widest mb-1.5 ml-2">Notas Clínicas</label>
                         <input type="text" placeholder="Observaciones..." value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full px-5 py-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] shadow-sm transition-all" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Si ES Bloqueo, pedir solo motivo */}
              {isBlockMode && (
                <div className="bg-[var(--bg-main)] p-7 rounded-[2rem] border border-[var(--border-color)] border-dashed relative group/block">
                  <div className="absolute top-0 left-0 w-1 h-full bg-rose-500 opacity-20"></div>
                  <label className="block text-xs font-black text-[var(--text-primary)] uppercase tracking-[0.2em] mb-3 ml-1 flex items-center gap-2">
                    <Lock size={14} className="text-rose-500" /> Evento Restringido (Bloqueo)
                  </label>
                  <input type="text" required placeholder="Ej: Almuerzo, Reunión, Ausencia" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-6 py-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl focus:border-rose-400 focus:ring-8 focus:ring-rose-500/5 outline-none transition-all shadow-md font-bold text-[var(--text-primary)] tracking-tight text-lg" />
                </div>
              )}

              {/* BLOQUE DE TIEMPO Y DOCTOR (Unificado para más elegancia) */}
              <div className="bg-[var(--bg-sidebar)]/30 border border-[var(--border-color)] p-6 rounded-[2rem] shadow-sm flex flex-col gap-6 relative overflow-hidden">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-widest mb-2 ml-2">Profesional Responsable</label>
                    <select required value={formData.doctorId} onChange={(e) => setFormData({...formData, doctorId: Number(e.target.value)})} className="w-full px-6 py-4 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-3xl focus:border-[var(--accent-primary)]/50 outline-none font-black cursor-pointer shadow-lg shadow-indigo-500/5 transition-all text-base appearance-none">
                      {(doctors || []).filter(d => d && d.id).map(d => <option key={d.id} value={d.id} className="bg-[var(--bg-card)]">Dr. {d.name || 'Sin nombre'} — {d.specialty || 'General'}</option>)}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-widest mb-2 ml-2">Fecha</label>
                    <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl outline-none focus:border-[var(--accent-primary)] text-sm font-black text-center text-[var(--text-primary)] transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-widest mb-2 ml-2">Hora Inicio</label>
                    <input type="time" required min="06:00" max="22:00" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} className="w-full px-4 py-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl outline-none focus:border-[var(--accent-primary)] text-sm font-black text-center text-[var(--text-primary)] transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-widest mb-2 ml-2">Duración</label>
                    <select value={formData.duration} onChange={(e) => setFormData({...formData, duration: Number(e.target.value)})} className="w-full px-2 py-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl outline-none focus:border-[var(--accent-primary)] text-sm font-black cursor-pointer text-center text-[var(--text-primary)] appearance-none transition-all">
                      <option value={0.5} className="bg-[var(--bg-card)]">30M</option>
                      <option value={1} className="bg-[var(--bg-card)]">1 Hora</option>
                      <option value={1.5} className="bg-[var(--bg-card)]">1.5 Hrs</option>
                      <option value={2} className="bg-[var(--bg-card)]">2 Hrs</option>
                    </select>
                  </div>
                </div>

                {!editingAppointmentId && (
                  <div className="pt-2 border-t border-[var(--border-color)]/30 mt-2">
                     <span className="text-[10px] font-black text-[var(--text-secondary)] opacity-40 uppercase tracking-[0.2em] block mb-3 ml-2">Recurrencia Programada</span>
                     <select value={recurringWeeks} onChange={(e) => setRecurringWeeks(Number(e.target.value))} className="w-full px-4 py-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl outline-none text-[var(--text-primary)] font-black text-sm focus:border-[var(--accent-primary)] cursor-pointer appearance-none shadow-inner transition-all">
                        <option value={0} className="bg-[var(--bg-card)]">Instancia única (Sin recurrencia)</option>
                        <option value={3} className="bg-[var(--bg-card)]">Repetir semanalmente (1 Mes / 4 citas)</option>
                        <option value={7} className="bg-[var(--bg-card)]">Repetir semanalmente (2 Meses / 8 citas)</option>
                      </select>
                  </div>
                )}
              </div>

              {/* FACTURACIÓN Y PAGO (Solo si no es Bloqueo y NO es medico) */}
              {!isBlockMode && userRole !== 'medico' && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 p-7 rounded-[2rem] shadow-sm relative group/billing">
                  <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500 opacity-20 transition-opacity group-hover/billing:opacity-40"></div>
                  <h4 className="text-[11px] font-black text-emerald-500 uppercase mb-6 flex items-center gap-3 tracking-[0.2em]">
                    <Wallet size={16} /> Facturación y Cobro Directo
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Estado de Pago */}
                    <div className="col-span-full">
                      <label className="block text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-3 ml-2">Gestión del Estado de Pago</label>
                      <div className="flex gap-2 p-1.5 bg-[var(--bg-main)] border border-[var(--border-color)]/50 rounded-2xl shadow-inner">
                        <button 
                          type="button" 
                          onClick={() => setFormData({...formData, paymentStatus: 'pendiente'})}
                          className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${formData.paymentStatus === 'pendiente' ? 'bg-[var(--bg-card)] text-rose-500 shadow-md border border-[var(--border-color)]' : 'text-[var(--text-secondary)] opacity-50 hover:opacity-100'}`}
                        >
                          Pendiente
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setFormData({...formData, paymentStatus: 'senado'})}
                          className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${formData.paymentStatus === 'senado' ? 'bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/20' : 'text-[var(--text-secondary)] opacity-50 hover:opacity-100'}`}
                        >
                          Señado
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setFormData({...formData, paymentStatus: 'pagado'})}
                          className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${formData.paymentStatus === 'pagado' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-[var(--text-secondary)] opacity-50 hover:opacity-100'}`}
                        >
                          Abonado
                        </button>
                      </div>
                    </div>

                    {/* Monto Total */}
                    <div>
                      <label className="block text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-2 ml-2">Monto del Arancel ($)</label>
                      <div className="relative group/amount">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-emerald-500/30 group-focus-within/amount:text-emerald-500 transition-colors">$</span>
                        <input 
                          type="number" 
                          placeholder="0.00" 
                          value={formData.paymentAmount} 
                          onChange={(e) => setFormData({...formData, paymentAmount: e.target.value})} 
                          className="w-full px-6 py-4 bg-[var(--bg-card)] border border-emerald-500/10 rounded-2xl text-xl font-black text-emerald-500 outline-none focus:border-emerald-500 focus:ring-8 focus:ring-emerald-500/5 shadow-md transition-all placeholder:text-emerald-500/10" 
                        />
                      </div>
                    </div>

                    {/* Medio de Pago Estilizado */}
                    <div className="col-span-full">
                      <label className="block text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-3 ml-2">Vía de Recepción del Cobro</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { id: 'Efectivo', lbl: 'Papel Moneda', sub: 'Efectivo', icon: <Wallet size={16} />, color: 'emerald' },
                          { id: 'Mercado-Pago', lbl: 'Billetera Digital', sub: 'MP / Virtual', icon: <Activity size={16} />, color: 'sky' },
                          { id: 'Tarjeta', lbl: 'Plástico / Bank', sub: 'Deb / Cred', icon: <Landmark size={16} />, color: 'indigo' }
                        ].map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setFormData({...formData, paymentMethod: m.id})}
                            className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group/method ${
                              formData.paymentMethod === m.id 
                                ? `bg-${m.color}-500 text-white border-${m.color}-500 shadow-lg shadow-${m.color}-500/20 scale-[1.02]` 
                                : `bg-[var(--bg-main)] border-[var(--border-color)]/50 text-[var(--text-secondary)] hover:border-${m.color}-400/50 hover:bg-${m.color}-500/5`
                            }`}
                          >
                            <div className={`p-2.5 rounded-xl transition-colors ${formData.paymentMethod === m.id ? 'bg-white/20' : `bg-${m.color}-500/10 text-${m.color}-500`}`}>
                              {m.icon}
                            </div>
                            <div className="min-w-0">
                              <p className={`text-[10px] font-black uppercase tracking-wider leading-none ${formData.paymentMethod === m.id ? 'text-white' : 'text-[var(--text-primary)] opacity-80'}`}>{m.lbl}</p>
                              <p className={`text-[9px] font-bold mt-1.5 opacity-60 ${formData.paymentMethod === m.id ? 'text-white' : ''}`}>{m.sub}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Campos Condicionales: Seña */}
                    {formData.paymentStatus === 'senado' && (
                      <div className="col-span-full animate-fade-in-up">
                        <label className="block text-[10px] font-black [var(--accent-primary)] uppercase tracking-widest mb-2 ml-2 italic">Monto de la Seña (Registro parcial)</label>
                        <input 
                          type="number" 
                          placeholder="¿Cuánto abonó hoy?" 
                          value={formData.paidAmount} 
                          onChange={(e) => setFormData({...formData, paidAmount: e.target.value})} 
                          className="w-full px-6 py-4 bg-[var(--accent-light)] border border-[var(--accent-primary)]/20 rounded-2xl text-xl font-black text-[var(--accent-primary)] outline-none focus:ring-8 focus:ring-[var(--accent-primary)]/5 shadow-inner transition-all" 
                        />
                      </div>
                    )}

                    {/* Resumen de Cobro Premium */}
                    {formData.paymentStatus !== 'pendiente' && (
                      <div className="col-span-full mt-4">
                        <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden text-white border border-white/5">
                          <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-bl-full -z-0"></div>
                          
                          <div className="relative z-10 space-y-6">
                            <div className="flex justify-between items-end border-b border-white/10 pb-6">
                              <div>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Carga Operativa</p>
                                <h5 className="text-2xl font-black tracking-tight">Resumen de Cobro</h5>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">ID Ref</p>
                                <p className="text-xs font-mono opacity-60">#{editingAppointmentId || 'NEW'}</p>
                              </div>
                            </div>

                            {(() => {
                                const originalApp = editingAppointmentId ? appointments.find(a => a.id === editingAppointmentId) : null;
                                const alreadyPaid = Number(originalApp?.paidAmount || (originalApp?.paymentStatus === 'pagado' ? originalApp.paymentAmount : 0)) || 0;
                                const totalArancel = Number(formData.paymentAmount || 0);
                                const currentTarget = formData.paymentStatus === 'pagado' ? totalArancel : Number(formData.paidAmount || 0);
                                const saldoPendiente = Math.max(0, currentTarget - alreadyPaid);
                                const vuelto = Math.max(0, (Number(cashReceived) || 0) - saldoPendiente);

                                return (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                    <div className="space-y-4">
                                      <div className="flex justify-between items-center text-sm font-medium border-b border-white/5 pb-2">
                                        <span className="opacity-50">Total del Arancel</span>
                                        <span className="font-black">${totalArancel.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between items-center text-sm font-medium border-b border-white/5 pb-2">
                                        <span className="opacity-50">Señas / Pagos Previos</span>
                                        <span className="text-rose-400 font-bold">-${alreadyPaid.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between items-center pt-2">
                                        <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Neto a Cobrar Hoy</span>
                                        <span className="text-3xl font-black text-emerald-400 tracking-tighter">${saldoPendiente.toLocaleString()}</span>
                                      </div>
                                    </div>

                                    {formData.paymentMethod === 'Efectivo' && (
                                      <div className="bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-sm">
                                        <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">Calculadora de Vuelto</label>
                                        <div className="space-y-4">
                                          <div>
                                            <p className="text-[9px] font-bold text-emerald-400/60 mb-1 ml-1 uppercase">Paga con:</p>
                                            <input 
                                              type="number" 
                                              placeholder="Monto..." 
                                              value={cashReceived} 
                                              onChange={(e) => setCashReceived(e.target.value)} 
                                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xl font-black text-emerald-400 outline-none focus:border-emerald-500 transition-all placeholder:text-white/10" 
                                            />
                                          </div>
                                          <div>
                                            <p className="text-[9px] font-bold text-white/40 mb-1 ml-1 uppercase">Vuelto resultante:</p>
                                            <div className="text-3xl font-black text-white tracking-tighter">${vuelto.toLocaleString()}</div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <p className="mt-5 text-[10px] text-emerald-600/70 font-bold italic flex items-center gap-2 uppercase tracking-wide opacity-80">
                    <AlertCircle size={14} /> 
                    {formData.paymentStatus === 'pendiente' 
                      ? 'No se registrarán movimientos financieros aún.' 
                      : 'Al procesar, se emitirá automáticamente la transacción en Finanzas.'}
                  </p>
                </div>
              )}

              {/* FOOTER ACTIONS */}
              <div className="pt-6 flex gap-4 shrink-0 mt-4 border-t border-[var(--border-color)]/30">
                <button type="button" onClick={closeModal} className={`${userRole === 'medico' ? 'w-full' : 'w-1/3'} py-4 text-xs font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-main)] hover:bg-[var(--accent-light)] rounded-2xl border border-[var(--border-color)] transition-all`}>{userRole === 'medico' ? 'Finalizar Vista' : 'Cancelar operacion'}</button>
                {userRole !== 'medico' && (
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className={`w-2/3 py-4 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3 ${isSaving ? 'bg-[var(--text-secondary)] opacity-50 cursor-not-allowed shadow-none' : 'bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] shadow-[var(--accent-primary)]/20'}`}
                  >
                    {isSaving ? <RefreshCw className="animate-spin" size={18} /> : (editingAppointmentId ? '✓' : <Plus size={18} />)}
                    {isSaving ? "Procesando..." : (editingAppointmentId ? "Confirmar Cambios" : (isBlockMode ? "Registrar Bloqueo" : "Agendar y Guardar"))}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ConfirmDialog: Colisión al guardar */}
      <ConfirmDialog
        isOpen={confirmOverlapSave}
        onConfirm={() => {
          setConfirmOverlapSave(false);
          proceedSave();
        }}
        onCancel={() => setConfirmOverlapSave(false)}
        title="Colisión de Horario"
        description="Ya existe un turno o bloqueo agendado en este rango horario para este profesional. ¿Deseas forzar el guardado como un SOBRE-TURNO de todas formas?"
        confirmText="Forzar Sobre-Turno"
        cancelText="Cancelar"
        variant="warning"
      />

      {/* ConfirmDialog: Colisión al arrastrar */}
      <ConfirmDialog
        isOpen={confirmOverlapDrop}
        onConfirm={() => {
          setConfirmOverlapDrop(false);
          if (pendingDrop) {
            proceedDrop(pendingDrop.targetCol, pendingDrop.newTime);
            setPendingDrop(null);
          }
        }}
        onCancel={() => {
          setConfirmOverlapDrop(false);
          setPendingDrop(null);
          setDraggedApp(null);
        }}
        title="Colisión de Horario"
        description="Ya existe un turno o bloqueo en este rango horario. ¿Deseas soltar el turno y crear un SOBRE-TURNO?"
        confirmText="Crear Sobre-Turno"
        cancelText="Cancelar"
        variant="warning"
      />

      {/* Alerta de Horarios de Trabajo */}
      <ConfirmDialog
        isOpen={workHoursAlert !== null}
        onConfirm={() => setWorkHoursAlert(null)}
        showCancel={false}
        title={workHoursAlert?.title}
        description={workHoursAlert?.description}
        confirmText="Entendido"
        variant={workHoursAlert?.variant}
      />

      {/* ConfirmDialog: Eliminar turno/bloqueo */}
      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onConfirm={() => {
          if (confirmDelete !== null) {
            store.deleteAppointment(confirmDelete);
            setConfirmDelete(null);
          }
        }}
        onCancel={() => setConfirmDelete(null)}
        title="Eliminar Turno"
        description="Esta acción no se puede deshacer. ¿Estás seguro de que deseas eliminar este turno?"
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />

      {/* Payment Receipt Modal */}
      {receiptApp && (
        <PaymentReceiptModal
          appointment={receiptApp}
          doctor={doctors.find(d => d.id === receiptApp.doctorId) || null}
          onClose={() => setReceiptApp(null)}
        />
      )}

      {/* GLOBAL MOBILE MENU - Desacoplado para evitar conflictos de eventos y remounting */}
      {isMobile && menuApp && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center">
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" 
            onClick={() => setMenuApp(null)}
          ></div>
          <div className="relative w-full bg-[var(--bg-card)] rounded-t-[32px] p-6 pb-12 animate-fade-in-up shadow-2xl space-y-2 border-t border-[var(--border-color)]">
            <div className="w-12 h-1.5 bg-slate-400/20 rounded-full mx-auto mb-6"></div>
            
            <div className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-[var(--border-color)]/30 mb-2">
              Acciones para {menuApp.patient}
            </div>
            
            <button 
              onClick={() => handleSendWhatsApp(menuApp)} 
              className="w-full text-left px-5 py-4 text-sm font-bold text-emerald-500 hover:bg-emerald-500/10 flex items-center gap-4 transition-all rounded-xl"
            >
              <MessageCircle size={22} />
              <span>Recordatorio WhatsApp</span>
            </button>
            
            <button 
              onClick={(e) => handleStatusChange(e, menuApp.id, 'en_espera')} 
              className="w-full text-left px-5 py-4 text-sm font-bold text-sky-500 hover:bg-sky-500/10 flex items-center gap-4 transition-all rounded-xl"
            >
              <CalendarDays size={22} />
              <span>Marcar como "Llegó a Sala"</span>
            </button>

            <button 
              onClick={() => handleViewPatient(menuApp)} 
              className="w-full text-left px-5 py-4 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--accent-light)] flex items-center gap-4 transition-all rounded-xl"
            >
              <Eye size={22} />
              <span>Ver Ficha Médica</span>
            </button>

            <button 
              onClick={() => setMenuApp(null)} 
              className="w-full py-4 text-sm font-black text-slate-400 mt-4 hover:text-[var(--text-primary)] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
