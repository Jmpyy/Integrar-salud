import { useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../../../stores/useStore';
import { toast } from 'react-hot-toast';
import {
  Hourglass, HeartPulse,
  ChevronLeft, ChevronRight, Plus, Search, Clock, User, Landmark,
  MoreHorizontal, X, UserCheck, AlertCircle, Smartphone, CheckCircle2, UserX, UserMinus, Filter, CalendarDays, Lock, Wallet, RefreshCw,
  Calendar, Stethoscope, Receipt, Eye, Trash2, ReceiptText, MessageCircle, Activity, Video, Copy, Home
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
import { motion, AnimatePresence } from 'framer-motion';

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
    1: { enabled: true, start: '09:00', end: '18:00' },
    2: { enabled: true, start: '09:00', end: '18:00' },
    3: { enabled: true, start: '09:00', end: '18:00' },
    4: { enabled: true, start: '09:00', end: '18:00' },
    5: { enabled: true, start: '09:00', end: '18:00' },
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

  const isDateDisabled = (dateStr, doctorId = formData.doctorId) => {
    if (!globalConfig || !globalConfig.hours) return false;
    const d = new Date(dateStr + 'T12:00:00Z');
    const dayOfWeek = d.getDay();
    const configDay = globalConfig.hours[dayOfWeek];
    if (configDay && configDay.enabled === false) return true;

    if (doctorId) {
      const doctor = doctors.find(doc => doc.id === Number(doctorId));
      if (doctor && doctor.schedule) {
        const docDay = doctor.schedule[dayOfWeek];
        if (!docDay) return true; // Doctor no atiende este día
      }
    }
    return false;
  };

  const getDayConfig = (dateStr, doctorId = formData.doctorId) => {
    let start = '06:00';
    let end = '22:00';
    let foundGlobal = false;

    const d = new Date((dateStr || currentSelectedDateString) + 'T12:00:00Z');
    const dayOfWeek = d.getDay();

    if (globalConfig && globalConfig.hours) {
      const configDay = globalConfig.hours[dayOfWeek];
      if (configDay && configDay.enabled) {
        start = configDay.start;
        end = configDay.end;
        foundGlobal = true;
      }
    }

    if (doctorId) {
      const doctor = doctors.find(doc => doc.id === Number(doctorId));
      if (doctor && doctor.schedule) {
        const docDay = doctor.schedule[dayOfWeek];
        if (docDay) {
          const formatTime = (h) => `${String(h).padStart(2, '0')}:00`;
          const docStart = formatTime(docDay.start);
          const docEnd = formatTime(docDay.end);

          // Intersect
          if (foundGlobal) {
            if (docStart > start) start = docStart;
            if (docEnd < end) end = docEnd;
          } else {
            start = docStart;
            end = docEnd;
          }
        }
      }
    }
    return { start, end };
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

      let isDayEnabled = config.hours[dayNum]?.enabled;

      if (activeDoctor && activeDoctor.schedule) {
        if (!activeDoctor.schedule[dayNum]) {
          isDayEnabled = false;
        }
      }

      if (isDayEnabled) {
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
      const [h, m] = ts.split(':').map(Number);
      return h * 60 + m;
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

    const selectedDoctor = doctors.find(doc => doc.id === Number(formData.doctorId));
    if (selectedDoctor && selectedDoctor.schedule) {
      if (!selectedDoctor.schedule[dayOfWeek]) {
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        setWorkHoursAlert({
          title: 'Profesional no disponible',
          description: `El profesional seleccionado no atiende los días ${dayNames[dayOfWeek]}. Por favor, selecciona otra fecha u otro profesional.`,
          variant: 'danger'
        });
        return;
      }
    }

    // 2. Validar Rango Horario (Global + Médico)
    const getMinutes = (ts) => {
      const [h, m] = ts.split(':').map(Number);
      return h * 60 + m;
    };
    const startM = getMinutes(formData.time);
    const endM = startM + (formData.duration * 60);

    const combinedConfig = getDayConfig(formData.date, formData.doctorId);
    const configStartM = getMinutes(combinedConfig.start);
    const configEndM = getMinutes(combinedConfig.end);

    if (startM < configStartM || endM > configEndM) {
      setWorkHoursAlert({
        title: 'Horario Restringido',
        description: `El horario seleccionado (${formData.time}) se encuentra fuera del rango de atención del profesional para el día ${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dayOfWeek]} (${combinedConfig.start} a ${combinedConfig.end}).`,
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
    setFormData({ ...defaultForm, date: currentSelectedDateString });
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

  // -- Prevenir scroll del fondo en móviles cuando un modal o el bottom sheet están abiertos --
  useEffect(() => {
    if (isModalOpen || menuApp || receiptApp || activeDropdown) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isModalOpen, menuApp, receiptApp, activeDropdown]);

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
      const updatedApp = await store.updateAppointmentStatus(id, newStatus);
      const app = updatedApp || store.appointments.find(a => a.id === id);

      if (newStatus === 'finalizado' && app && !app.hasEvolution) {
        playErrorSound();
        toast.custom((t) => (
          <div className={`${t.visible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 max-w-sm w-full bg-[var(--bg-card)] shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-[var(--border-color)] overflow-hidden backdrop-blur-xl border border-[var(--glass-border)]`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <AlertCircle className="h-10 w-10 text-rose-500 p-2 bg-rose-500/10 rounded-xl animate-pulse" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-wider mb-1">Evolución Pendiente</p>
                  <p className="text-sm text-[var(--text-primary)] font-bold">
                    ¡Atención! Este turno ha finalizado pero falta completar la Evolución Médica.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-[var(--border-color)]/20 bg-[var(--bg-sidebar)]/50">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-2xl px-4 flex items-center justify-center text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-light)] transition-colors focus:outline-none"
              >
                Cerrar
              </button>
            </div>
          </div>
        ), { duration: 6000, position: 'top-right' });
      }

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

  const handleGoToAddEvolution = (app) => {
    const patientRecord = store.patients.find(p => p.id === app.patientId || p.name === app.patient);
    if (!patientRecord?.id) {
      toast.error('No se pudo localizar el registro del paciente');
      return;
    }
    const dateStr = `${app.date}T${app.time || '00:00'}`;
    navigate(`/dashboard/pacientes?view=${patientRecord.id}&action=add_evolution&date=${dateStr}`);
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
                        {app.attendance === 'finalizado' && !app.hasEvolution && (
                          <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-black uppercase rounded-md shadow-sm border border-red-300 animate-pulse">
                            ⚠️ Falta Evolución
                          </span>
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

                    <div className="space-y-3">
                      {/* ═══ TÍTULO Y MODALIDAD ═══ */}
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-sm sm:text-base font-black truncate tracking-tight flex-1 min-w-0">
                          {app.title || 'Consulta Médica'}
                        </h4>

                        {/* Badge de Modalidad Premium */}
                        <span
                          className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm transition-all hover:scale-105
        ${app.modalidad === 'virtual'
                              ? 'bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/25 shadow-indigo-500/10'
                              : app.modalidad === 'domicilio'
                                ? 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25 shadow-amber-500/10'
                                : 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 shadow-emerald-500/10'
                            }`}
                          title={`Modalidad: ${app.modalidad || 'Presencial'}`}
                        >
                          {app.modalidad === 'virtual' ? (
                            <Video size={10} className="animate-pulse" />
                          ) : app.modalidad === 'domicilio' ? (
                            <MapPin size={10} />
                          ) : (
                            <User size={10} />
                          )}
                          <span className="hidden sm:inline">{app.modalidad || 'Presencial'}</span>
                        </span>
                      </div>

                      {/* ═══ INFO PACIENTE Y DOCTOR ═══ */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 border-t border-[var(--border-color)]/20">
                        {/* Paciente */}
                        <div className="flex items-center gap-2 group/patient">
                          <div className="w-7 h-7 rounded-lg bg-black/10 dark:bg-white/10 flex items-center justify-center text-current text-[10px] font-black shadow-sm group-hover/patient:scale-110 transition-transform">
                            {app.patient?.charAt(0) || '?'}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold leading-tight">
                              {app.patient}
                            </span>
                            <span className="text-[9px] font-medium opacity-60 uppercase tracking-wider">
                              Paciente
                            </span>
                          </div>
                        </div>

                        {/* Separador */}
                        <div className="hidden sm:block w-px h-8 bg-[var(--border-color)]/30" />

                        {/* Doctor */}
                        <div className="flex items-center gap-2 group/doctor">
                          {(() => {
                            const doc = doctors.find(d => d.id === app.doctorId);
                            return doc?.profile_picture ? (
                              <img
                                src={doc.profile_picture}
                                alt={doc.name}
                                className="w-7 h-7 rounded-lg object-cover shadow-sm border border-current/20 group-hover/doctor:scale-110 transition-transform"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-black/10 dark:bg-white/10 flex items-center justify-center text-current shadow-sm group-hover/doctor:scale-110 transition-transform">
                                <Stethoscope size={14} />
                              </div>
                            );
                          })()}
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold leading-tight">
                              {doctors.find(d => d.id === app.doctorId)?.name?.split(' ').slice(0, 2).join(' ') || 'Profesional'}
                            </span>
                            <span className="text-[9px] font-medium opacity-70 uppercase tracking-wider">
                              {doctors.find(d => d.id === app.doctorId)?.specialty || 'Medicina General'}
                            </span>
                          </div>
                        </div>
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
              className={`hidden sm:flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-full transition-all border shadow-sm ${myTurnosOnly
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
                setFormData({ ...defaultForm, doctorId: isWeekly ? selectedDoctorWeekly : (doctors[0]?.id || ''), date: currentSelectedDateString });
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
              {col.type === 'doctor' && (
                col.doctor?.profile_picture ? (
                  <img src={col.doctor.profile_picture} alt={col.title} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover mb-2 border-2 border-[var(--bg-card)] shadow-md" />
                ) : (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-hover)] flex items-center justify-center text-white font-black text-xs sm:text-sm mb-2 shadow-md">
                    {(col.title || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                  </div>
                )
              )}
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
                          {isOffHours && <div className="absolute top-2 right-2 opacity-10"><Lock size={12} className="text-[var(--text-secondary)]" /></div>}
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
                            className={`absolute inset-0 rounded-xl border ${isShort ? 'p-1.5' : 'p-2.5'} shadow-sm cursor-pointer hover:shadow-md active:scale-[0.98] transition-all flex flex-col ${app.color} ${cardBorder} ${draggedApp?.id === app.id ? 'opacity-40 border-dashed border-2' : ''} ${activeDropdown === app.id ? 'overflow-visible' : 'overflow-hidden'}`}
                            style={{ borderLeftWidth: '4px', borderLeftColor: 'currentColor' }}
                          >
                            <div className="flex justify-between items-start relative w-full h-full min-h-0 text-current">
                              <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                                {/* Fila Superior: Título y Badges */}
                                <div className="flex items-center gap-2 mb-0.5">
                                  <h4 className={`font-black ${isShort ? 'text-[10px]' : 'text-xs'} truncate ${app.attendance === 'ausente' ? 'line-through opacity-60' : ''}`}>
                                    {app.title || 'Consulta Médica'}
                                  </h4>
                                  
                                  {/* Badge de Modalidad (Solo si hay espacio) */}
                                  {!isShort && (
                                    <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-black/10 dark:bg-white/10`} title={app.modalidad}>
                                      {app.modalidad === 'virtual' ? '💻' : app.modalidad === 'domicilio' ? '🏠' : '🏥'}
                                      <span className="hidden xl:inline">{app.modalidad || 'Presencial'}</span>
                                    </span>
                                  )}
                                </div>

                                {/* Fila Inferior: Paciente y Detalles */}
                                <div className="flex items-center gap-2 opacity-90">
                                  {/* Paciente Avatar + Nombre */}
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <div className={`rounded bg-black/10 dark:bg-white/10 flex items-center justify-center font-black shrink-0 ${isShort ? 'w-3 h-3 text-[7px]' : 'w-4 h-4 text-[9px]'}`}>
                                      {app.patient?.charAt(0) || '?'}
                                    </div>
                                    <span className={`font-bold ${isShort ? 'text-[9px]' : 'text-[10px]'} truncate max-w-[80px] xl:max-w-[120px]`}>
                                      {app.patient}
                                    </span>
                                  </div>

                                  {/* Separador */}
                                  {!isShort && <div className="w-px h-3 bg-current opacity-30" />}

                                  {/* Extra Info (Cobertura, Estados) */}
                                  {!isShort && !isBlock && (
                                    <div className="flex flex-wrap gap-1 items-center min-w-0 flex-1 truncate">
                                      {app.coverage && app.coverage !== 'Particular' && (
                                        <span className="inline-block px-1 py-0.5 bg-white/40 dark:bg-black/20 text-current text-[8px] font-black uppercase rounded">
                                          {app.coverage}
                                        </span>
                                      )}
                                      
                                      {app.attendance === 'finalizado' && !app.hasEvolution && <span className="inline-block px-1 py-0.5 bg-red-500 text-white text-[8px] font-black uppercase rounded animate-pulse">⚠️ Evo</span>}
                                      {app.attendance === 'en_curso' && <span className="inline-block px-1 py-0.5 bg-emerald-500 text-white text-[8px] font-black uppercase rounded animate-pulse">Atendiendo</span>}
                                      {app.attendance === 'en_espera' && <span className="inline-block px-1 py-0.5 bg-indigo-500 text-white text-[8px] font-black uppercase rounded animate-pulse">Sala: {app.waitTicket || "Llamar"}</span>}
                                    </div>
                                  )}
                                  
                                  {/* Bloqueado Info */}
                                  {!isShort && isBlock && (
                                    <div className="text-[9px] font-bold opacity-80">
                                      {app.duration} H - Ocupado
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Columna Derecha: Hora y Menú */}
                              <div className="flex flex-col items-end shrink-0 ml-2">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setActiveDropdown(activeDropdown === app.id ? null : app.id);
                                  }}
                                  className={`transition-all p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded z-20 ${activeDropdown === app.id ? 'bg-black/10 dark:bg-white/10' : 'opacity-40 group-hover:opacity-100'}`}
                                >
                                  <MoreHorizontal size={16} />
                                </button>
                                {!isShort && (
                                  <span className="text-[9px] font-black opacity-70 mt-auto pt-1">
                                    {app.time}
                                  </span>
                                )}
                              </div>
                            </div>
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
                                  {!['medico'].includes(userRole) && (
                                    <>
                                      <div className="px-5 py-2.5 text-[10px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-[0.2em] bg-[var(--bg-sidebar)]/30 border-y border-[var(--border-color)]/30 sticky top-0 z-10 backdrop-blur-md">Estados de Asistencia</div>
                                      <button onClick={(e) => handleStatusChange(e, app.id, 'agendado')} className="w-full text-left px-5 py-3 sm:py-2.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--accent-light)] transition-all flex items-center gap-3 border-b border-[var(--border-color)]/10"><Clock size={15} className="opacity-40" /> Agendado</button>
                                      <button onClick={(e) => handleStatusChange(e, app.id, 'confirmado')} className="w-full text-left px-5 py-3 sm:py-2.5 text-xs font-bold text-emerald-500 hover:bg-emerald-500/10 transition-all flex items-center gap-3 border-b border-[var(--border-color)]/10"><UserCheck size={15} className="opacity-60" /> Confirmado</button>
                                      <button onClick={(e) => handleStatusChange(e, app.id, 'en_espera')} className="w-full text-left px-5 py-3 sm:py-2.5 text-xs font-bold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 transition-all flex items-center gap-3 border-b border-[var(--border-color)]/10"><CalendarDays size={15} className="opacity-60" /> Llegó a Sala</button>
                                      <button onClick={(e) => handleStatusChange(e, app.id, 'finalizado')} className="w-full text-left px-5 py-3 sm:py-2.5 text-xs font-bold text-blue-400 hover:bg-blue-500/10 transition-all flex items-center gap-3 border-b border-[var(--border-color)]/10"><CheckCircle2 size={15} className="opacity-60" /> Finalizado</button>
                                      <button onClick={(e) => handleStatusChange(e, app.id, 'ausente')} className="w-full text-left px-5 py-3 sm:py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-all border-b border-[var(--border-color)]/30 flex items-center gap-3"><UserX size={15} className="opacity-60" /> Ausente / Canceló</button>
                                    </>
                                  )}


                                  {activeDropdown === app.id && userRole === 'medico' && (
                                    <div className="px-5 py-2.5 text-[10px] font-black text-[var(--text-secondary)] opacity-30 italic uppercase tracking-widest border-b border-[var(--border-color)]/20">
                                      Información Reservada
                                    </div>
                                  )}

                                  {/* ── BARRA DE ACCIONES HORIZONTALES ── */}
                                  <div className="flex items-center justify-evenly p-2 bg-[var(--bg-sidebar)]/50 border-t border-[var(--border-color)]/30 mt-1 shrink-0">
                                    {(!['medico'].includes(userRole) && (app.paymentStatus === 'pagado' || app.paymentStatus === 'señado')) && (
                                      <button
                                        title="Imprimir Comprobante"
                                        onClick={(e) => { e.stopPropagation(); setReceiptApp(app); setActiveDropdown(null); }}
                                        className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 hover:scale-110 transition-all"
                                      >
                                        <Receipt size={18} />
                                      </button>
                                    )}

                                    {(!['medico'].includes(userRole) && store.globalConfig?.whatsappEnabled) && (
                                      <button
                                        title="Recordatorio WhatsApp"
                                        onClick={(e) => { e.stopPropagation(); handleSendWhatsApp(app); setActiveDropdown(null); }}
                                        className="w-9 h-9 flex items-center justify-center rounded-xl text-emerald-600 hover:bg-emerald-500/10 hover:scale-110 transition-all"
                                      >
                                        <MessageCircle size={18} />
                                      </button>
                                    )}

                                    {app.modalidad === 'virtual' && userRole === 'medico' && (
                                      <button
                                        title="Iniciar Consulta Virtual"
                                        onClick={(e) => handleStartVirtualCall(e, app)}
                                        className="w-9 h-9 flex items-center justify-center rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 hover:scale-110 transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                                      >
                                        <Video size={18} />
                                      </button>
                                    )}

                                    {!['medico'].includes(userRole) && app.modalidad === 'virtual' && (
                                      <button
                                        title="Copiar Link Acceso (Paciente)"
                                        onClick={(e) => handleCopyVirtualLink(app, e)}
                                        className="w-9 h-9 flex items-center justify-center rounded-xl text-indigo-500 hover:bg-indigo-50 hover:scale-110 transition-all"
                                      >
                                        <Copy size={18} />
                                      </button>
                                    )}

                                    {['medico', 'admin'].includes(userRole) && app.attendance === 'finalizado' && !app.hasEvolution && (
                                      <button
                                        title="Redactar Evolución Olvidada"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleGoToAddEvolution(app);
                                        }}
                                        className="w-9 h-9 flex items-center justify-center rounded-xl text-rose-500 hover:bg-rose-50 hover:scale-110 transition-all"
                                      >
                                        <Activity size={18} />
                                      </button>
                                    )}

                                    <button
                                      title={['medico'].includes(userRole) ? 'Ver ficha detallada' : 'Editar detalles'}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEdit(app);
                                      }}
                                      className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--text-primary)] hover:bg-[var(--accent-light)] hover:scale-110 transition-all"
                                    >
                                      <Eye size={18} />
                                    </button>

                                    {!['medico'].includes(userRole) && (
                                      <button
                                        title={`Eliminar ${isBlock ? 'bloqueo' : 'turno'}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveDropdown(null);
                                          setConfirmDelete(app.id);
                                        }}
                                        className="w-9 h-9 flex items-center justify-center rounded-xl text-rose-500 hover:bg-rose-500/10 hover:scale-110 transition-all"
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                    )}
                                  </div>
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
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md animate-fade-in-quick" onClick={closeModal}></div>

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
                <div className="space-y-6 relative group">

                  {/* TIPO DE PACIENTE (Segmented Control Premium) */}
                  <div className="flex p-1 bg-[var(--bg-main)] border border-[var(--border-color)]/60 rounded-[20px] shadow-inner relative max-w-sm mx-auto sm:mx-0">
                    <button
                      type="button"
                      onClick={() => setIsNewPatient(false)}
                      className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-[16px] transition-all duration-300 z-10 ${!isNewPatient
                        ? 'bg-[var(--bg-card)] shadow-sm border border-[var(--glass-border)] text-[var(--accent-primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] opacity-60 hover:opacity-100'
                        }`}
                    >
                      Paciente Frecuente
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsNewPatient(true)}
                      className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-[16px] transition-all duration-300 z-10 ${isNewPatient
                        ? 'bg-[var(--bg-card)] shadow-sm border border-[var(--glass-border)] text-[var(--accent-primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] opacity-60 hover:opacity-100'
                        }`}
                    >
                      Primera Vez
                    </button>
                  </div>

                  {!isNewPatient ? (
                    <div className="bg-[var(--bg-card)] border border-[var(--glass-border)] p-6 rounded-[32px] shadow-sm space-y-4 animate-fade-in-quick">
                      {/* Buscador Premium */}
                      <div className="relative z-[99999]" id="patient-search-container">
                        <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2.5 ml-1 opacity-80">
                          Buscar en Base de Datos
                        </label>
                        <div className="relative group/search flex items-center">
                          <div className="absolute left-4 w-8 h-8 bg-[var(--bg-main)] rounded-xl flex items-center justify-center border border-[var(--border-color)]/50 text-[var(--text-secondary)] shadow-inner group-focus-within/search:text-[var(--accent-primary)] group-focus-within/search:border-[var(--accent-primary)]/30 group-focus-within/search:bg-[var(--accent-primary)]/10 transition-colors z-10">
                            <Search size={14} />
                          </div>
                          <input id="patientSearch" name="patientSearch"
                            type="text"
                            placeholder="Nombre, DNI o NHC..."
                            value={patientSearch}
                            autoComplete="off"
                            onChange={(e) => {
                              setPatientSearch(e.target.value);
                              setFormData({ ...formData, patientId: '' });
                            }}
                            onFocus={() => setPatientSearch(patientSearch)}
                            className="w-full pl-16 pr-12 py-4 bg-[var(--bg-main)] border border-[var(--border-color)]/60 rounded-[20px] text-sm font-bold text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 hover:border-[var(--border-color)] transition-all outline-none shadow-sm placeholder:text-[var(--text-secondary)]/40"
                          />
                          {patientSearch && (
                            <button
                              type="button"
                              onClick={() => { setPatientSearch(''); setFormData({ ...formData, patientId: '' }); }}
                              className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>

                        {/* Dropdown de resultados */}
                        {patientSearch.trim().length >= 1 && !formData.patientId && (
                          <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white/100 dark:bg-[#1A1C23]/100 backdrop-blur-2xl border border-[var(--border-color)]/80 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[99999] overflow-hidden animate-fade-in-up">
                            {(() => {
                              const filtered = (patients || []).filter(p =>
                                p && p.name && (
                                  p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
                                  (p.dni || '').includes(patientSearch) ||
                                  (p.nhc || '').toLowerCase().includes(patientSearch.toLowerCase())
                                )
                              ).slice(0, 5);

                              if (filtered.length === 0) return (
                                <div className="px-5 py-10 flex flex-col items-center gap-3 text-center">
                                  <div className="w-12 h-12 rounded-[16px] bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shadow-inner">
                                    <Search size={20} className="text-rose-500" />
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-black text-[var(--text-primary)] uppercase tracking-widest">Sin resultados</p>
                                    <p className="text-[11px] font-medium text-[var(--text-secondary)] mt-1 opacity-70">Verificá el DNI o registralo como "Primera Vez"</p>
                                  </div>
                                </div>
                              );

                              return (
                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2">
                                  <p className="px-4 py-2 text-[9px] font-black text-[var(--text-secondary)] opacity-60 uppercase tracking-widest">
                                    {filtered.length} paciente{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
                                  </p>
                                  {filtered.map((p) => {
                                    const initials = (p.name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
                                    const age = p.birthDate ? Math.floor((new Date() - new Date(p.birthDate)) / (365.25 * 24 * 60 * 60 * 1000)) : null;
                                    const isOsde = p.coverage?.toUpperCase() === 'OSDE';

                                    return (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                          setFormData({ ...formData, patientId: p.id });
                                          setPatientSearch(p.name);
                                        }}
                                        className="w-full flex items-center gap-4 p-3 hover:bg-[var(--bg-main)] rounded-[16px] transition-all group/item text-left border border-transparent hover:border-[var(--border-color)]/50"
                                      >
                                        <div className="w-10 h-10 rounded-[14px] bg-[var(--bg-card)] border border-[var(--border-color)]/60 flex items-center justify-center shrink-0 text-[var(--text-secondary)] text-[12px] font-black shadow-inner group-hover/item:text-[var(--accent-primary)] group-hover/item:border-[var(--accent-primary)]/30 transition-colors">
                                          {initials}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-black text-[var(--text-primary)] truncate">
                                              {p.name}
                                            </span>
                                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${isOsde ? 'bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-500 dark:text-indigo-400 border-indigo-500/20' : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]'}`}>
                                              {p.coverage || 'Particular'}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2 mt-1">
                                            {p.dni && <span className="text-[10px] font-bold text-[var(--text-secondary)] opacity-70">DNI {p.dni}</span>}
                                            {age !== null && <span className="text-[10px] font-bold text-[var(--text-secondary)] opacity-70">• {age} años</span>}
                                            {p.nhc && <span className="text-[10px] font-bold text-[var(--text-secondary)] opacity-50">• NHC {p.nhc}</span>}
                                          </div>
                                        </div>
                                        <div className="opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0 pr-2">
                                          <ChevronRight size={16} className="text-[var(--accent-primary)]" />
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

                      {/* Paciente seleccionado: Tarjeta Preview Premium */}
                      {formData.patientId && (() => {
                        const sel = (patients || []).find(p => String(p.id) === String(formData.patientId));
                        if (!sel) return null;
                        const initials = (sel.name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
                        const age = sel.birthDate ? Math.floor((new Date() - new Date(sel.birthDate)) / (365.25 * 24 * 60 * 60 * 1000)) : null;
                        return (
                          <div className="flex items-center gap-4 p-4 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-[20px] animate-fade-in-quick group/selected">
                            <div className="w-12 h-12 rounded-[16px] bg-[var(--bg-card)] border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400 text-sm font-black shadow-inner">
                              {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-base font-black text-[var(--text-primary)] truncate tracking-tight">{sel.name}</p>
                                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.4)]">
                                  <CheckCircle2 size={10} className="text-white" />
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">{sel.coverage || 'Particular'}</span>
                                {sel.dni && <span className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60">• DNI {sel.dni}</span>}
                                {age !== null && <span className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60">• {age} años</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      <input id="patientId" name="patientId" type="hidden" required={!isNewPatient} value={formData.patientId} />
                    </div>
                  ) : (
                    <div className="space-y-6 animate-fade-in-quick">
                      {/* Sub-Bloque: Identidad */}
                      <div className="bg-[var(--bg-card)] p-6 sm:p-8 rounded-[32px] border border-[var(--glass-border)] shadow-sm">
                        <h4 className="text-[11px] font-black text-[var(--text-secondary)] opacity-80 uppercase tracking-widest mb-6 flex items-center gap-2.5">
                          <div className="p-1.5 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-lg border border-indigo-500/20 shadow-inner">
                            <User size={14} className="text-indigo-500 dark:text-indigo-400" />
                          </div>
                          Identidad Personal
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="col-span-full space-y-2">
                            <label htmlFor="newPatientName" className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1 opacity-80">Nombre Completo *</label>
                            <input type="text" id="newPatientName" autoComplete="name" required={isNewPatient} placeholder="Ej: Juan Pérez" value={formData.newPatientName} onChange={(e) => setFormData({ ...formData, newPatientName: e.target.value })} className="w-full px-5 py-3.5 bg-[var(--bg-main)] border border-[var(--border-color)]/60 text-[var(--text-primary)] rounded-[16px] text-sm font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 hover:border-[var(--border-color)] transition-all placeholder:text-[var(--text-secondary)]/30 shadow-sm" />
                          </div>

                          <div className="space-y-2">
                            <label htmlFor="dni" className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1 opacity-80">DNI / Pasaporte</label>
                            <input type="text" id="dni" autoComplete="off" placeholder="Ej: 12345678" inputMode="numeric" value={formData.dni} onChange={(e) => setFormData({ ...formData, dni: e.target.value.replace(/[^0-9Aa-z]/g, '') })} className="w-full px-5 py-3.5 bg-[var(--bg-main)] border border-[var(--border-color)]/60 text-[var(--text-primary)] rounded-[16px] text-sm font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 hover:border-[var(--border-color)] transition-all placeholder:text-[var(--text-secondary)]/30 shadow-sm" />
                          </div>

                          <div className="space-y-2 relative group/gender">
                            <label htmlFor="gender" className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1 opacity-80">Género</label>
                            <select id="gender" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className="w-full pl-5 pr-10 py-3.5 bg-[var(--bg-main)] border border-[var(--border-color)]/60 text-[var(--text-primary)] rounded-[16px] text-sm font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 hover:border-[var(--border-color)] transition-all appearance-none cursor-pointer shadow-sm">
                              <option value="femenino" className="bg-[var(--bg-card)] font-medium">Femenino</option>
                              <option value="masculino" className="bg-[var(--bg-card)] font-medium">Masculino</option>
                              <option value="otro" className="bg-[var(--bg-card)] font-medium">Otro</option>
                              <option value="prefiero_no_decir" className="bg-[var(--bg-card)] font-medium">Prefiero no decirlo</option>
                            </select>
                            <div className="absolute right-4 top-[38px] pointer-events-none text-[var(--text-secondary)] group-hover/gender:text-indigo-500 transition-colors">
                              <ChevronRight size={14} className="rotate-90" />
                            </div>
                          </div>

                          <div className="col-span-full space-y-2 relative">
                            <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1 opacity-80 flex items-center gap-1.5">
                              <Calendar size={10} /> Fecha de Nacimiento (Opcional)
                            </label>
                            <CustomDatePicker
                              value={formData.birthDate}
                              onChange={(val) => setFormData({ ...formData, birthDate: val })}
                              className="w-full px-5 py-3.5 bg-[var(--bg-main)] border border-[var(--border-color)]/60 text-[var(--text-primary)] rounded-[16px] text-sm font-bold transition-all shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Sub-Bloque: Contacto & Cobertura */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-[var(--bg-card)] p-6 rounded-[32px] border border-[var(--glass-border)] shadow-sm">
                          <h4 className="text-[11px] font-black text-[var(--text-secondary)] opacity-80 uppercase tracking-widest mb-5 flex items-center gap-2.5">
                            <div className="p-1.5 bg-sky-500/10 dark:bg-sky-500/15 rounded-lg border border-sky-500/20 shadow-inner">
                              <Smartphone size={14} className="text-sky-500 dark:text-sky-400" />
                            </div>
                            Contacto
                          </h4>
                          <div className="space-y-4">
                            <input type="tel" placeholder="Celular (Ej: 11 1234-5678)" value={formData.newPatientPhone} onChange={(e) => setFormData({ ...formData, newPatientPhone: e.target.value.replace(/[^0-9]/g, '') })} className="w-full px-5 py-3.5 bg-[var(--bg-main)] border border-[var(--border-color)]/60 text-[var(--text-primary)] rounded-[16px] text-sm font-bold outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 hover:border-[var(--border-color)] transition-all placeholder:text-[var(--text-secondary)]/40 shadow-sm" />
                            <input type="email" placeholder="Correo (usuario@email.com)" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-5 py-3.5 bg-[var(--bg-main)] border border-[var(--border-color)]/60 text-[var(--text-primary)] rounded-[16px] text-sm font-bold outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 hover:border-[var(--border-color)] transition-all placeholder:text-[var(--text-secondary)]/40 shadow-sm" />
                            <input type="tel" placeholder="Contacto de Emergencia" value={formData.emergencyContact || ''} onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value.replace(/[^0-9\s-]/g, '') })} className="w-full px-5 py-3.5 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 text-[var(--text-primary)] rounded-[16px] text-sm font-bold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 hover:border-[var(--border-color)] transition-all placeholder:text-[var(--text-secondary)]/50 shadow-sm" />
                          </div>
                        </div>

                        <div className="bg-[var(--bg-card)] p-6 rounded-[32px] border border-[var(--glass-border)] shadow-sm">
                          <h4 className="text-[11px] font-black text-[var(--text-secondary)] opacity-80 uppercase tracking-widest mb-5 flex items-center gap-2.5">
                            <div className="p-1.5 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-lg border border-emerald-500/20 shadow-inner">
                              <Stethoscope size={14} className="text-emerald-500 dark:text-emerald-400" />
                            </div>
                            Cobertura
                          </h4>
                          <div className="space-y-4">
                            <div className="relative group/coverage">
                              <select value={formData.coverage} onChange={(e) => setFormData({ ...formData, coverage: e.target.value })} className="w-full pl-5 pr-10 py-3.5 bg-[var(--bg-main)] border border-[var(--border-color)]/60 text-[var(--text-primary)] rounded-[16px] text-sm font-black outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 hover:border-[var(--border-color)] transition-all appearance-none cursor-pointer shadow-sm">
                                <option value="Particular" className="bg-[var(--bg-card)] font-medium">Particular / Privado</option>
                                <option value="OSDE" className="bg-[var(--bg-card)] font-medium">OSDE</option>
                                <option value="Swiss Medical" className="bg-[var(--bg-card)] font-medium">Swiss Medical</option>
                                <option value="Galeno" className="bg-[var(--bg-card)] font-medium">Galeno</option>
                                <option value="IOMA" className="bg-[var(--bg-card)] font-medium">IOMA</option>
                                <option value="PAMI" className="bg-[var(--bg-card)] font-medium">PAMI</option>
                              </select>
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-secondary)] group-hover/coverage:text-emerald-500 transition-colors">
                                <ChevronRight size={14} className="rotate-90" />
                              </div>
                            </div>
                            {formData.coverage !== 'Particular' && (
                              <input type="text" required placeholder="Nº de Afiliado *" value={formData.coverageNumber} onChange={(e) => setFormData({ ...formData, coverageNumber: e.target.value })} className="w-full px-5 py-3.5 bg-[var(--bg-main)] border border-[var(--border-color)]/60 text-[var(--text-primary)] rounded-[16px] text-sm font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 hover:border-[var(--border-color)] transition-all placeholder:text-[var(--text-secondary)]/40 shadow-sm animate-fade-in-quick" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* BLOQUE TRIAJE Y MOTIVO */}
                  <div className="bg-[var(--bg-card)] p-5 sm:p-8 rounded-[32px] border border-[var(--glass-border)] shadow-sm mt-6">
                    <h4 className="text-[11px] font-black text-[var(--text-secondary)] opacity-80 uppercase tracking-widest mb-6 flex items-center gap-2.5">
                      <div className="p-1.5 bg-[var(--accent-primary)]/10 rounded-lg border border-[var(--accent-primary)]/20 shadow-inner">
                        <HeartPulse size={14} className="text-[var(--accent-primary)]" />
                      </div>
                      Modalidad y Tipo de Atención
                    </h4>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                      {/* Modalidad (Motivo) */}
                      <div className="space-y-3">
                        <label htmlFor="title" className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1 opacity-80">Modalidad / Tratamiento</label>
                        <input id="title" name="title"
                          type="text" required placeholder="Ej: Psiquiatría, Psicología, Control..."
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="w-full px-5 py-3.5 bg-[var(--bg-main)] border border-[var(--border-color)]/60 rounded-[16px] text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 shadow-sm transition-all placeholder:text-[var(--text-secondary)]/40"
                        />
                        <div className="flex flex-wrap gap-2 pt-1">
                          {['Psiquiatría', 'Psicología', 'Control'].map(tag => (
                            <button key={tag} type="button" onClick={() => setFormData({ ...formData, title: tag, type: tag.toLowerCase() })}
                              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border transition-all ${formData.title === tag
                                ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/30'
                                : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]/60 hover:border-[var(--text-secondary)]/40'
                                }`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tipo de Atención (Presencial / Virtual / Domicilio) */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest ml-1 opacity-80">Tipo de Atención</label>
                        <div className="grid grid-cols-3 p-1 bg-[var(--bg-main)] border border-[var(--border-color)]/60 rounded-[16px] shadow-inner relative gap-1">
                          {[
                            { id: 'presencial', label: 'Presencial', icon: <User size={16} className="shrink-0" /> },
                            { id: 'virtual', label: 'Virtual', icon: <Video size={16} className="shrink-0" /> }
                          ].map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setFormData({ ...formData, modalidad: t.id })}
                              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 sm:py-2.5 px-1 text-[9px] font-black uppercase tracking-widest rounded-[12px] transition-all duration-300 z-10 ${formData.modalidad === t.id
                                ? 'bg-[var(--bg-card)] shadow-md border border-[var(--glass-border)] text-[var(--accent-primary)]'
                                : 'text-[var(--text-secondary)] opacity-60 hover:opacity-100 hover:text-[var(--text-primary)] bg-transparent'
                                }`}
                            >
                              {t.icon}
                              <span className="text-center leading-tight truncate w-full sm:w-auto">{t.label}</span>
                            </button>
                          ))}
                        </div>

                        {/* Datos de videollamada */}
                        {formData.modalidad === 'virtual' && editingAppointmentId && (formData.meetLink || formData.codigoAcceso) && (
                          <div className="mt-4 p-5 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 rounded-[20px] animate-fade-in-quick">
                            <div className="flex items-center gap-2 mb-3">
                              <Video size={14} className="text-indigo-500 dark:text-indigo-400" />
                              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Sala Virtual</span>
                            </div>

                            {userRole !== 'medico' && formData.codigoAcceso && (
                              <div className="flex items-center justify-between gap-3 bg-[var(--bg-card)] p-3 rounded-[14px] border border-[var(--border-color)]/60 shadow-sm">
                                <div>
                                  <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">Código Paciente</p>
                                  <code className="text-sm font-black tracking-widest text-[var(--text-primary)] select-all">{formData.codigoAcceso}</code>
                                </div>
                                <button type="button" onClick={() => { navigator.clipboard.writeText(formData.codigoAcceso); toast.success('Copiado'); }} className="p-2.5 text-[var(--text-secondary)] hover:text-indigo-500 hover:bg-indigo-500/10 rounded-xl transition-colors">
                                  <Copy size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Si ES Bloqueo */}
              {isBlockMode && (
                <div className="bg-[var(--bg-card)] p-8 rounded-[32px] border-2 border-dashed border-rose-500/30 relative overflow-hidden group/block">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                  <label htmlFor="title" className="text-[11px] font-black text-rose-500 dark:text-rose-400 uppercase tracking-widest mb-4 ml-1 flex items-center gap-2.5">
                    <div className="p-1.5 bg-rose-500/10 rounded-lg border border-rose-500/20 shadow-inner">
                      <Lock size={14} className="text-rose-500 dark:text-rose-400" />
                    </div>
                    Evento Restringido (Bloqueo)
                  </label>
                  <input id="title" name="title" type="text" required placeholder="Ej: Almuerzo, Reunión del equipo..." value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-6 py-4 bg-[var(--bg-main)] border border-[var(--border-color)]/60 rounded-[20px] focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all shadow-sm font-bold text-[var(--text-primary)] text-lg placeholder:text-[var(--text-secondary)]/30" />
                </div>
              )}

              {/* BLOQUE DE TIEMPO Y DOCTOR */}
              <div className="bg-[var(--bg-main)] border border-[var(--border-color)]/60 p-6 sm:p-8 rounded-[32px] shadow-sm flex flex-col gap-8 relative overflow-hidden mt-6 transition-colors hover:border-[var(--border-color)]">

                {/* Profesional Responsable */}
                <div className="relative z-10">
                  <label htmlFor="doctorId" className="block text-[10px] font-black text-[var(--text-secondary)] opacity-80 uppercase tracking-widest mb-2.5 ml-1 flex items-center gap-2">
                    <div className="p-1.5 bg-[var(--bg-card)] border border-[var(--border-color)]/50 rounded-lg shadow-sm">
                      <User size={12} className="text-[var(--accent-primary)]" />
                    </div>
                    Profesional Responsable
                  </label>
                  <div className="relative group/doctor">
                    <select
                      id="doctorId"
                      name="doctorId"
                      required
                      value={formData.doctorId}
                      onChange={(e) => setFormData({ ...formData, doctorId: Number(e.target.value) })}
                      className="w-full pl-6 pr-12 py-4 bg-[var(--bg-card)] border border-[var(--glass-border)] text-[var(--text-primary)] rounded-[20px] focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-light)] outline-none font-black cursor-pointer shadow-sm group-hover/doctor:border-[var(--border-color)] transition-all text-sm sm:text-base appearance-none"
                    >
                      {(doctors || []).filter(d => d && d.id).map(d => (
                        <option key={d.id} value={d.id} className="bg-[var(--bg-card)] font-medium">
                          Dr. {d.name || 'Sin nombre'} — {d.specialty || 'General'}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-secondary)] group-hover/doctor:text-[var(--accent-primary)] transition-colors">
                      <ChevronRight size={18} className="rotate-90" />
                    </div>
                  </div>
                </div>

                {/* Grid de Fecha / Hora / Duración */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 relative z-10 border-t border-[var(--border-color)]/40 pt-6">

                  {/* Fecha */}
                  <div className="flex flex-col gap-1 relative group/date">
                    <span className="block text-[10px] font-black text-[var(--text-secondary)] opacity-80 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1.5">
                      <Calendar size={12} className="text-indigo-500 dark:text-indigo-400" /> Fecha
                    </span>
                    <CustomDatePicker
                      value={formData.date}
                      onChange={(val) => setFormData({ ...formData, date: val })}
                      isDateDisabled={isDateDisabled}
                      className="w-full px-5 py-3.5 bg-[var(--bg-card)] border border-[var(--glass-border)] group-hover/date:border-[var(--border-color)] focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 rounded-[16px] text-sm font-bold shadow-sm transition-all"
                    />
                  </div>

                  {/* Hora */}
                  <div className="flex flex-col gap-1 relative group/time">
                    <span className="block text-[10px] font-black text-[var(--text-secondary)] opacity-80 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1.5">
                      <Clock size={12} className="text-emerald-500 dark:text-emerald-400" /> Hora Inicio
                    </span>
                    <CustomTimePicker
                      value={formData.time}
                      onChange={(val) => setFormData({ ...formData, time: val })}
                      min={currentDayConfig.start}
                      max={currentDayConfig.end}
                      className="w-full px-5 py-3.5 bg-[var(--bg-card)] border border-[var(--glass-border)] group-hover/time:border-[var(--border-color)] focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 rounded-[16px] text-sm font-bold shadow-sm transition-all"
                    />
                  </div>

                  {/* Duración */}
                  <div className="flex flex-col gap-1 relative group/duration">
                    <label htmlFor="duration" className="block text-[10px] font-black text-[var(--text-secondary)] opacity-80 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1.5">
                      <Clock size={12} className="text-amber-500 dark:text-amber-400" /> Duración
                    </label>
                    <div className="relative">
                      <select
                        id="duration"
                        name="duration"
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                        className="w-full pl-5 pr-10 py-3.5 bg-[var(--bg-card)] border border-[var(--glass-border)] text-[var(--text-primary)] rounded-[16px] focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none text-sm font-bold cursor-pointer group-hover/duration:border-[var(--border-color)] transition-all appearance-none shadow-sm"
                      >
                        <option value={0.5} className="bg-[var(--bg-card)] font-medium">30 Minutos</option>
                        <option value={1} className="bg-[var(--bg-card)] font-medium">1 Hora</option>
                        <option value={1.5} className="bg-[var(--bg-card)] font-medium">1 Hora 30 Min</option>
                        <option value={2} className="bg-[var(--bg-card)] font-medium">2 Horas</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-secondary)] group-hover/duration:text-amber-500 transition-colors">
                        <ChevronRight size={14} className="rotate-90" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* FACTURACIÓN Y PAGO */}
              {!isBlockMode && userRole !== 'medico' && (
                <div className="bg-[var(--bg-card)] border border-[var(--glass-border)] p-6 sm:p-8 rounded-[32px] shadow-sm relative group/billing transition-all hover:border-emerald-500/30 overflow-hidden mt-6">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

                  <div className="relative z-10">
                    <h4 className="text-[11px] font-black text-emerald-500 dark:text-emerald-400 uppercase mb-6 flex items-center gap-2.5 tracking-widest">
                      <div className="p-1.5 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-lg border border-emerald-500/20 shadow-inner">
                        <Wallet size={16} />
                      </div>
                      Facturación y Cobro
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                      {/* Estado de Pago */}
                      <div className="col-span-full md:col-span-1">
                        <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2.5 ml-1 opacity-80">Estado del Cobro</label>
                        <div className="flex p-1 bg-[var(--bg-main)] border border-[var(--border-color)]/60 rounded-[18px] shadow-inner relative">
                          {[
                            { id: 'pendiente', label: 'Pendiente', color: 'text-rose-500 dark:text-rose-400' },
                            { id: 'señado', label: 'Señado', color: 'text-amber-500 dark:text-amber-400' },
                            { id: 'pagado', label: 'Pagado', color: 'text-emerald-500 dark:text-emerald-400' }
                          ].map((status) => {
                            const isSelected = formData.paymentStatus === status.id;
                            return (
                              <button
                                key={status.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, paymentStatus: status.id })}
                                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-[14px] transition-all duration-300 z-10 ${isSelected
                                  ? `bg-[var(--bg-card)] shadow-sm border border-[var(--glass-border)] ${status.color}`
                                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] opacity-60 hover:opacity-100'
                                  }`}
                              >
                                {status.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Monto Total */}
                      <div className="col-span-full md:col-span-1">
                        <label htmlFor="paymentAmount" className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2.5 ml-1 opacity-80">Monto del Arancel</label>
                        <div className="relative group/amount flex items-center">
                          <div className="absolute left-4 w-8 h-8 bg-[var(--bg-main)] rounded-xl flex items-center justify-center border border-[var(--border-color)]/50 text-[var(--text-secondary)] font-black shadow-inner group-focus-within/amount:text-emerald-500 group-focus-within/amount:border-emerald-500/30 group-focus-within/amount:bg-emerald-500/10 transition-colors">
                            $
                          </div>
                          <input id="paymentAmount" name="paymentAmount"
                            type="number"
                            placeholder="0.00"
                            value={formData.paymentAmount}
                            onChange={(e) => setFormData({ ...formData, paymentAmount: e.target.value })}
                            className="w-full pl-16 pr-6 py-3.5 bg-[var(--bg-main)] border border-[var(--border-color)]/60 rounded-[18px] text-lg font-black text-[var(--text-primary)] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 hover:border-[var(--border-color)] shadow-sm transition-all placeholder:text-[var(--text-secondary)]/30"
                          />
                        </div>
                      </div>

                      {/* ✅ MÉTODOS DE PAGO - CORREGIDO (clases dinámicas eliminadas) */}
                      <div className="col-span-full">
                        <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2.5 ml-1 opacity-80">
                          {formData.paymentStatus === 'señado' ? 'Vía de Recepción de la Seña' : 'Vía de Recepción del Saldo'}
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            {
                              id: 'Efectivo',
                              lbl: 'Efectivo',
                              sub: 'Billetes físicos',
                              icon: <Wallet size={18} />,
                              selectedClasses: 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/20',
                              iconClasses: 'bg-[var(--bg-card)] text-emerald-500 dark:text-emerald-400 border-emerald-500/20',
                              textClasses: 'text-emerald-600 dark:text-emerald-400',
                              indicatorColor: 'bg-emerald-500'
                            },
                            {
                              id: 'Tarjeta',
                              lbl: 'Tarjeta',
                              sub: 'Débito / Crédito',
                              icon: <Landmark size={18} />,
                              selectedClasses: 'bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500/40 ring-1 ring-indigo-500/20',
                              iconClasses: 'bg-[var(--bg-card)] text-indigo-500 dark:text-indigo-400 border-indigo-500/20',
                              textClasses: 'text-indigo-600 dark:text-indigo-400',
                              indicatorColor: 'bg-indigo-500'
                            },
                            {
                              id: 'Transferencia',
                              lbl: 'Digital',
                              sub: 'Transferencia / MP',
                              icon: <Activity size={18} />,
                              selectedClasses: 'bg-sky-500/5 dark:bg-sky-500/10 border-sky-500/40 ring-1 ring-sky-500/20',
                              iconClasses: 'bg-[var(--bg-card)] text-sky-500 dark:text-sky-400 border-sky-500/20',
                              textClasses: 'text-sky-600 dark:text-sky-400',
                              indicatorColor: 'bg-sky-500'
                            }
                          ].map((m) => {
                            const isSelected = formData.paymentStatus === 'señado' ? formData.paidMethod === m.id : formData.paymentMethod === m.id;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  if (formData.paymentStatus === 'señado') setFormData({ ...formData, paidMethod: m.id });
                                  else setFormData({ ...formData, paymentMethod: m.id });
                                }}
                                className={`flex items-center gap-4 p-4 rounded-[20px] border transition-all text-left group/method relative overflow-hidden ${isSelected
                                  ? m.selectedClasses + ' shadow-sm'
                                  : 'bg-[var(--bg-main)] border-[var(--border-color)]/60 hover:border-[var(--text-secondary)]/40 hover:bg-[var(--bg-card)]'
                                  }`}
                              >
                                {isSelected && <div className={`absolute left-0 top-0 bottom-0 w-1 ${m.indicatorColor}`}></div>}

                                <div className={`p-3 rounded-2xl transition-colors shadow-inner border ${isSelected ? m.iconClasses : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)]/50'}`}>
                                  {m.icon}
                                </div>
                                <div className="min-w-0">
                                  <p className={`text-[11px] font-black uppercase tracking-widest leading-none mb-1 ${isSelected ? m.textClasses : 'text-[var(--text-primary)]'}`}>{m.lbl}</p>
                                  <p className="text-[10px] font-bold text-[var(--text-secondary)] opacity-70">{m.sub}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Campos Condicionales: Seña */}
                      {formData.paymentStatus === 'señado' && (
                        <div className="col-span-full animate-fade-in-quick">
                          <label htmlFor="paidAmount" className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2.5 ml-1 opacity-80">
                            Monto de la Seña <span className="text-amber-500 dark:text-amber-400 ml-1">(Registro parcial)</span>
                          </label>
                          <div className="relative flex items-center">
                            <div className="absolute left-4 w-8 h-8 bg-[var(--bg-main)] rounded-xl flex items-center justify-center border border-[var(--border-color)]/50 text-amber-500 dark:text-amber-400 font-black shadow-inner">
                              $
                            </div>
                            <input id="paidAmount" name="paidAmount"
                              type="number"
                              placeholder="¿Cuánto abonó hoy?"
                              value={formData.paidAmount}
                              onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                              className="w-full pl-16 pr-6 py-3.5 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/30 rounded-[18px] text-lg font-black text-amber-600 dark:text-amber-400 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-sm transition-all placeholder:text-amber-500/40"
                            />
                          </div>
                        </div>
                      )}

                      {/* Resumen de Cobro Premium */}
                      {formData.paymentStatus !== 'pendiente' && (
                        <div className="col-span-full mt-2 animate-fade-in-up">
                          <div className="bg-[var(--bg-main)] border border-[var(--border-color)]/80 rounded-[32px] p-6 sm:p-8 shadow-sm relative overflow-hidden">
                            <div className="relative z-10 space-y-6">
                              <div className="flex justify-between items-end border-b border-[var(--border-color)]/60 pb-5">
                                <div>
                                  <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1">Carga Operativa</p>
                                  <h5 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Ticket de Cobro</h5>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1">ID Ref</p>
                                  <p className="text-xs font-mono font-bold text-[var(--text-secondary)]">#{editingAppointmentId || 'NEW'}</p>
                                </div>
                              </div>

                              {(() => {
                                const originalApp = editingAppointmentId ? appointments.find(a => a.id === editingAppointmentId) : null;
                                const alreadyPaid = Number(originalApp?.paidAmount || (originalApp?.paymentStatus === 'pagado' ? originalApp.paymentAmount : 0)) || 0;
                                const totalArancel = Number(formData.paymentAmount || 0);
                                const currentTarget = formData.paymentStatus === 'pagado' ? totalArancel : Number(formData.paidAmount || 0);
                                const saldoPendiente = Math.max(0, currentTarget - alreadyPaid);

                                const cash = Number(cashReceived) || 0;
                                const diferencia = cash - saldoPendiente;

                                let calcState = 'empty';
                                if (cash > 0) {
                                  if (diferencia > 0) calcState = 'change';
                                  else if (diferencia < 0) calcState = 'debt';
                                  else calcState = 'exact';
                                }

                                return (
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                                    <div className="space-y-4 mt-2">
                                      <div className="flex justify-between items-center text-sm font-bold border-b border-[var(--border-color)]/40 pb-3">
                                        <span className="text-[var(--text-secondary)]">Total del Arancel</span>
                                        <span className="text-[var(--text-primary)]">${totalArancel.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between items-center text-sm font-bold border-b border-[var(--border-color)]/40 pb-3">
                                        <span className="text-[var(--text-secondary)]">Señas / Pagos Previos</span>
                                        <div className="text-right">
                                          <span className="text-rose-500 dark:text-rose-400">-${alreadyPaid.toLocaleString()}</span>
                                          {alreadyPaid > 0 && (
                                            <p className="text-[9px] text-[var(--text-secondary)] uppercase font-black mt-0.5">Vía: {formData.paidMethod}</p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex justify-between items-center pt-2">
                                        <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                                          Neto a Cobrar ({formData.paymentMethod})
                                        </span>
                                        <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">${saldoPendiente.toLocaleString()}</span>
                                      </div>
                                    </div>

                                    {formData.paymentMethod === 'Efectivo' && (
                                      <div className="bg-[var(--bg-card)] rounded-[24px] p-5 border border-[var(--glass-border)] shadow-sm">
                                        <span className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-4 flex items-center gap-2">
                                          <Wallet size={12} /> Calculadora Inteligente
                                        </span>
                                        <div className="space-y-4">
                                          <div>
                                            <p className="text-[9px] font-bold text-[var(--text-secondary)] mb-1 ml-1 uppercase">Paciente entrega:</p>
                                            <div className="relative">
                                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-[var(--text-secondary)]">$</span>
                                              <input id="cashReceived" name="cashReceived"
                                                type="number"
                                                placeholder="Monto físico..."
                                                value={cashReceived}
                                                onChange={(e) => setCashReceived(e.target.value)}
                                                className="w-full bg-[var(--bg-main)] border border-[var(--border-color)]/60 rounded-xl pl-8 pr-4 py-2.5 text-lg font-black text-[var(--text-primary)] outline-none focus:border-emerald-500 transition-all placeholder:text-[var(--text-secondary)]/30"
                                              />
                                            </div>
                                          </div>

                                          <div className={`border rounded-xl p-3 flex justify-between items-center transition-all duration-300 ${calcState === 'empty' ? 'bg-[var(--bg-main)] border-[var(--border-color)]/50' :
                                            calcState === 'change' ? 'bg-emerald-500/10 border-emerald-500/20' :
                                              calcState === 'debt' ? 'bg-rose-500/10 dark:bg-rose-500/15 border-rose-500/20' :
                                                'bg-indigo-500/10 dark:bg-indigo-500/15 border-indigo-500/20'
                                            }`}>
                                            <p className={`text-[10px] font-black uppercase tracking-widest transition-colors ${calcState === 'empty' ? 'text-[var(--text-secondary)] opacity-60' :
                                              calcState === 'change' ? 'text-emerald-600 dark:text-emerald-400' :
                                                calcState === 'debt' ? 'text-rose-600 dark:text-rose-400' :
                                                  'text-indigo-600 dark:text-indigo-400'
                                              }`}>
                                              {calcState === 'empty' ? 'Esperando ingreso...' :
                                                calcState === 'change' ? 'Dar Vuelto:' :
                                                  calcState === 'debt' ? 'Falta cobrar:' :
                                                    'Pago Exacto'}
                                            </p>
                                            <div className={`text-xl font-black tracking-tighter transition-colors ${calcState === 'empty' ? 'text-[var(--text-secondary)] opacity-30' :
                                              calcState === 'change' ? 'text-emerald-600 dark:text-emerald-400' :
                                                calcState === 'debt' ? 'text-rose-600 dark:text-rose-400' :
                                                  'text-indigo-600 dark:text-indigo-400'
                                              }`}>
                                              {calcState === 'empty' ? '-' :
                                                calcState === 'exact' ? <CheckCircle2 size={24} className="mt-0.5" /> :
                                                  `$${Math.abs(diferencia).toLocaleString()}`}
                                            </div>
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

                    <p className="mt-6 text-[10px] text-[var(--text-secondary)] font-bold flex items-center gap-2 uppercase tracking-widest">
                      <AlertCircle size={14} className={formData.paymentStatus === 'pendiente' ? 'text-amber-500' : 'text-emerald-500'} />
                      {formData.paymentStatus === 'pendiente'
                        ? 'No se registrarán movimientos financieros aún.'
                        : 'Al guardar, se emitirá automáticamente la transacción en Finanzas.'}
                    </p>
                  </div>
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
    </div>
  );
}
