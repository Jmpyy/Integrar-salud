import { useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../../../stores/useStore';
import { toast } from 'react-hot-toast';
import {
  ChevronLeft, ChevronRight, Plus, Search, Clock, User, Landmark,
  MoreHorizontal, X, UserCheck, AlertCircle, CheckCircle2, UserX, UserMinus, Filter, CalendarDays, Lock, Wallet, RefreshCw,
  Calendar, Stethoscope, Receipt, Eye, Trash2, ReceiptText, MessageCircle, Activity, Video, Copy
} from 'lucide-react';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import PaymentReceiptModal from '../../../components/PaymentReceiptModal/PaymentReceiptModal';
import { generateNHC, nowForAPI } from '../../../utils/helpers';
import { BUSINESS_HOURS, TIME_SLOT_ROUNDING } from '../../../config/constants';
import { createPortal } from 'react-dom';
import { playPopSound, playSuccessSound, playCashSound, playErrorSound } from '../../../utils/sounds';
import CustomDatePicker from '../../../components/ui/CustomDatePicker';
import CustomTimePicker from '../../../components/ui/CustomTimePicker';
import { socket } from '../../../services/socket';

export default function AgendaPage() {
  const store = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const appointments = store.appointments;
  const doctors = store.doctors;
  const patients = store.patients;
  const { userRole, user, globalConfig } = store;
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
  const DEFAULT_HOURS = {
    1: { enabled: true,  start: '09:00', end: '18:00' },
    2: { enabled: true,  start: '09:00', end: '18:00' },
    3: { enabled: true,  start: '09:00', end: '18:00' },
    4: { enabled: true,  start: '09:00', end: '18:00' },
    5: { enabled: true,  start: '09:00', end: '18:00' },
    6: { enabled: false, start: '09:00', end: '13:00' },
    0: { enabled: false, start: '09:00', end: '13:00' },
  };

  const config = store.globalConfig 
    ? { ...store.globalConfig, hours: store.globalConfig.hours || DEFAULT_HOURS }
    : { hours: DEFAULT_HOURS };

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
  const [senasInput, setSenasInput] = useState({ appId: null, value: '' }); // inline seña input (desktop)
  const [mobileSeñaInput, setMobileSeñaInput] = useState({ active: false, value: '' }); // seña input en bottom sheet mobile
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
    type: '',
    modalidad: 'presencial',
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
    paidMethod: 'Efectivo',
    codigoAcceso: '',
    meetLink: '',
    estadoVideollamada: 'pendiente'
  };

  const [formData, setFormData] = useState(defaultForm);
  const [cashReceived, setCashReceived] = useState('');

  const isDateDisabled = (dateStr) => {
    if (!globalConfig || !globalConfig.hours) return false;
    const d = new Date(dateStr + 'T12:00:00Z');
    const dayOfWeek = d.getDay();
    const configDay = globalConfig.hours[dayOfWeek];
    if (configDay && configDay.enabled === false) return true;
    return false;
  };

  const getDayConfig = (dateStr) => {
    if (!globalConfig || !globalConfig.hours || !dateStr) return { start: '06:00', end: '22:00' };
    const d = new Date(dateStr + 'T12:00:00Z');
    const configDay = globalConfig.hours[d.getDay()];
    if (configDay && configDay.enabled) {
      return { start: configDay.start, end: configDay.end };
    }
    return { start: '06:00', end: '22:00' };
  };
  const currentDayConfig = getDayConfig(formData.date);

  // Handle auto-open for "New Appointment" via query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('new') === 'true' && userRole !== 'medico') {
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
    // Vista Diaria (Daily) — si "Mis Turnos" está activo, solo mostrar columna del médico logueado
    const doctorsToShow = (userRole === 'medico' && myTurnosOnly && myDoctor)
      ? [myDoctor]
      : (visibleDoctors || []);

    doctorsToShow.forEach(d => {
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

    // 0. Validar Paciente
    if (!isBlockMode && !isNewPatient && !formData.patientId) {
      toast.error('Por favor, selecciona un paciente o elige "Primera Vez" para cargar uno nuevo.');
      return;
    }

    if (!isBlockMode && isNewPatient && formData.dni) {
      const existingPatient = patients.find(p => p.dni === formData.dni);
      if (existingPatient) {
        toast.error(`El DNI ${formData.dni} ya está registrado a nombre de ${existingPatient.name}. Búscalo en la pestaña "Frecuente".`);
        return;
      }
    }

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
      } else {
        const titleLower = (formData.title || '').toLowerCase();
        if (titleLower.includes('primera vez') || titleLower.includes('ingreso')) {
          baseColorClass = 'bg-amber-50 border-amber-200 text-amber-800';
        } else if (titleLower.includes('urgencia')) {
          baseColorClass = 'bg-rose-50 border-rose-200 text-rose-800';
        } else if (titleLower.includes('control')) {
          baseColorClass = 'bg-blue-50 border-blue-200 text-blue-800';
        } else if (doctor) {
          if (doctor.color === 'esmeralda') baseColorClass = 'bg-emerald-50 border-emerald-200 text-emerald-800';
          if (doctor.color === 'purpura') baseColorClass = 'bg-purple-50 border-purple-200 text-purple-800';
          if (doctor.color === 'indigo') baseColorClass = 'bg-indigo-50 border-indigo-200 text-indigo-800';
        }
      }

      if (editingAppointmentId) {
        const mainApp = appointments.find(a => a.id === editingAppointmentId);
        const isStatusChangeToPaid = formData.paymentStatus === 'pagado' && (mainApp?.paymentStatus !== 'pagado');
        const isStatusChangeToSenado = formData.paymentStatus === 'señado' && (mainApp?.paymentStatus !== 'señado');

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
        const prevPaid = Number(mainApp?.paidAmount || 0) + (mainApp?.paymentStatus === 'pagado' ? Number(mainApp?.paymentAmount - mainApp?.paidAmount) : 0);
        const currPaidTotal = Number(formData.paymentStatus === 'pagado' ? formData.paymentAmount : (formData.paymentStatus === 'señado' ? formData.paidAmount : 0));
        const netPaymentNow = currPaidTotal - prevPaid;

        // Si el estado es 'señado', actualizamos paidMethod
        // Si el estado es 'pagado', el nuevo método aplica al saldo
        const currentTxMethod = formData.paymentStatus === 'señado' ? formData.paidMethod : formData.paymentMethod;

        if (netPaymentNow > 0) {
          toast(`⏳ Procesando... Total: $${currPaidTotal}, Pagado previo: $${prevPaid}, Resta: $${netPaymentNow}`, { duration: 3000 });
          await store.createTransaction({
            id: Date.now(),
                date: nowForAPI(),
            type: 'Ingreso',
            concept: `${formData.paymentStatus === 'pagado' ? 'Completa Pago' : 'Refuerzo Seña'} ${formData.title} — ${finalPatientName}`,
            method: currentTxMethod || 'Efectivo',
            amount: netPaymentNow,
            notes: `Auto-registrado: Saldo abonado en edición (Turno #${editingAppointmentId})`,
            doctor_id: formData.doctorId,
            patient_id: finalPatientId
          });
          playCashSound();
          toast.success(`✅ Restante de $${netPaymentNow.toLocaleString()} registrado en Finanzas!`);
        } else if (isStatusChangeToPaid && netPaymentNow <= 0) {
          toast('ℹ️ El turno ya estaba totalmente pagado. No se creó transacción extra.', { icon: '👏' });
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
            doctorId: formData.doctorId || (doctors && doctors[0] ? doctors[0].id : null),
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

          if ((formData.paymentStatus === 'pagado' || formData.paymentStatus === 'señado') && created) {
            const amountValue = formData.paymentStatus === 'pagado' ? Number(formData.paymentAmount || 0) : Number(formData.paidAmount || 0);
            if (amountValue > 0) {
              await store.createTransaction({
                id: Date.now() + Math.random(),
                    date: nowForAPI(),
                type: 'Ingreso',
                concept: `${formData.paymentStatus === 'pagado' ? 'Cobro Total' : 'Seña'} ${formData.title} — ${finalPatientName}`,
                method: (formData.paymentStatus === 'señado' ? formData.paidMethod : formData.paymentMethod) || 'Efectivo',
                amount: amountValue,
                notes: `Registrado al crear turno (Turno #${newApp.id})`,
                doctor_id: formData.doctorId,
                patient_id: finalPatientId
              });
              playCashSound();
            }
          }
        }
      }
      
      playSuccessSound();
      toast.success(editingAppointmentId ? 'Turno actualizado con éxito' : 'Turno agendado correctamente');
      closeModal();
    } catch (error) {
      console.error('Error saving appointment:', error);
      playErrorSound();
      const errorMessage = error.response?.data?.message || error.message || 'Error al guardar el turno';
      toast.error(errorMessage);
      setIsSaving(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAppointmentId(null);
    setFormData({...defaultForm, date: currentSelectedDateString});
    setIsNewPatient(false);
    setPatientSearch('');
    setIsBlockMode(false);
    setRecurringWeeks(0);
    setIsSaving(false);
  };

  const handleLogout = () => {
    store.auth.logout();
    navigate('/login');
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

  const handleStatusChange = async (e, id, newStatus) => {
    if (e) e.stopPropagation();
    try {
      await store.updateAppointmentStatus(id, newStatus);
      if (newStatus === 'finalizado') playSuccessSound();
      else playPopSound();
      setMenuApp(null);
      setActiveDropdown(null);
    } catch (err) {
      playErrorSound();
    }
  };

  const handleSendWhatsApp = (app) => {
    if (!app) return;
    const patientRecord = store.patients.find(p => p.id === app.patientId || p.name === app.patient);
    const phone = app.phone || patientRecord?.phone || app.patientPhone;
    
    if (!phone) {
      toast.error('El paciente no tiene un teléfono registrado');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('54') ? cleanPhone : `549${cleanPhone}`;

    // Obtener plantilla y datos
    const config = store.globalConfig || {};
    const template = config.whatsappTemplate || "Hola *{patient}*, te recordamos tu turno para el día *{date}* a las *{time}hs*.";
    
    const message = template
      .replace(/{patient}/g, app.patient)
      .replace(/{date}/g, new Date(app.date + 'T12:00:00').toLocaleDateString('es-AR'))
      .replace(/{time}/g, app.time)
      .replace(/{doctor}/g, doctors.find(d => d.id === app.doctorId)?.name || 'Profesional')
      .replace(/{clinic}/g, config.businessName || 'Integrar Salud');

    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleStartVirtualCall = (e, app) => {
    if (e) e.stopPropagation();

    // Bloquear si el paciente no pagó la consulta
    if (app.paymentStatus !== 'pagado') {
      toast.error('No podés iniciar la videollamada porque el paciente aún no ha abonado la consulta.', {
        icon: '💳',
        duration: 5000,
      });
      return;
    }
    
    // Validar tiempo (solo permitir iniciar 5 mins antes)
    const now = new Date();
    const appDateStr = app.date; // YYYY-MM-DD
    const appTimeStr = app.time; // HH:mm
    
    if (appDateStr && appTimeStr) {
      const [year, month, day] = appDateStr.split('-').map(Number);
      const [hour, minute] = appTimeStr.split(':').map(Number);
      
      const appDateTime = new Date(year, month - 1, day, hour, minute);
      const diffMs = appDateTime.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins > 5) {
        toast.error('No podés iniciar una consulta con tanta anticipación. Solo se permite 5 minutos antes del turno.', {
          icon: '⏳',
          duration: 5000,
        });
        return;
      }
    }
    
    // Ir a la sala
    navigate(`/sala-virtual/medico/${app.id}`);
    setActiveDropdown(null);
    setMenuApp(null);
  };

  const handleCopyVirtualLink = (app, e) => {
    if (e) e.stopPropagation();
    const patientRecord = store.patients.find(p => p.id === app.patientId || p.name === app.patient);
    const dni = patientRecord?.dni || app.patientDni || app.dni;
    
    if (!dni || !app.codigoAcceso) {
      toast.error('El turno no tiene DNI del paciente o Código de Acceso generado.');
      return;
    }
    const link = `https://integrarsalud.me/#/sala-virtual?dni=${dni}&codigo=${app.codigoAcceso}`;
    navigator.clipboard.writeText(link);
    toast.success('Link de videollamada copiado al portapapeles');
    setActiveDropdown(null);
    setMenuApp(null);
  };

  const handleViewPatient = (app) => {
    const patientRecord = store.patients.find(p => p.id === app.patientId || p.name === app.patient);
    if (!patientRecord?.id) {
      toast.error('No se pudo localizar el registro del paciente');
      return;
    }
    navigate(`/dashboard/pacientes?view=${patientRecord.id}`);
    setMenuApp(null);
    setActiveDropdown(null);
  };

  const handleOpenEdit = useCallback((app) => {
    if (!app) return;
    playPopSound();
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
      type: app.type || (app.title && ['Psiquiatría', 'Psicología', 'Control'].includes(app.title) ? app.title.toLowerCase() : ''),
      modalidad: app.modalidad || 'presencial',
      doctorId: app.doctorId,
      patientId: existing ? existing.id : '',
      newPatientName: existing ? '' : (app.isBlock ? '' : (app.patient || '')),
      newPatientPhone: existing ? '' : (app.isBlock ? '' : (app.phone || '')),
      notes: app.notes || '',
      paymentStatus: app.paymentStatus || 'pendiente',
      attendance: app.attendance || 'agendado',
      coverage: existing ? existing.coverage : (app.coverage || 'Particular'),
      coverageNumber: existing ? existing.coverageNumber : (app.coverageNumber || ''),
      plan: existing ? existing.plan : (app.plan || ''),
      dni: existing ? existing.dni : (app.dni || ''),
      birthDate: existing ? existing.birthDate : (app.birthDate || ''),
      gender: existing ? existing.gender : (app.gender || 'femenino'),
      email: existing ? existing.email : (app.email || ''),
      address: existing ? existing.address : (app.address || ''),
      emergencyContact: existing ? existing.emergencyContact : (app.emergencyContact || ''),
      referrer: app.referrer || '',
      paymentAmount: app.paymentAmount || '35000',
      paidMethod: app.paidMethod || 'Efectivo',
      codigoAcceso: app.codigoAcceso || '',
      meetLink: app.meetLink || '',
      estadoVideollamada: app.estadoVideollamada || 'pendiente'
    });
    setIsNewPatient(!existing && !app.isBlock);
    setPatientSearch(existing ? existing.name : (app.patient || ''));
    setIsModalOpen(true);
  }, [store.patients]);

  const toggleDoctorVisibility = (docId) => {
    setHiddenDoctors(prev => prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]);
  };

  // Drag & Drop
  const handleDrop = (e, targetCol) => {
    e.preventDefault();
    if (!draggedApp || ['medico'].includes(userRole)) return;

    const gridRect = e.currentTarget.getBoundingClientRect();
    const y = Math.max(0, e.clientY - gridRect.top);
    
    // Altura = 96px por hora. Hora inicio = dinámico según config.
    const dropStartHour = hours[0] ?? 6;
    const totalHoursFromStart = y / 96;
    let rawHour = Math.floor(totalHoursFromStart) + dropStartHour;
    let rawMinutes = Math.floor((totalHoursFromStart - Math.floor(totalHoursFromStart)) * 60);

    const remainder = rawMinutes % 15;
    let roundedMinutes = remainder >= 8 ? rawMinutes + (15 - remainder) : rawMinutes - remainder;
    
    if (roundedMinutes >= 60) {
      rawHour += 1;
      roundedMinutes = 0;
    }
    
    if (rawHour < dropStartHour) rawHour = dropStartHour;
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
    // Enviar TODOS los datos existentes + los campos que cambiaron
    store.updateAppointment(draggedApp.id, {
      ...app,
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
                      {app.modalidad && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/40 rounded-lg">
                          <span>{app.modalidad === 'virtual' ? '💻' : app.modalidad === 'domicilio' ? '🏠' : '🏥'}</span>
                          <span className="capitalize">{app.modalidad}</span>
                        </div>
                      )}
                    </div>

                    {/* Badge de pago en móvil flotante */}
                    {app.paymentStatus === 'pagado' && (
                      <div className="absolute top-0 right-0 p-1">
                         <div className="bg-emerald-500 text-white p-1 rounded-bl-xl shadow-lg">
                           <CheckCircle2 size={10} />
                         </div>
                      </div>
                    )}
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
      {/* Header de la Agenda: flex-wrap para que en tablets/móvil fluya correctamente */}
      <div className="flex flex-wrap items-center justify-between gap-3 glass-effect p-3 sm:p-4 rounded-3xl shadow-[var(--glass-shadow)] border border-[var(--glass-border)]">
        
        {/* VIEW TOGGLE */}
        <div className="flex items-center bg-[var(--bg-main)] p-1 rounded-xl border border-[var(--border-color)] shrink-0">
           <button onClick={() => setViewMode('daily')} className={`px-3 sm:px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all min-h-[36px] ${viewMode === 'daily' ? 'bg-[var(--bg-card)] shadow-md text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] opacity-50 hover:opacity-100'}`}>Diaria</button>
           <button onClick={() => setViewMode('weekly')} className={`px-3 sm:px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all min-h-[36px] ${viewMode === 'weekly' ? 'bg-[var(--bg-card)] shadow-md text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] opacity-50 hover:opacity-100'}`}>Semanal</button>
        </div>

        {/* Nav de Fechas */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center bg-[var(--bg-main)] rounded-full border border-[var(--border-color)] p-1">
            <button onClick={handlePrev} className="p-2 sm:p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center hover:bg-[var(--bg-card)] rounded-full transition-all text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:shadow-sm leading-none group">
              <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <span className="px-2 sm:px-6 font-black text-[var(--text-primary)] min-w-[120px] sm:min-w-[200px] text-center capitalize tracking-tight text-xs sm:text-sm">
              {formattedHeaderDate}
            </span>
            <button onClick={handleNext} className="p-2 sm:p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center hover:bg-[var(--bg-card)] rounded-full transition-all text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:shadow-sm leading-none group">
              <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          <button onClick={handleSetToday} className="hidden sm:block px-5 py-2 text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-light)] rounded-full transition-all border border-transparent hover:border-[var(--accent-primary)]/20">
            Hoy
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Si es vista semanal, mostramos Selector de Doctor exclusivo (Premium Style) */}
          {isWeekly && !['medico'].includes(userRole) && (
             <div className="relative group w-full sm:w-64">
               <select id="selectedDoctorWeekly" name="selectedDoctorWeekly" 
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

          {!['medico'].includes(userRole) && (
            <button 
              onClick={() => {
                playPopSound();
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
      <div className="card-premium overflow-x-auto flex flex-col h-[calc(100svh-14rem)] min-h-[500px] flex-1 custom-scrollbar border border-[var(--glass-border)]">
        
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
                  <div key={`grid-${hour}`} className={`h-24 w-full border-b border-[var(--border-color)]/20 ${isOffHours ? 'bg-[var(--text-secondary)]/5' : 'bg-transparent'}`}>
                    {isOffHours && <div className="absolute top-2 right-2 opacity-10"><Lock size={12} className="text-[var(--text-secondary)]"/></div>}
                  </div>
                )
              })}

                  {/* LÍNEA DE HORA ACTUAL */}
                  {col.dateStr === todayString && (
                    <div className="absolute left-0 right-0 border-t-2 border-[var(--accent-primary)] z-30 pointer-events-none" style={{ top: `${((new Date().getHours() - (hours[0] ?? 6)) + (new Date().getMinutes() / 60)) * 96}px` }}>
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
                    const startHour = hours[0] ?? 6;
                    const topOffset = ((h - startHour) + (m / 60)) * 96;
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
                          draggable={!['medico'].includes(userRole) && !isSuspended}
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
                              <h4 className={`font-bold flex items-center gap-1 ${isShort ? 'text-xs' : 'text-sm'} truncate ${app.attendance === 'ausente' ? 'line-through' : ''}`}>
                                {app.modalidad === 'virtual' && <Video size={12} className="shrink-0 text-indigo-600" />}
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
                                      {app.paymentStatus === 'señado' && (
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
                                  
                                  {/* Modalidad de Consulta */}
                                  {app.modalidad && (
                                    <span className="inline-block px-1.5 py-0.5 bg-white/80 text-slate-700 text-[10px] font-black uppercase rounded-md shadow-sm border border-slate-200/50 flex items-center gap-1">
                                      {app.modalidad === 'virtual' ? '💻' : app.modalidad === 'domicilio' ? '🏠' : '🏥'} {app.modalidad}
                                    </span>
                                  )}
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
                            {/* Overlay para móviles y PC */}
                            <div className="fixed inset-0 z-[150] sm:z-40 bg-black/40 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none transition-all animate-fade-in-quick" onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); }}></div>
                            
                            {/* Contenedor del Dropdown (Bottom sheet en móvil, popover en PC) */}
                            <div className="fixed sm:absolute bottom-0 sm:bottom-auto left-0 sm:left-auto right-0 sm:right-0 top-auto sm:top-6 w-full sm:w-[17rem] bg-[var(--bg-card)] rounded-t-[2rem] sm:rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.3)] sm:shadow-2xl border-t border-l border-r border-[var(--border-color)]/50 sm:border-[var(--glass-border)] pt-3 pb-6 sm:py-0 z-[151] sm:z-[51] animate-fade-in-up sm:animate-fade-in-quick overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[70vh]">
                              
                              {/* Grabber para mobile */}
                              <div className="w-12 h-1.5 bg-[var(--border-color)] rounded-full mx-auto mb-3 sm:hidden opacity-50 shrink-0"></div>

                              <div className="overflow-y-auto custom-scrollbar flex-1 pb-2 sm:pb-0">
                              {!['medico'].includes(userRole) && !isBlock && (
                                <>
                                  <div className="px-5 py-2.5 text-[10px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-[0.2em] bg-[var(--bg-sidebar)]/30 border-b border-[var(--border-color)]/30 sticky top-0 z-10 backdrop-blur-md">Caja / Cobros</div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const resetData = { paymentStatus: 'pendiente', paidAmount: 0 };
                                          store.updateAppointmentPaymentStatus(app.id, resetData);
                                          setActiveDropdown(null);
                                        }}
                                        className={`w-full text-left px-5 py-3 sm:py-2.5 text-xs font-bold transition-all flex items-center justify-between border-b border-[var(--border-color)]/10 ${app.paymentStatus === 'pendiente' ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10' : 'text-[var(--text-primary)] hover:bg-[var(--accent-light)]'}`}
                                      >
                                        Pendiente
                                        {app.paymentStatus === 'pendiente' && <CheckCircle2 size={12} />}
                                      </button>
                                      
                                      <button
                                         onClick={async (e) => {
                                           e.stopPropagation();
                                           if (app.paymentStatus === 'pagado') return;

                                           const totalFee = Number(app.paymentAmount) > 0 ? Number(app.paymentAmount) : 35000;
                                           const prevPaid = Number(app.paidAmount || 0);
                                           const amountToPay = totalFee - prevPaid;
                                           
                                           toast(`⏳ Procesando... Total: $${totalFee}, Pagado: $${prevPaid}, Resta: $${amountToPay}`, { duration: 3000 });
                                           let updateOk = false;
                                           
                                           try {
                                             const { data: d1 } = await import('../../../services/api').then(m => m.default).then(api => api.patch(`/appointments/${app.id}/payment`, {
                                               paymentStatus: 'pagado', paidAmount: totalFee, paymentAmount: totalFee
                                             }));
                                             updateOk = true;
                                             playCashSound();
                                             store.updateAppointmentPaymentStatus(app.id, { paymentStatus: 'pagado', paidAmount: totalFee, paymentAmount: totalFee }).catch(()=>{});
                                           } catch(err) {
                                             const msg = err.response?.data?.message || err.message;
                                             toast.error(`❌ Error turno: ${msg}`);
                                           }

                                           if (updateOk && amountToPay > 0) {
                                             try {
                                               const { data: d2 } = await import('../../../services/api').then(m => m.default).then(api => api.post(`/transactions/`, {
                                                 type: 'Ingreso',
                                                 concept: `Cobro Restante ${app.title} — ${app.patient}`,
                                                 method: app.paymentMethod || 'Efectivo',
                                                 amount: amountToPay,
                                                 date: nowForAPI(),
                                                 notes: `Cobro desde Agenda (Turno #${app.id})`,
                                                 doctor_id: app.doctorId,
                                                 patient_id: app.patientId
                                               }));
                                               toast.success(`✅ Restante de $${amountToPay.toLocaleString()} registrado en Finanzas!`);
                                             } catch(err) {
                                               const msg = err.response?.data?.message || err.message;
                                               toast.error(`❌ Error finanzas: ${msg}`);
                                             }
                                           } else if (updateOk && amountToPay <= 0) {
                                              toast('ℹ️ El turno ya estaba totalmente pagado. No se creó transacción extra.', { icon: '👏' });
                                           }

                                           setActiveDropdown(null);
                                         }}
                                         className={`w-full text-left px-5 py-3 sm:py-2.5 text-xs font-bold transition-all flex items-center justify-between border-b border-[var(--border-color)]/10 ${app.paymentStatus === 'pagado' ? 'text-emerald-500 bg-emerald-500/10 cursor-default' : 'text-[var(--text-primary)] hover:bg-[var(--accent-light)]'}`}
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
                                        className={`w-full text-left px-5 py-3 sm:py-2.5 text-xs font-bold border-b border-[var(--border-color)]/10 transition-all flex items-center justify-between ${app.paymentStatus === 'señado' ? 'text-indigo-400 bg-indigo-500/10' : 'text-[var(--text-primary)] hover:bg-[var(--accent-light)]'}`}
                                      >
                                        Señado
                                        {app.paymentStatus === 'señado' && <CheckCircle2 size={12} />}
                                      </button>

                                      {/* Inline seña input - aparece dentro del dropdown */}
                                      {senasInput.appId === app.id && (
                                        <div className="px-5 py-4 border-b border-[var(--border-color)]/30 bg-[var(--accent-primary)]/5" onClick={e => e.stopPropagation()}>
                                          <p className="text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-widest mb-3">Monto de la seña</p>
                                          <div className="flex flex-wrap gap-2">
                                            <div className="relative flex-1">
                                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-[var(--accent-primary)]">$</span>
                                              <input id="value" name="value"
                                                type="number"
                                                autoFocus
                                                min="0"
                                                value={senasInput.value}
                                                onChange={e => setSenasInput(prev => ({ ...prev, value: e.target.value }))}
                                                onKeyDown={async e => {
                                                  if (e.key === 'Enter') {
                                                    const amount = Number(senasInput.value);
                                                    if (amount <= 0) { toast.error('Ingresá un monto válido'); return; }
                                                    try {
                                                      await store.updateAppointmentPaymentStatus(app.id, { paymentStatus: 'señado', paidAmount: amount });
                                                      await store.createTransaction({
                                                        date: nowForAPI(),
                                                        type: 'Ingreso',
                                                        concept: `Seña ${app.title} — ${app.patient}`,
                                                        method: app.paidMethod || app.paymentMethod || 'Efectivo',
                                                        amount,
                                                        notes: `Seña desde Agenda (Turno #${app.id})`,
                                                        doctor_id: app.doctorId,
                                                        patient_id: app.patientId
                                                      });
                                                      toast.success('Seña registrada en Finanzas');
                                                    } catch(err) {
                                                      toast.error('Error al registrar la seña: ' + (err?.response?.data?.message || err.message));
                                                    }
                                                    setSenasInput({ appId: null, value: '' });
                                                    setActiveDropdown(null);
                                                  }
                                                  if (e.key === 'Escape') setSenasInput({ appId: null, value: '' });
                                                }}
                                                className="w-full pl-7 pr-3 py-2 text-sm font-bold text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl outline-none focus:border-[var(--accent-primary)]/50 transition-all shadow-inner"
                                                placeholder="0"
                                              />
                                            </div>
                                            <button
                                              onClick={async e => {
                                                e.stopPropagation();
                                                const amount = Number(senasInput.value);
                                                if (amount <= 0) { toast.error('Ingresá un monto válido'); return; }
                                                
                                                // PASO 1: Actualizar estado del turno
                                                toast('⏳ Actualizando turno...', { duration: 2000 });
                                                let paso1Ok = false;
                                                try {
                                                  const { data: d1 } = await import('../../../services/api').then(m => m.default).then(api => api.patch(`/appointments/${app.id}/payment`, {
                                                    paymentStatus: 'señado', paidAmount: amount
                                                  }));
                                                  paso1Ok = true;
                                                  // Actualizar store localmente
                                                  store.updateAppointmentPaymentStatus(app.id, { paymentStatus: 'señado', paidAmount: amount }).catch(()=>{});
                                                } catch(e1) {
                                                  const msg = e1.response?.data?.message || e1.message;
                                                  toast.error(`❌ Red (turno): ${msg}`);
                                                }
                                                
                                                // PASO 2: Crear transacción en Finanzas
                                                if (paso1Ok) {
                                                  try {
                                                    const txBody = {
                                                      type: 'Ingreso',
                                                      concept: `Seña ${app.title} — ${app.patient}`,
                                                      method: app.paidMethod || app.paymentMethod || 'Efectivo',
                                                      amount,
                                                      date: nowForAPI(),
                                                      notes: `Seña desde Agenda (Turno #${app.id})`,
                                                      doctor_id: app.doctorId,
                                                      patient_id: app.patientId
                                                    };
                                                    const { data: d2 } = await import('../../../services/api').then(m => m.default).then(api => api.post(`/transactions/`, txBody));
                                                    toast.success(`✅ Seña $${amount.toLocaleString()} registrada en Finanzas`);
                                                  } catch(e2) {
                                                    const msg = e2.response?.data?.message || e2.message;
                                                    toast.error(`❌ Red (finanzas): ${msg}`);
                                                  }
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
                                    </>
                                  )}

                                  {!['medico'].includes(userRole) && (
                                    <>
                                      <div className="px-5 py-2.5 text-[10px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-[0.2em] bg-[var(--bg-sidebar)]/30 border-y border-[var(--border-color)]/30 sticky top-0 z-10 backdrop-blur-md">Estados de Asistencia</div>
                                      <button onClick={(e) => handleStatusChange(e, app.id, 'agendado')} className="w-full text-left px-5 py-3 sm:py-2.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--accent-light)] transition-all flex items-center gap-3 border-b border-[var(--border-color)]/10"><Clock size={15} className="opacity-40"/> Agendado</button>
                                      <button onClick={(e) => handleStatusChange(e, app.id, 'confirmado')} className="w-full text-left px-5 py-3 sm:py-2.5 text-xs font-bold text-emerald-500 hover:bg-emerald-500/10 transition-all flex items-center gap-3 border-b border-[var(--border-color)]/10"><UserCheck size={15} className="opacity-60"/> Confirmado</button>
                                      <button onClick={(e) => handleStatusChange(e, app.id, 'en_espera')} className="w-full text-left px-5 py-3 sm:py-2.5 text-xs font-bold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 transition-all flex items-center gap-3 border-b border-[var(--border-color)]/10"><CalendarDays size={15} className="opacity-60"/> Llegó a Sala</button>
                                      <button onClick={(e) => handleStatusChange(e, app.id, 'finalizado')} className="w-full text-left px-5 py-3 sm:py-2.5 text-xs font-bold text-blue-400 hover:bg-blue-500/10 transition-all flex items-center gap-3 border-b border-[var(--border-color)]/10"><CheckCircle2 size={15} className="opacity-60"/> Finalizado</button>
                                      <button onClick={(e) => handleStatusChange(e, app.id, 'ausente')} className="w-full text-left px-5 py-3 sm:py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-all border-b border-[var(--border-color)]/30 flex items-center gap-3"><UserX size={15} className="opacity-60"/> Ausente / Canceló</button>
                                    </>
                                  )}


                              {activeDropdown === app.id && userRole === 'medico' && (
                                <div className="px-5 py-2.5 text-[10px] font-black text-[var(--text-secondary)] opacity-30 italic uppercase tracking-widest border-b border-[var(--border-color)]/20">
                                  Información Reservada
                                </div>
                              )}

                               {/* — Comprobante button (only when paid or señado) — */}
                               {(!['medico'].includes(userRole) && (app.paymentStatus === 'pagado' || app.paymentStatus === 'señado')) && (
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

                               {(!['medico'].includes(userRole) && store.globalConfig?.whatsappEnabled) && (
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
                               )}

                               {app.modalidad === 'virtual' && userRole === 'medico' && (
                                 <button 
                                   onClick={(e) => handleStartVirtualCall(e, app)}
                                   className="w-full text-left px-5 py-3 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-all border-b border-[var(--border-color)]/30 flex items-center gap-3 shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                                 >
                                   <Video size={16} /> Iniciar Consulta Virtual
                                 </button>
                               )}

                               {app.modalidad === 'virtual' && (
                                 <button 
                                   onClick={(e) => handleCopyVirtualLink(app, e)}
                                   className="w-full text-left px-5 py-3 text-xs font-bold text-indigo-500 hover:bg-indigo-50 transition-all border-b border-[var(--border-color)]/30 flex items-center gap-3"
                                 >
                                   <Copy size={16} className="opacity-70" /> Copiar Link Acceso (Paciente)
                                 </button>
                               )}

                              <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   if (false) {
                                     handleViewPatient(app);
                                   } else {
                                     handleOpenEdit(app);
                                   }
                                 }}
                                className="w-full text-left px-5 py-3 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--accent-light)] transition-all border-b border-[var(--border-color)]/30 flex items-center gap-3"
                              >
                                <Eye size={16} className="opacity-40" /> {['medico'].includes(userRole) ? 'Ver ficha detallada' : 'Editar detalles'}
                              </button>
                              
                              {!['medico'].includes(userRole) && (
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
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-fade-in-quick" onClick={closeModal}></div>
          
          <div className="relative bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 sm:p-7 border-b border-[var(--border-color)]/30 bg-[var(--bg-sidebar)]/50 backdrop-blur-xl shrink-0">
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

            <form onSubmit={handleSaveAppointment} className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 sm:space-y-8 custom-scrollbar">
              
              {!editingAppointmentId && userRole !== 'medico' && (
                <div className="flex gap-2 p-1.5 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)]/50">
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
                     <div className="space-y-3">
                       {/* Buscador moderno con autocomplete */}
                       <div className="relative" id="patient-search-container">
                         <div className="relative group/search">
                           <Search
                             className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-40 group-focus-within/search:text-[var(--accent-primary)] group-focus-within/search:opacity-100 transition-all z-10"
                             size={17}
                           />
                           <input id="patientSearch" name="patientSearch"
                             type="text"
                             placeholder="Buscar por Nombre, DNI o NHC..."
                             value={patientSearch}
                             autoComplete="off"
                             onChange={(e) => {
                               setPatientSearch(e.target.value);
                               setFormData({...formData, patientId: ''});
                             }}
                             onFocus={() => setPatientSearch(patientSearch)}
                             className="w-full pl-11 pr-10 py-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-sm font-bold text-[var(--text-primary)] focus:border-[var(--accent-primary)]/70 focus:ring-4 focus:ring-[var(--accent-primary)]/8 transition-all outline-none shadow-sm placeholder:text-[var(--text-secondary)]/30"
                           />
                           {patientSearch && (
                             <button
                               type="button"
                               onClick={() => { setPatientSearch(''); setFormData({...formData, patientId: ''}); }}
                               className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-all"
                             >
                               <X size={14} />
                             </button>
                           )}
                         </div>

                         {/* Dropdown de resultados */}
                         {patientSearch.trim().length >= 1 && !formData.patientId && (
                           <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-2xl shadow-2xl z-[200] overflow-hidden animate-fade-in-quick">
                             {(() => {
                               const filtered = (patients || []).filter(p =>
                                 p && p.name && (
                                   p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
                                   (p.dni || '').includes(patientSearch) ||
                                   (p.nhc || '').toLowerCase().includes(patientSearch.toLowerCase())
                                 )
                               ).slice(0, 7);

                               if (filtered.length === 0) return (
                                 <div className="px-5 py-8 flex flex-col items-center gap-2 text-center">
                                   <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                                     <Search size={16} className="text-rose-400" />
                                   </div>
                                   <p className="text-xs font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-widest">Sin resultados</p>
                                   <p className="text-[10px] text-[var(--text-secondary)] opacity-30">Probá con otro nombre o DNI</p>
                                 </div>
                               );

                               return (
                                 <div className="max-h-[280px] overflow-y-auto custom-scrollbar py-1.5">
                                   <p className="px-4 py-1.5 text-[9px] font-black text-[var(--text-secondary)] opacity-40 uppercase tracking-[0.2em]">
                                     {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
                                   </p>
                                   {filtered.map((p) => {
                                     const initials = (p.name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
                                     const age = p.birthDate ? Math.floor((new Date() - new Date(p.birthDate)) / (365.25 * 24 * 60 * 60 * 1000)) : null;
                                     const coverageColor = {
                                       'OSDE': 'bg-blue-500/15 text-blue-400',
                                       'PAMI': 'bg-emerald-500/15 text-emerald-400',
                                       'Swiss Medical': 'bg-purple-500/15 text-purple-400',
                                       'IOMA': 'bg-orange-500/15 text-orange-400',
                                       'Galeno': 'bg-teal-500/15 text-teal-400',
                                     }[p.coverage] || 'bg-[var(--accent-light)] text-[var(--accent-primary)]';

                                     return (
                                       <button
                                         key={p.id}
                                         type="button"
                                         onClick={() => {
                                           setFormData({...formData, patientId: p.id});
                                           setPatientSearch(p.name);
                                         }}
                                         className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--accent-light)] transition-all group/item text-left"
                                       >
                                         {/* Avatar con iniciales */}
                                         <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-sky-400 flex items-center justify-center shrink-0 text-white text-[11px] font-black shadow-md shadow-sky-500/20">
                                           {initials}
                                         </div>
                                         {/* Info */}
                                         <div className="flex-1 min-w-0">
                                           <div className="flex items-center gap-2 flex-wrap">
                                             <span className="text-sm font-black text-[var(--text-primary)] group-hover/item:text-[var(--accent-primary)] transition-colors truncate">
                                               {p.name}
                                             </span>
                                             <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${coverageColor}`}>
                                               {p.coverage || 'Particular'}
                                             </span>
                                           </div>
                                           <div className="flex items-center gap-2 mt-0.5">
                                             {p.dni && <span className="text-[10px] font-bold text-[var(--text-secondary)] opacity-50">DNI {p.dni}</span>}
                                             {age !== null && <span className="text-[10px] font-bold text-[var(--text-secondary)] opacity-50">{age} años</span>}
                                             {p.nhc && <span className="text-[10px] font-bold text-[var(--text-secondary)] opacity-30">NHC {p.nhc}</span>}
                                           </div>
                                         </div>
                                         {/* Flecha hover */}
                                         <div className="opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0">
                                           <ChevronRight size={14} className="text-[var(--accent-primary)]" />
                                         </div>
                                       </button>
                                     );
                                   })}
                                 </div>
                               );
                             })()}
                           </div>
                         )}
                       </div>

                       {/* Paciente seleccionado: preview card */}
                       {formData.patientId && (() => {
                         const sel = (patients || []).find(p => String(p.id) === String(formData.patientId));
                         if (!sel) return null;
                         const initials = (sel.name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
                         const age = sel.birthDate ? Math.floor((new Date() - new Date(sel.birthDate)) / (365.25 * 24 * 60 * 60 * 1000)) : null;
                         return (
                           <div className="flex items-center gap-3 p-3.5 bg-[var(--accent-light)] border border-[var(--accent-primary)]/20 rounded-2xl animate-fade-in-quick">
                             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-sky-400 flex items-center justify-center shrink-0 text-white text-[12px] font-black shadow-lg shadow-sky-500/25">
                               {initials}
                             </div>
                             <div className="flex-1 min-w-0">
                               <p className="text-sm font-black text-[var(--text-primary)] truncate">{sel.name}</p>
                               <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                 <span className="text-[10px] font-bold text-[var(--accent-primary)] opacity-70">{sel.coverage || 'Particular'}</span>
                                 {sel.dni && <span className="text-[10px] font-bold text-[var(--text-secondary)] opacity-40">• DNI {sel.dni}</span>}
                                 {age !== null && <span className="text-[10px] font-bold text-[var(--text-secondary)] opacity-40">• {age} años</span>}
                               </div>
                             </div>
                             <div className="shrink-0 w-6 h-6 rounded-full bg-[var(--accent-primary)] flex items-center justify-center">
                               <CheckCircle2 size={14} className="text-white" />
                             </div>
                           </div>
                         );
                       })()}

                       {/* Campo hidden para mantener la validación required */}
                       <input id="patientId" name="patientId" type="hidden" required={!isNewPatient} value={formData.patientId} />

                       {patientSearch.trim().length >= 1 && !formData.patientId && (
                         <p className="text-[10px] font-black text-[var(--text-secondary)] opacity-40 ml-1 flex items-center gap-1 uppercase tracking-wider">
                           <AlertCircle size={11} /> Seleccioná un paciente de la lista
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
                        <div className="grid grid-cols-1 gap-4">
                          {/* Nombre: siempre ancho completo */}
                          <div className="relative">
                            <input type="text" id="newPatientName" autoComplete="name" required={isNewPatient} placeholder=" " value={formData.newPatientName} onChange={(e) => setFormData({...formData, newPatientName: e.target.value})} className="block px-5 pb-3 pt-6 w-full text-sm font-bold text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl appearance-none focus:outline-none focus:ring-0 focus:border-[var(--accent-primary)] peer transition-all shadow-sm" />
                            <label htmlFor="newPatientName" className="absolute text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest duration-300 transform -translate-y-3 top-4 z-10 origin-[0] left-5 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-90 peer-focus:-translate-y-3 peer-focus:text-[var(--accent-primary)] opacity-60 pointer-events-none">Nombre Completo *</label>
                          </div>

                          {/* DNI y Género: 2 columnas desde sm — ambos con label estático para consistencia visual */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                              <label htmlFor="dni" className="text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-widest opacity-80 pl-1">DNI / Pasaporte (Opcional)</label>
                              <input type="text" id="dni" autoComplete="off" placeholder="Ej: 12345678" inputMode="numeric" value={formData.dni} onChange={(e) => setFormData({...formData, dni: e.target.value.replace(/[^0-9Aa-z]/g, '')})} className="block px-5 py-4 w-full text-sm font-bold text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl appearance-none focus:outline-none focus:ring-0 focus:border-[var(--accent-primary)] transition-all shadow-sm" />
                            </div>

                            <div className="flex flex-col gap-1">
                              <label htmlFor="gender" className="text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-widest opacity-80 pl-1">Género</label>
                              <select id="gender" value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} className="block px-5 py-4 w-full text-sm font-bold text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl appearance-none focus:outline-none focus:ring-0 focus:border-[var(--accent-primary)] transition-all cursor-pointer shadow-sm">
                                <option value="femenino" className="bg-[var(--bg-card)]">Femenino</option>
                                <option value="masculino" className="bg-[var(--bg-card)]">Masculino</option>
                                <option value="otro" className="bg-[var(--bg-card)]">Otro</option>
                                <option value="prefiero_no_decir" className="bg-[var(--bg-card)]">Prefiero no decirlo</option>
                              </select>
                            </div>
                          </div>

                          {/* Fecha de nacimiento */}
                          <div className="flex flex-col gap-1">
                            <span className="block text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-widest opacity-80 pl-1">Fecha de Nacimiento (Opcional)</span>
                            <CustomDatePicker
                              value={formData.birthDate}
                              onChange={(val) => setFormData({...formData, birthDate: val})}
                              className="block px-5 py-4 w-full text-sm font-bold text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl transition-all shadow-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Sub-Bloque: Contacto */}
                      <div className="bg-[var(--bg-card)] p-5 rounded-[2rem] border border-[var(--border-color)]/50 shadow-sm relative overflow-hidden group/contacto">
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[var(--accent-primary)]/5 rounded-full -ml-16 -mb-16 transition-transform group-hover/contacto:scale-150 duration-700 pointer-events-none"></div>
                        <h4 className="text-[11px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
                           <Calendar size={14} className="text-[var(--accent-primary)]" /> Contacto & Emergencia
                        </h4>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="flex flex-col gap-1">
                             <label htmlFor="newPatientPhone" className="text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-widest opacity-80 pl-1">Celular (Opcional)</label>
                             <input type="tel" id="newPatientPhone" autoComplete="tel" placeholder="Ej: 11 1234-5678" value={formData.newPatientPhone} onChange={(e) => setFormData({...formData, newPatientPhone: e.target.value.replace(/[^0-9]/g, '')})} className="block px-5 py-4 w-full text-sm font-bold text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl appearance-none focus:outline-none focus:ring-0 focus:border-[var(--accent-primary)] transition-all shadow-sm" />
                          </div>
                          <div className="flex flex-col gap-1">
                             <label htmlFor="email" className="text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-widest opacity-80 pl-1">Correo Electrónico (Opcional)</label>
                             <input type="email" id="email" autoComplete="email" placeholder="usuario@email.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="block px-5 py-4 w-full text-sm font-bold text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl appearance-none focus:outline-none focus:ring-0 focus:border-[var(--accent-primary)] transition-all shadow-sm" />
                          </div>
                          <div className="flex flex-col gap-1">
                             <label htmlFor="address" className="text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-widest opacity-80 pl-1">Dirección Postal</label>
                             <input type="text" id="address" autoComplete="street-address" placeholder="Ej: Av. Corrientes 1234, CABA" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="block px-5 py-4 w-full text-sm font-bold text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl appearance-none focus:outline-none focus:ring-0 focus:border-[var(--accent-primary)] transition-all shadow-sm" />
                          </div>
                          <div className="flex flex-col gap-1">
                             <label htmlFor="emergencyContact" className="text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-widest opacity-80 pl-1">Contacto de Emergencia (Opcional)</label>
                             <input type="text" id="emergencyContact" autoComplete="off" placeholder="Nombre y teléfono" value={formData.emergencyContact} onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})} className="block px-5 py-4 w-full text-sm font-bold text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl appearance-none focus:outline-none focus:ring-0 focus:border-[var(--accent-primary)] transition-all shadow-sm" />
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
                               <select id="coverage" name="coverage" value={formData.coverage} onChange={(e) => setFormData({...formData, coverage: e.target.value})} className="w-full px-5 py-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl text-sm font-black text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/50 cursor-pointer appearance-none transition-all">
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
                                 <option value="O.S.PE.C.O.M" className="bg-[var(--bg-card)]">O.S.PE.C.O.M</option>
                               </select>

                               {formData.coverage !== 'Particular' && (
                                 <div className="relative group">
                                   <input id="coverageNumber" name="coverageNumber" 
                                     type="text" 
                                     required 
                                     placeholder="Nº Afiliado *" 
                                     value={formData.coverageNumber} 
                                     onChange={(e) => setFormData({...formData, coverageNumber: e.target.value})} 
                                     className="w-full px-5 py-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/50 transition-all pr-12" 
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <span className="block text-[10px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-widest mb-3 ml-2 text-center">Modalidad de Atención</span>
                        <div className="grid grid-cols-2 gap-1 p-1 bg-[var(--bg-sidebar)]/50 border border-[var(--border-color)]/30 rounded-2xl">
                          {[
                            { id: 'presencial', label: 'Presencial', icon: '🏥' },
                            { id: 'virtual', label: 'Virtual', icon: '💻' }
                          ].map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setFormData({...formData, modalidad: t.id})}
                              className={`py-3 text-[8px] sm:text-[10px] font-black uppercase tracking-tighter sm:tracking-widest rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                                formData.modalidad === t.id 
                                  ? 'bg-[var(--accent-primary)] text-white shadow-md' 
                                  : 'text-[var(--text-secondary)] opacity-40 hover:opacity-100 hover:bg-[var(--bg-main)]'
                              }`}
                            >
                              <span className="text-xs sm:text-sm">{t.icon}</span>
                              <span className="truncate w-full text-center sm:w-auto">{t.label}</span>
                            </button>
                          ))}
                        </div>

                        {formData.modalidad === 'virtual' && editingAppointmentId && (formData.meetLink || formData.codigoAcceso) && (
                          <div className="mt-4 p-4 bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/20 rounded-2xl flex flex-col gap-3 shadow-inner">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <Video size={16} className="text-[var(--accent-primary)]" />
                                <span className="text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-widest">Datos de Videollamada</span>
                              </div>
                              {userRole === 'medico' && formData.meetLink && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (formData.paymentStatus !== 'pagado') {
                                      toast.error('No podés iniciar la videollamada porque el paciente aún no ha abonado la consulta.', {
                                        icon: '💳',
                                        duration: 5000,
                                      });
                                      return;
                                    }

                                    // Validar tiempo (5 mins antes)
                                    if (formData.date && formData.time) {
                                      const now = new Date();
                                      const [year, month, day] = formData.date.split('-').map(Number);
                                      const [hour, minute] = formData.time.split(':').map(Number);
                                      const appDateTime = new Date(year, month - 1, day, hour, minute);
                                      const diffMins = Math.floor((appDateTime.getTime() - now.getTime()) / 60000);
                                      
                                      if (diffMins > 5) {
                                        toast.error('No podés iniciar una consulta con tanta anticipación. Solo se permite 5 minutos antes del turno.', {
                                          icon: '⏳',
                                          duration: 5000,
                                        });
                                        return;
                                      }
                                    }
                                    try {
                                      const app = store.appointments.find(a => a.id === editingAppointmentId);
                                      if (app) {
                                        store.setActiveCallApp(app);
                                        socket.emit('call-started', `appointment-${app.id}`);
                                      } else {
                                        await store.updateAppointmentVideoStatus(editingAppointmentId, 'activa');
                                        setFormData({ ...formData, estadoVideollamada: 'activa' });
                                        window.open(formData.meetLink, '_blank');
                                      }
                                      toast.success('Videollamada iniciada. El paciente será alertado.');
                                    } catch (err) {
                                      toast.error('Error al iniciar videollamada');
                                    }
                                  }}
                                  className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm ${
                                    formData.estadoVideollamada === 'activa'
                                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                  }`}
                                >
                                  {formData.estadoVideollamada === 'activa' ? 'Reconectar' : 'Iniciar Consulta'}
                                </button>
                              )}
                            </div>
                            


                            {userRole !== 'medico' && formData.codigoAcceso && (
                              <div className="flex flex-col gap-1 mt-1">
                                <span className="text-[9px] font-black text-[var(--text-secondary)] opacity-70 uppercase tracking-wider block mb-1">Código de Acceso (Paciente)</span>
                                <div className="flex items-center gap-2">
                                  <code className="px-3 py-1.5 bg-[var(--bg-main)] border border-[var(--border-color)]/50 rounded-xl text-sm font-black tracking-widest text-[var(--text-primary)] select-all">
                                    {formData.codigoAcceso}
                                  </code>
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(formData.codigoAcceso);
                                      toast.success('Código copiado al portapapeles');
                                    }}
                                    className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 rounded-lg transition-colors"
                                    title="Copiar código"
                                  >
                                    <Copy size={16} />
                                  </button>
                                </div>
                                <p className="text-[10px] text-[var(--text-secondary)] opacity-60 mt-1 font-medium">El paciente debe ingresar este código en la sala de espera virtual.</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                         <label htmlFor="title" className="block text-[10px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-widest mb-1.5 ml-2">Motivo / Tratamiento</label>
                         <div className="space-y-3">
                           <input id="title" name="title" 
                             type="text" 
                             required 
                             placeholder="Ej: Psicoterapia" 
                             value={formData.title} 
                             onChange={(e) => setFormData({...formData, title: e.target.value})} 
                             className="w-full px-5 py-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] shadow-sm transition-all" 
                           />
                           <div className="grid grid-cols-3 gap-2">
                             {['Psiquiatría', 'Psicología', 'Control'].map(tag => (
                               <button
                                 key={tag}
                                 type="button"
                                 onClick={() => setFormData({...formData, title: tag, type: tag.toLowerCase()})}
                                 className={`px-1 py-2 text-[8px] sm:text-[10px] font-black uppercase rounded-xl border transition-all truncate ${
                                   formData.title === tag 
                                     ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-md' 
                                     : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--accent-primary)] opacity-60 hover:opacity-100'
                                 }`}
                               >
                                 {tag}
                               </button>
                             ))}
                           </div>
                         </div>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                         <label htmlFor="notes" className="block text-[10px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-widest mb-1.5 ml-2">Notas Clínicas</label>
                         <textarea id="notes" name="notes" 
                           placeholder="Observaciones..." 
                           value={formData.notes} 
                           onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                           className="w-full px-5 py-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] shadow-sm transition-all h-[88px] resize-none" 
                         />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Si ES Bloqueo, pedir solo motivo */}
              {isBlockMode && (
                <div className="bg-[var(--bg-main)] p-7 rounded-[2rem] border border-[var(--border-color)] border-dashed relative group/block">
                  <div className="absolute top-0 left-0 w-1 h-full bg-rose-500 opacity-20"></div>
                  <label htmlFor="title" className="block text-xs font-black text-[var(--text-primary)] uppercase tracking-[0.2em] mb-3 ml-1 flex items-center gap-2">
                    <Lock size={14} className="text-rose-500" /> Evento Restringido (Bloqueo)
                  </label>
                  <input id="title" name="title" type="text" required placeholder="Ej: Almuerzo, Reunión, Ausencia" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-6 py-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl focus:border-rose-400 focus:ring-8 focus:ring-rose-500/5 outline-none transition-all shadow-md font-bold text-[var(--text-primary)] tracking-tight text-lg" />
                </div>
              )}

              {/* BLOQUE DE TIEMPO Y DOCTOR (Unificado para más elegancia) */}
              <div className="bg-[var(--bg-sidebar)]/30 border border-[var(--border-color)] p-6 rounded-[2rem] shadow-sm flex flex-col gap-6 relative overflow-hidden">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label htmlFor="doctorId" className="block text-[10px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-widest mb-2 ml-2">Profesional Responsable</label>
                    <select id="doctorId" name="doctorId" required value={formData.doctorId} onChange={(e) => setFormData({...formData, doctorId: Number(e.target.value)})} className="w-full px-6 py-4 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-3xl focus:border-[var(--accent-primary)]/50 outline-none font-black cursor-pointer shadow-lg shadow-indigo-500/5 transition-all text-base appearance-none">
                      {(doctors || []).filter(d => d && d.id).map(d => <option key={d.id} value={d.id} className="bg-[var(--bg-card)]">Dr. {d.name || 'Sin nombre'} — {d.specialty || 'General'}</option>)}
                    </select>
                  </div>
                </div>
                
                {/* Fecha / Hora / Duración: en móvil se apilan, en desktop van en 3 columnas */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1 relative">
                    <span className="block text-[10px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-widest ml-2">Fecha</span>
                    <CustomDatePicker 
                      value={formData.date} 
                      onChange={(val) => setFormData({...formData, date: val})} 
                      isDateDisabled={isDateDisabled}
                      className="w-full px-4 py-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1 relative">
                    <span className="block text-[10px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-widest ml-2">Hora Inicio</span>
                    <CustomTimePicker 
                      value={formData.time} 
                      onChange={(val) => setFormData({...formData, time: val})} 
                      min={currentDayConfig.start}
                      max={currentDayConfig.end}
                      className="w-full px-4 py-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="duration" className="text-[10px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-widest ml-2 block">Duración</label>
                    <select id="duration" name="duration" value={formData.duration} onChange={(e) => setFormData({...formData, duration: Number(e.target.value)})} className="w-full px-4 py-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl outline-none focus:border-[var(--accent-primary)] text-sm font-black cursor-pointer text-left text-[var(--text-primary)] appearance-none transition-all">
                      <option value={0.5} className="bg-[var(--bg-card)]">30 Minutos</option>
                      <option value={1} className="bg-[var(--bg-card)]">1 Hora</option>
                      <option value={1.5} className="bg-[var(--bg-card)]">1 Hora 30 Min</option>
                      <option value={2} className="bg-[var(--bg-card)]">2 Horas</option>
                    </select>
                  </div>
                </div>


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
                      <span className="block text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-3 ml-2">Gestión del Estado de Pago</span>
                      <div className="flex gap-2 p-1.5 bg-[var(--bg-main)] border border-[var(--border-color)]/50 rounded-2xl">
                        <button 
                          type="button" 
                          onClick={() => setFormData({...formData, paymentStatus: 'pendiente'})}
                          className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${formData.paymentStatus === 'pendiente' ? 'bg-[var(--bg-card)] text-rose-500 shadow-md border border-[var(--border-color)]' : 'text-[var(--text-secondary)] opacity-50 hover:opacity-100'}`}
                        >
                          Pendiente
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setFormData({...formData, paymentStatus: 'señado'})}
                          className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${formData.paymentStatus === 'señado' ? 'bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/20' : 'text-[var(--text-secondary)] opacity-50 hover:opacity-100'}`}
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
                      <label htmlFor="paymentAmount" className="block text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-2 ml-2">Monto del Arancel ($)</label>
                      <div className="relative group/amount">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-emerald-500/30 group-focus-within/amount:text-emerald-500 transition-colors">$</span>
                        <input id="paymentAmount" name="paymentAmount" 
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
                      <span className="block text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-3 ml-2">
                        {formData.paymentStatus === 'señado' ? 'Vía de Recepción de la Seña' : 'Vía de Recepción del Saldo'}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { id: 'Efectivo', lbl: 'Papel Moneda', sub: 'Efectivo', icon: <Wallet size={16} />, color: 'emerald' },
                          { id: 'Tarjeta', lbl: 'Plástico / Bank', sub: 'Débito / Crédito', icon: <Landmark size={16} />, color: 'indigo' },
                          { id: 'Transferencia', lbl: 'Digital / Bank', sub: 'Transferencia / MP', icon: <Activity size={16} />, color: 'sky' }
                        ].map((m) => {
                          const isSelected = formData.paymentStatus === 'señado' ? formData.paidMethod === m.id : formData.paymentMethod === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                if (formData.paymentStatus === 'señado') {
                                  setFormData({...formData, paidMethod: m.id});
                                } else {
                                  setFormData({...formData, paymentMethod: m.id});
                                }
                              }}
                              className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group/method ${
                                isSelected 
                                  ? `bg-${m.color}-500 text-white border-${m.color}-500 shadow-lg shadow-${m.color}-500/20 scale-[1.02]` 
                                  : `bg-[var(--bg-main)] border-[var(--border-color)]/50 text-[var(--text-secondary)] hover:border-${m.color}-400/50 hover:bg-${m.color}-500/5`
                              }`}
                            >
                              <div className={`p-2.5 rounded-xl transition-colors ${isSelected ? 'bg-white/20' : `bg-${m.color}-500/10 text-${m.color}-500`}`}>
                                {m.icon}
                              </div>
                              <div className="min-w-0">
                                <p className={`text-[10px] font-black uppercase tracking-wider leading-none ${isSelected ? 'text-white' : 'text-[var(--text-primary)] opacity-80'}`}>{m.lbl}</p>
                                <p className={`text-[9px] font-bold mt-1.5 opacity-60 ${isSelected ? 'text-white' : ''}`}>{m.sub}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Campos Condicionales: Seña */}
                    {formData.paymentStatus === 'señado' && (
                      <div className="col-span-full animate-fade-in-up">
                        <label htmlFor="paidAmount" className="block text-[10px] font-black [var(--accent-primary)] uppercase tracking-widest mb-2 ml-2 italic">Monto de la Seña (Registro parcial)</label>
                        <input id="paidAmount" name="paidAmount" 
                          type="number" 
                          placeholder="¿Cuánto abonó hoy?" 
                          value={formData.paidAmount} 
                          onChange={(e) => setFormData({...formData, paidAmount: e.target.value})} 
                          className="w-full px-6 py-4 bg-[var(--accent-light)] border border-[var(--accent-primary)]/20 rounded-2xl text-xl font-black text-[var(--accent-primary)] outline-none focus:ring-8 focus:ring-[var(--accent-primary)]/5 transition-all" 
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
                                        <div className="text-right">
                                          <span className="text-rose-400 font-bold">-${alreadyPaid.toLocaleString()}</span>
                                          {alreadyPaid > 0 && (
                                            <p className="text-[9px] opacity-40 uppercase font-black">Vía: {formData.paidMethod}</p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex justify-between items-center pt-2">
                                        <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                                          Neto a Cobrar ({formData.paymentMethod})
                                        </span>
                                        <span className="text-3xl font-black text-emerald-400 tracking-tighter">${saldoPendiente.toLocaleString()}</span>
                                      </div>
                                    </div>

                                    {formData.paymentMethod === 'Efectivo' && (
                                      <div className="bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-sm">
                                        <span className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">Calculadora de Vuelto</span>
                                        <div className="space-y-4">
                                          <div>
                                            <p className="text-[9px] font-bold text-emerald-400/60 mb-1 ml-1 uppercase">Paga con:</p>
                                            <input id="cashReceived" name="cashReceived" 
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
              <div className="pt-6 flex flex-col sm:flex-row gap-4 shrink-0 mt-4 border-t border-[var(--border-color)]/30">
                <button type="button" onClick={closeModal} className={`${userRole === 'medico' ? 'w-full' : 'w-full sm:w-1/3'} py-4 text-xs font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-main)] hover:bg-[var(--accent-light)] rounded-2xl border border-[var(--border-color)] transition-all`}>{userRole === 'medico' ? 'Finalizar Vista' : 'Cancelar operacion'}</button>
                {userRole !== 'medico' && (
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className={`w-full sm:w-2/3 py-4 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3 ${isSaving ? 'bg-[var(--text-secondary)] opacity-50 cursor-not-allowed shadow-none' : 'bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] shadow-[var(--accent-primary)]/20'}`}
                  >
                    {isSaving ? <RefreshCw className="animate-spin" size={18} /> : (editingAppointmentId ? '✓' : <Plus size={18} />)}
                    {isSaving ? "Procesando..." : (editingAppointmentId ? "Confirmar Cambios" : (isBlockMode ? "Registrar Bloqueo" : "Agendar y Guardar"))}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      , document.body)}

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
      {isMobile && menuApp && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-end justify-center">
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" 
            onClick={() => { setMenuApp(null); setMobileSeñaInput({ active: false, value: '' }); }}
          ></div>
          <div className="relative w-full bg-[var(--bg-card)] rounded-t-[32px] p-6 pb-12 animate-fade-in-up shadow-2xl border-t border-[var(--border-color)] max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="w-12 h-1.5 bg-slate-400/20 rounded-full mx-auto mb-4"></div>
            
            {/* Encabezado del bottom sheet */}
            <div className="px-2 pb-4 border-b border-[var(--border-color)]/30 mb-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones rápidas</p>
              <p className="text-base font-black text-[var(--text-primary)] mt-0.5 truncate">{menuApp.title} — {menuApp.patient}</p>
              {menuApp.paymentStatus && menuApp.paymentStatus !== 'pendiente' && (
                <span className={`inline-flex mt-1 px-2 py-0.5 text-[10px] font-black uppercase rounded-full ${
                  menuApp.paymentStatus === 'pagado' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {menuApp.paymentStatus === 'pagado' ? '✅ Abonado' : `💰 Señado: $${Number(menuApp.paidAmount || 0).toLocaleString()}`}
                </span>
              )}
            </div>

            {/* ── SECCIÓN COBROS ── */}
            {userRole !== 'medico' && (
              <div className="mb-3">
                <p className="px-2 py-1.5 text-[9px] font-black text-[var(--text-secondary)] opacity-40 uppercase tracking-widest">Caja / Cobros</p>

                {/* Pendiente */}
                <button
                  onClick={() => {
                    store.updateAppointmentPaymentStatus(menuApp.id, { paymentStatus: 'pendiente', paidAmount: 0 });
                    setMenuApp(null);
                  }}
                  className={`w-full text-left px-5 py-3.5 text-sm font-bold flex items-center justify-between rounded-xl transition-all ${
                    menuApp.paymentStatus === 'pendiente' ? 'text-rose-500 bg-rose-50' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-light)]'
                  }`}
                >
                  <span className="flex items-center gap-3"><span className="text-lg">⏳</span> Pendiente</span>
                  {menuApp.paymentStatus === 'pendiente' && <CheckCircle2 size={16} className="text-rose-500" />}
                </button>

                {/* Abonado */}
                <button
                  onClick={async () => {
                    if (menuApp.paymentStatus === 'pagado') { setMenuApp(null); return; }
                    const totalFee = Number(menuApp.paymentAmount) > 0 ? Number(menuApp.paymentAmount) : 35000;
                    const prevPaid = Number(menuApp.paidAmount || 0);
                    const amountToPay = totalFee - prevPaid;
                    toast('⏳ Procesando cobro...', { duration: 2000 });
                    try {
                      const { data: d1 } = await import('../../../services/api').then(m => m.default).then(api => api.patch(`/appointments/${menuApp.id}/payment`, {
                        paymentStatus: 'pagado', paidAmount: totalFee, paymentAmount: totalFee
                      }));
                      store.updateAppointmentPaymentStatus(menuApp.id, { paymentStatus: 'pagado', paidAmount: totalFee }).catch(()=>{});
                      
                      if (amountToPay > 0) {
                        await import('../../../services/api').then(m => m.default).then(api => api.post(`/transactions/`, {
                          type: 'Ingreso', concept: `Cobro ${menuApp.title} — ${menuApp.patient}`, method: menuApp.paymentMethod || 'Efectivo', amount: amountToPay, date: nowForAPI(), notes: `Cobro desde Agenda mobile (Turno #${menuApp.id})`, doctor_id: menuApp.doctorId, patient_id: menuApp.patientId
                        }));
                        toast.success(`✅ $${amountToPay.toLocaleString()} registrado en Finanzas`);
                      } else {
                        toast('✅ Turno marcado como abonado');
                      }
                    } catch(e) {
                      const msg = e.response?.data?.message || e.message;
                      toast.error('❌ Error: ' + msg);
                    }
                    setMenuApp(null);
                  }}
                  className={`w-full text-left px-5 py-3.5 text-sm font-bold flex items-center justify-between rounded-xl transition-all ${
                    menuApp.paymentStatus === 'pagado' ? 'text-emerald-600 bg-emerald-50 cursor-default' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-light)]'
                  }`}
                >
                  <span className="flex items-center gap-3"><span className="text-lg">✅</span> Abonado completo</span>
                  {menuApp.paymentStatus === 'pagado' && <CheckCircle2 size={16} className="text-emerald-600" />}
                </button>

                {/* Señado */}
                <button
                  onClick={() => setMobileSeñaInput({ active: true, value: String(Math.floor(Number(menuApp.paymentAmount || 35000) / 2)) })}
                  className={`w-full text-left px-5 py-3.5 text-sm font-bold flex items-center justify-between rounded-xl transition-all ${
                    menuApp.paymentStatus === 'señado' ? 'text-indigo-600 bg-indigo-50' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-light)]'
                  }`}
                >
                  <span className="flex items-center gap-3"><span className="text-lg">💰</span> Registrar Seña</span>
                  {menuApp.paymentStatus === 'señado' && <CheckCircle2 size={16} className="text-indigo-600" />}
                </button>

                {/* Input de monto de seña */}
                {mobileSeñaInput.active && (
                  <div className="mx-2 mt-1 mb-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100" onClick={e => e.stopPropagation()}>
                    <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-3">Monto de la seña</p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-indigo-500">$</span>
                        <input id="value" name="value"
                          type="number"
                          autoFocus
                          value={mobileSeñaInput.value}
                          onChange={e => setMobileSeñaInput(p => ({ ...p, value: e.target.value }))}
                          className="w-full pl-7 pr-3 py-3 text-lg font-black text-indigo-700 bg-white border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-200"
                          placeholder="0"
                        />
                      </div>
                      <button
                        onClick={async () => {
                          const amount = Number(mobileSeñaInput.value);
                          if (amount <= 0) { toast.error('Ingresá un monto válido'); return; }
                          toast('⏳ Registrando seña...', { duration: 2000 });
                          try {
                            const { data: d1 } = await import('../../../services/api').then(m => m.default).then(api => api.patch(`/appointments/${menuApp.id}/payment`, {
                              paymentStatus: 'señado', paidAmount: amount
                            }));
                            store.updateAppointmentPaymentStatus(menuApp.id, { paymentStatus: 'señado', paidAmount: amount }).catch(()=>{});
                            
                            await import('../../../services/api').then(m => m.default).then(api => api.post(`/transactions/`, {
                              type: 'Ingreso', concept: `Seña ${menuApp.title} — ${menuApp.patient}`, method: menuApp.paymentMethod || 'Efectivo', amount, date: nowForAPI(), notes: `Seña desde Agenda mobile (Turno #${menuApp.id})`, doctor_id: menuApp.doctorId, patient_id: menuApp.patientId
                            }));
                            toast.success(`✅ Seña $${amount.toLocaleString()} registrada`);
                          } catch(e) {
                            const msg = e.response?.data?.message || e.message;
                            toast.error('❌ Error: ' + msg);
                          }
                          setMobileSeñaInput({ active: false, value: '' });
                          setMenuApp(null);
                        }}
                        className="px-4 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-colors text-sm"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── SECCIÓN ASISTENCIA ── */}
            <div className="mb-3">
              <p className="px-2 py-1.5 text-[9px] font-black text-[var(--text-secondary)] opacity-40 uppercase tracking-widest">Estado de Asistencia</p>
              <button onClick={(e) => { handleStatusChange(e, menuApp.id, 'en_espera'); setMenuApp(null); }} className="w-full text-left px-5 py-3.5 text-sm font-bold text-sky-500 hover:bg-sky-500/10 flex items-center gap-3 transition-all rounded-xl">
                <CalendarDays size={20} /> Llegó a Sala
              </button>
              <button onClick={(e) => { handleStatusChange(e, menuApp.id, 'finalizado'); setMenuApp(null); }} className="w-full text-left px-5 py-3.5 text-sm font-bold text-blue-500 hover:bg-blue-500/10 flex items-center gap-3 transition-all rounded-xl">
                <CheckCircle2 size={20} /> Finalizado
              </button>
              <button onClick={(e) => { handleStatusChange(e, menuApp.id, 'ausente'); setMenuApp(null); }} className="w-full text-left px-5 py-3.5 text-sm font-bold text-rose-500 hover:bg-rose-500/10 flex items-center gap-3 transition-all rounded-xl">
                <UserX size={20} /> Ausente / Canceló
              </button>
            </div>

            {/* ── OTRAS ACCIONES ── */}
            <div className="border-t border-[var(--border-color)]/30 pt-3">
              {store.globalConfig?.whatsappEnabled && (
                <button onClick={() => { handleSendWhatsApp(menuApp); setMenuApp(null); }} className="w-full text-left px-5 py-3.5 text-sm font-bold text-emerald-500 hover:bg-emerald-500/10 flex items-center gap-3 transition-all rounded-xl">
                  <MessageCircle size={20} /> Recordatorio WhatsApp
                </button>
              )}
              {menuApp.modalidad === 'virtual' && (
                <button onClick={(e) => handleCopyVirtualLink(menuApp, e)} className="w-full text-left px-5 py-3.5 text-sm font-bold text-indigo-500 hover:bg-indigo-50 flex items-center gap-3 transition-all rounded-xl">
                  <Copy size={20} /> Copiar Link (Paciente)
                </button>
              )}
              <button onClick={() => { handleOpenEdit(menuApp); setMenuApp(null); }} className="w-full text-left px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--accent-light)] flex items-center gap-3 transition-all rounded-xl">
                <Eye size={20} /> Editar Ficha del Turno
              </button>
              {(menuApp.paymentStatus === 'pagado' || menuApp.paymentStatus === 'señado') && (
                <button onClick={() => { setReceiptApp(menuApp); setMenuApp(null); }} className="w-full text-left px-5 py-3.5 text-sm font-bold text-[var(--accent-primary)] hover:bg-[var(--accent-light)] flex items-center gap-3 transition-all rounded-xl">
                  <Receipt size={20} /> Imprimir Comprobante
                </button>
              )}
              {userRole !== 'medico' && (
                <button onClick={() => { setConfirmDelete(menuApp.id); setMenuApp(null); }} className="w-full text-left px-5 py-3.5 text-sm font-bold text-rose-500 hover:bg-rose-500/10 flex items-center gap-3 transition-all rounded-xl">
                  <Trash2 size={20} /> Eliminar Turno
                </button>
              )}
            </div>

            <button onClick={() => { setMenuApp(null); setMobileSeñaInput({ active: false, value: '' }); }} className="w-full py-4 text-sm font-black text-slate-400 mt-2 hover:text-[var(--text-primary)] transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
