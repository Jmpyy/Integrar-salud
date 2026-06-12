import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Video, ShieldCheck, Loader2, ArrowRight, UserCircle, LogOut, CalendarClock, Clock, AlertCircle, Lightbulb, Mic, Wifi, FileText, CheckCircle, Star, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';

const WAITING_TIPS = [
  {
    icon: Lightbulb,
    title: "Buena Iluminación",
    text: "Ubicáte en un lugar con buena luz, preferentemente frente a una ventana, para que el profesional te vea con claridad.",
    color: "text-amber-600",
    bg: "bg-amber-100"
  },
  {
    icon: Mic,
    title: "Revisá tu Micrófono",
    text: "Aseguráte de estar en un ambiente silencioso y sin eco. Usar auriculares suele ayudar muchísimo a escuchar mejor.",
    color: "text-indigo-600",
    bg: "bg-indigo-100"
  },
  {
    icon: Wifi,
    title: "Conexión Estable",
    text: "Si estás usando datos móviles, verificá tener buena señal. Recomendamos usar Wi-Fi para que el video no se corte.",
    color: "text-emerald-600",
    bg: "bg-emerald-100"
  },
  {
    icon: FileText,
    title: "Tené a mano tus estudios",
    text: "Si te hiciste estudios recientes o tomás medicación periódica, tené los papeles cerca por si el profesional te los consulta.",
    color: "text-sky-600",
    bg: "bg-sky-100"
  }
];

import JitsiMeeting from '../../components/JitsiMeeting';
import { socket } from '../../services/socket';

export default function VirtualRoomPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [dni, setDni] = useState(searchParams.get('dni') || '');
  const [codigo, setCodigo] = useState(searchParams.get('codigo') || '');
  
  const [loading, setLoading] = useState(false);
  // roomState: 'login' | 'waiting' | 'early' | 'past' | 'active_call' | 'goodbye'
  const [roomState, setRoomState] = useState('login');
  const [paymentError, setPaymentError] = useState(null);
  const [appointmentData, setAppointmentData] = useState(null);
  const [earlyData, setEarlyData] = useState(null);
  const [delayMessage, setDelayMessage] = useState(null);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Estados de la reseña
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [publicConfig, setPublicConfig] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://control.integrarsalud.me/api-integrar/api'}/settings/public`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) setPublicConfig(data);
      })
      .catch(() => {});
  }, []);

  const handleSubmitReview = async () => {
    if (!reviewRating) return;
    setReviewLoading(true);
    try {
      const API = import.meta.env.VITE_API_BASE_URL || 'https://control.integrarsalud.me/api-integrar/api';
      const res = await fetch(`${API}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: appointmentData?.appointmentId,
          codigo: codigo,
          rating: reviewRating,
          comment: reviewComment.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al enviar');
      setReviewSubmitted(true);
      
      // Alerta de crisis (websocket)
      if (reviewRating <= 2) {
        socket.emit('low-rating-alert', {
          patient_name: appointmentData?.patientName || 'Paciente',
          doctor_name: appointmentData?.doctorName || 'Médico',
          rating: reviewRating,
        });
      }

      import('react-hot-toast').then(({ default: toast }) => {
        toast.success('¡Gracias por tu opinión! 🌟', { duration: 4000 });
      });
    } catch (err) {
      import('react-hot-toast').then(({ default: toast }) => {
        toast.error(err.message || 'No se pudo enviar la reseña');
      });
    } finally {
      setReviewLoading(false);
    }
  };

  // Rotar tips en la sala de espera
  useEffect(() => {
    let interval;
    if (roomState === 'waiting') {
      interval = setInterval(() => {
        setCurrentTipIndex(prev => (prev + 1) % WAITING_TIPS.length);
      }, 8000);
    }
    return () => clearInterval(interval);
  }, [roomState]);

  // WebSockets: Conectar y escuchar eventos
  useEffect(() => {
    if (appointmentData?.appointmentId) {
      const roomId = `appointment-${appointmentData.appointmentId}`;
      
      if (appointmentData.token) {
        socket.auth = { token: appointmentData.token };
      }

      const onConnect = () => {
        socket.emit('join-room', roomId);
        socket.emit('patient-entered', {
          appointmentId: appointmentData.appointmentId,
          patientName: appointmentData.patientName,
          doctorName: appointmentData.doctorName
        });
      };

      const onCallStarted = () => {
        setRoomState(prev => {
          if (prev !== 'active_call') {
            toast.success('¡El médico ha iniciado la consulta!');
            return 'active_call';
          }
          return prev;
        });
      };

      const onCallEnded = () => {
        setRoomState('goodbye');
      };

      const onDelayUpdated = (msg) => {
        setDelayMessage(msg || null);
      };

      socket.on('connect', onConnect);
      socket.on('call-started', onCallStarted);
      socket.on('call-ended', onCallEnded);
      socket.on('delay-updated', onDelayUpdated);

      if (socket.connected) {
        onConnect();
      } else {
        socket.connect();
      }

      return () => {
        socket.off('connect', onConnect);
        socket.off('call-started', onCallStarted);
        socket.off('call-ended', onCallEnded);
        socket.off('delay-updated', onDelayUpdated);
        socket.emit('leave-room', roomId);
      };
    }
  }, [appointmentData]);

  // Handle tab closing
  useEffect(() => {
    const handleUnload = (e) => {
      // No desconectar si está en llamada activa y solo cambia de pestaña/minimiza
      if (e && e.type === 'visibilitychange') {
        if (document.visibilityState !== 'hidden') return; // Solo cuando oculta
        if (roomState === 'active_call') return; // Durante llamada no desconectar
      }
      if (appointmentData?.appointmentId && codigo) {
        const API = import.meta.env.VITE_API_BASE_URL || 'https://control.integrarsalud.me/api-integrar/api';
        const leaveUrl = `${API}/telemedicine/leave_room?id=${appointmentData.appointmentId}&codigo=${codigo}`;
        navigator.sendBeacon(leaveUrl);
        socket.disconnect();
      }
    };
    
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    document.addEventListener('visibilitychange', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      document.removeEventListener('visibilitychange', handleUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentData, codigo]);

  const handleLeaveRoom = async () => {
    if (appointmentData?.appointmentId && codigo) {
      try {
        const API = import.meta.env.VITE_API_BASE_URL || 'https://control.integrarsalud.me/api-integrar/api';
        await fetch(`${API}/telemedicine/leave_room?id=${appointmentData.appointmentId}&codigo=${codigo}`, { method: 'GET' });
      } catch (error) {
        console.error('Error leaving room', error);
      }
    }
    socket.disconnect();
    setRoomState('login');
    setAppointmentData(null);
  };

  const handleAccess = async (e, forceDni, forceCodigo) => {
    if (e) e.preventDefault();
    
    const d = forceDni || dni;
    const c = forceCodigo || codigo;

    if (!d || !c) return toast.error('Ingresá tu DNI y el código de acceso');

    setLoading(true);
    setPaymentError(null);
    try {
      const API = import.meta.env.VITE_API_BASE_URL || 'https://control.integrarsalud.me/api-integrar/api';
      const res = await fetch(`${API}/telemedicine/verify_access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni: d, codigo: c.toUpperCase() })
      });
      const data = await res.json();

      // 202: turno existe pero no es hoy (muy temprano o ya pasó)
      if (res.status === 202) {
        setEarlyData(data.data);
        setRoomState(data.status === 'past' ? 'past' : 'early');
        return;
      }

      // 402: turno no pagado
      if (res.status === 402) {
        setPaymentError(data.message);
        return;
      }

      if (!res.ok || data.error) {
        throw new Error(data.message || 'Error de acceso');
      }

      setAppointmentData(data); // data contains appointmentId, doctorName directly
      setRoomState(['activa', 'en_curso'].includes(data.status) ? 'active_call' : 'waiting');
      toast.success('Acceso correcto. Estás en la sala virtual.');
      if (!searchParams.get('codigo') || !searchParams.get('dni')) {
        setSearchParams({ dni: d, codigo: c.toUpperCase() });
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-login para Magic Links
  useEffect(() => {
    const urlDni = searchParams.get('dni');
    const urlCodigo = searchParams.get('codigo');
    if (urlDni && urlCodigo && roomState === 'login') {
      handleAccess(null, urlDni, urlCodigo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chequeo de cámara y micrófono al entrar a la sala de espera
  useEffect(() => {
    if (roomState === 'waiting') {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          stream.getTracks().forEach(track => track.stop());
        })
        .catch(() => {
          toast.error("Por favor, permití el acceso a la cámara y micrófono para la videollamada.", { duration: 6000 });
        });
    }
  }, [roomState]);

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-4 sm:p-8 relative">
      <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl rounded-2xl p-8 sm:p-10 relative z-10 animate-fade-in-up">

        {/* Header siempre visible */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
            <Video size={28} className="text-[var(--accent-primary)]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">Telemedicina</h1>
          <p className="text-sm font-medium text-[var(--text-secondary)] mt-2">Atención médica virtual</p>
        </div>

        {/* ── ESTADO: Formulario de acceso ── */}
        {roomState === 'login' && (
          <form onSubmit={handleAccess} className="space-y-5">
            
            <AnimatePresence>
              {paymentError && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-3 text-left overflow-hidden"
                >
                  <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="text-sm font-bold text-rose-800 mb-1">Pago Requerido</h4>
                    <p className="text-xs text-rose-700 font-medium leading-relaxed">{paymentError}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label htmlFor="dni" className="text-xs font-semibold text-[var(--text-secondary)] pl-1">Tu DNI</label>
              <div className="relative">
                <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-70" size={20} />
                <input 
                  id="dni"
                  name="dni"
                  type="text" 
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                  placeholder="Número de documento"
                  className="w-full pl-11 pr-4 py-3.5 bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] rounded-xl outline-none font-medium text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] placeholder:opacity-50 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="codigo" className="text-xs font-semibold text-[var(--text-secondary)] pl-1">Código de Acceso</label>
              <div className="relative">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-70" size={20} />
                <input 
                  id="codigo"
                  name="codigo"
                  type="text" 
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="Ej: A1B2C3"
                  className="w-full pl-11 pr-4 py-3.5 bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] rounded-xl outline-none font-medium text-[var(--text-primary)] uppercase tracking-wider placeholder:text-[var(--text-secondary)] placeholder:opacity-50 transition-all"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3.5 mt-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>Verificando <Loader2 size={18} className="animate-spin" /></>
              ) : (
                <>Ingresar a la Sala <ArrowRight size={18} /></>
              )}
            </button>
          </form>
        )}

        {/* ── ESTADO: Acceso temprano (turno futuro) ── */}
        {roomState === 'early' && earlyData && (
          <div className="text-center animate-fade-in-quick">
            <div className="w-16 h-16 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CalendarClock size={28} className="text-amber-500" />
            </div>

            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Turno Programado</h2>
            <p className="text-sm font-medium text-[var(--text-secondary)] mb-6 px-2 leading-relaxed">
              {earlyData.message || <>Tus credenciales son correctas, pero tu consulta <strong className="text-[var(--text-primary)]">todavía no comenzó</strong>.</>}
            </p>

            {/* Tarjeta con datos del turno */}
            <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl p-5 mb-6 text-left space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg flex items-center justify-center shrink-0">
                  <CalendarClock size={16} className="text-[var(--text-primary)] opacity-70" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">Fecha de la consulta</p>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{earlyData.appointmentDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg flex items-center justify-center shrink-0">
                  <Clock size={16} className="text-[var(--text-primary)] opacity-70" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">Horario</p>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{earlyData.appointmentTime} hs</p>
                </div>
              </div>
              <div className="pt-3 mt-1 border-t border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-2">
                <ShieldCheck size={14} className="shrink-0" />
                Con el profesional: <span className="text-[var(--text-primary)]">{earlyData.doctorName}</span>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)] opacity-80 font-medium mb-6 px-4">
              Volvé a ingresar a esta página el día de tu consulta con los mismos datos para acceder a la sala de espera.
            </p>

            <button 
              onClick={() => { setRoomState('login'); setEarlyData(null); }}
              className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center justify-center gap-1 mx-auto"
            >
              <LogOut size={14} /> Volver
            </button>
          </div>
        )}

        {/* ── ESTADO: Turno pasado ── */}
        {roomState === 'past' && earlyData && (
          <div className="text-center animate-fade-in-quick">
            <div className="w-16 h-16 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={28} className="text-rose-500" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Consulta Finalizada</h2>
            <p className="text-sm font-medium text-[var(--text-secondary)] mb-6 px-2 leading-relaxed">
              La consulta programada para el <strong className="text-[var(--text-primary)]">{earlyData.appointmentDate} a las {earlyData.appointmentTime} hs</strong> ya ha pasado.
            </p>
            <p className="text-xs text-[var(--text-secondary)] opacity-80 font-medium mb-6">
              Si necesitás una nueva consulta, contactate con el consultorio.
            </p>
            <button 
              onClick={() => { setRoomState('login'); setEarlyData(null); }}
              className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center justify-center gap-1 mx-auto"
            >
              <LogOut size={14} /> Volver
            </button>
          </div>
        )}

        {/* ── ESTADO: Sala de espera activa ── */}
        {roomState === 'waiting' && (
          <div className="text-center animate-fade-in-quick">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-[var(--accent-primary)]/10 rounded-full animate-ping opacity-75"></div>
              <div className="relative w-full h-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-full flex items-center justify-center shadow-sm">
                <Video size={32} className="text-[var(--accent-primary)] animate-pulse" />
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Sala de Espera</h2>
            <p className="text-sm font-medium text-[var(--text-secondary)] mb-6 px-4">
              Estás en la sala de espera virtual del profesional <strong className="text-[var(--text-primary)]">{appointmentData?.doctorName || ''}</strong>. 
              Aguardá en esta pantalla, te conectaremos automáticamente cuando inicie la consulta.
            </p>

            {/* Carrusel Dinámico */}
            <div className="h-40 sm:h-36 mb-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTipIndex}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl p-5 text-left shadow-sm flex gap-4 h-full"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-[var(--border-color)] bg-[var(--bg-card)]`}>
                    {(() => {
                      const Icon = WAITING_TIPS[currentTipIndex].icon;
                      return <Icon size={18} className="text-[var(--text-primary)] opacity-70" />;
                    })()}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{WAITING_TIPS[currentTipIndex].title}</h4>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                      {WAITING_TIPS[currentTipIndex].text}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {delayMessage ? (
              <div className="flex flex-col items-center justify-center gap-2 text-xs font-semibold text-amber-600 bg-[var(--bg-main)] border border-amber-500/30 px-4 py-4 rounded-xl mb-6 animate-fade-in-up">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-500 animate-pulse" />
                  <span>Aviso del Profesional</span>
                </div>
                <p className="text-center">{delayMessage}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 text-xs font-semibold text-[var(--accent-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] px-4 py-3 rounded-xl mb-6">
                <div className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Esperando al profesional...
                </div>
              </div>
            )}

            <button 
              onClick={handleLeaveRoom}
              className="text-xs font-bold text-[var(--text-secondary)] hover:text-rose-500 transition-colors flex items-center justify-center gap-1 mx-auto"
            >
              <LogOut size={14} /> Salir de la sala
            </button>
          </div>
        )}
      </div>

      {/* ── ESTADO: Llamada activa (Jitsi) ── */}
      {roomState === 'active_call' && (
        <div className="fixed inset-0 z-[99999] flex flex-col bg-black animate-fade-in-quick">
          {/* Header de la videollamada para el paciente */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                <Video size={20} className="text-indigo-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm sm:text-base">Consulta en curso</h3>
                <p className="text-slate-400 text-xs">Con {appointmentData?.doctorName}</p>
              </div>
            </div>
            <button
              onClick={handleLeaveRoom}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-rose-500/20 flex items-center gap-2 text-sm"
            >
              <LogOut size={16} /> Salir
            </button>
          </div>
          {/* Jitsi Meeting */}
          <div className="flex-1 relative bg-black">
            <JitsiMeeting
              roomName={`integrarsalud-${appointmentData?.appointmentId}-${codigo.substring(0, 5)}`}
              password={codigo.length >= 6 ? codigo.substring(5) : codigo}
              isModerator={false}
              displayName={appointmentData?.patientName || "Paciente"}
              onReadyToClose={handleLeaveRoom}
            />
          </div>
        </div>
      )}
      {/* ── ESTADO: Despedida ── */}
      {roomState === 'goodbye' && (
        <div className="fixed inset-0 z-[99999] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-6 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="max-w-md w-full text-center py-8"
          >
            {/* Icono animado */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-500/40"
            >
              <CheckCircle size={48} className="text-white" />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <h2 className="text-3xl font-black text-white mb-2 tracking-tight">¡Hasta pronto!</h2>
              <p className="text-indigo-200 text-lg font-medium mb-1">Tu consulta ha finalizado.</p>
              {appointmentData?.doctorName && (
                <p className="text-slate-400 text-sm mb-6">
                  Gracias por consultar con <span className="text-indigo-300 font-semibold">{appointmentData.doctorName}</span>
                </p>
              )}
            </motion.div>

            {/* Recuadro de recomendaciones */}
            <motion.div
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 text-left space-y-3"
            >
              <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Heart size={12} className="text-rose-400" /> Recordá
              </p>
              {[
                'Seguí las indicaciones y la medicación recetada por tu médico.',
                'Si tenés dudas sobre tu tratamiento, podés contactar al consultorio.',
                'En caso de urgencia, acercate al centro de salud más cercano.',
              ].map((tip, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                  <p className="text-slate-300 text-sm leading-relaxed">{tip}</p>
                </div>
              ))}
            </motion.div>

            {/* Sección de reseña */}
            <motion.div
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6"
            >
              {reviewSubmitted ? (
                <div className="text-center py-2 animate-fade-in-quick">
                  {reviewRating === 5 && publicConfig?.googleMapsUrl ? (
                    <>
                      <div className="text-4xl mb-3">🤩</div>
                      <p className="text-emerald-400 font-bold text-sm mb-2">¡Nos alegra muchísimo!</p>
                      <p className="text-slate-400 text-xs mt-1 mb-4">Si tuviste una excelente experiencia, nos ayudarías un montón copiando tu reseña en Google Maps para que más personas nos conozcan.</p>
                      <a
                        href={publicConfig.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center gap-2 py-2.5 px-4 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl transition-all text-xs"
                      >
                        <Globe size={14} />
                        Publicar en Google Maps
                      </a>
                    </>
                  ) : (
                    <>
                      <div className="text-3xl mb-2">🌟</div>
                      <p className="text-emerald-400 font-bold text-sm">¡Gracias por tu opinión!</p>
                      <p className="text-slate-400 text-xs mt-1">Tu reseña fue enviada y será revisada por el equipo.</p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-slate-300 text-sm font-semibold mb-4">¿Cómo fue tu experiencia con {appointmentData?.doctorName || 'el médico'}?</p>
                  
                  {/* Estrellas interactivas */}
                  <div className="flex justify-center gap-2 mb-4">
                    {[1,2,3,4,5].map(star => (
                      <button
                        key={star}
                        onMouseEnter={() => setReviewHover(star)}
                        onMouseLeave={() => setReviewHover(0)}
                        onClick={() => setReviewRating(star)}
                        className="transition-transform hover:scale-125 focus:outline-none"
                        title={`${star} estrella${star > 1 ? 's' : ''}`}
                      >
                        <Star
                          size={32}
                          className={`transition-colors duration-150 ${
                            star <= (reviewHover || reviewRating)
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  {/* Etiqueta según puntaje */}
                  {(reviewHover || reviewRating) > 0 && (
                    <p className="text-xs text-slate-400 mb-3">
                      {{ 1: '😟 Muy mala', 2: '🙁 Regular', 3: '😐 Aceptable', 4: '😊 Buena', 5: '🤩 ¡Excelente!' }[reviewHover || reviewRating]}
                    </p>
                  )}

                  {/* Comentario opcional */}
                  <AnimatePresence>
                    {reviewRating > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <textarea
                          value={reviewComment}
                          onChange={e => setReviewComment(e.target.value)}
                          placeholder="Contanos más sobre tu experiencia (opcional)..."
                          maxLength={500}
                          rows={3}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-slate-300 text-sm placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-400/50 mb-3"
                        />
                        <button
                          onClick={handleSubmitReview}
                          disabled={reviewLoading}
                          className="w-full py-2.5 px-4 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-bold rounded-xl transition-all duration-200 text-sm flex items-center justify-center gap-2"
                        >
                          {reviewLoading ? <>⏳ Enviando...</> : <>✨ Enviar reseña</>}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
              onClick={() => { setRoomState('login'); setAppointmentData(null); }}
              className="w-full py-3 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold rounded-xl transition-all duration-200"
            >
              Volver al inicio
            </motion.button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
