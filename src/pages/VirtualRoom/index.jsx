import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Video, ShieldCheck, Loader2, ArrowRight, UserCircle, LogOut, CalendarClock, Clock, AlertCircle, Lightbulb, Mic, Wifi, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

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

export default function VirtualRoomPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [dni, setDni] = useState(searchParams.get('dni') || '');
  const [codigo, setCodigo] = useState(searchParams.get('codigo') || '');
  
  const [loading, setLoading] = useState(false);
  // roomState: 'login' | 'waiting' | 'early' | 'past'
  const [roomState, setRoomState] = useState('login');
  const [paymentError, setPaymentError] = useState(null);
  const [appointmentData, setAppointmentData] = useState(null);
  const [earlyData, setEarlyData] = useState(null); // { appointmentDate, appointmentTime, doctorName, message }
  const [delayMessage, setDelayMessage] = useState(null);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

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

  // Polling cuando estemos en sala de espera o en llamada (para detectar si el médico finaliza)
  useEffect(() => {
    let interval;
    if ((roomState === 'waiting' || roomState === 'active_call') && appointmentData?.appointmentId) {
      interval = setInterval(async () => {
        try {
          const API = 'https://control.integrarsalud.me/api-integrar/api';
          const res = await fetch(`${API}/telemedicine/check_status?id=${appointmentData.appointmentId}&codigo=${codigo}&_t=${Date.now()}`, { cache: 'no-store' });
          
          if (res.ok) {
            const data = await res.json();
            
            if (!data.error) {
              setDelayMessage(data.delayMessage || null);
              if (data.status === 'activa' && roomState !== 'active_call') {
                toast.success('¡El médico ha iniciado la consulta!');
                setRoomState('active_call');
              } else if (data.status === 'finalizada' || data.status === 'ausente' || data.status === 'finalizado') {
                clearInterval(interval);
                toast.error('La consulta ha finalizado.');
                setRoomState('login');
                setAppointmentData(null);
              }
            }
          }
        } catch (err) {
          console.error("Error polling:", err);
        }
      }, 5000);
    }

      // Listener para cuando el paciente cierra la pestaña o el navegador
      const handleUnload = (e) => {
        if (e && e.type === 'visibilitychange' && document.visibilityState !== 'hidden') return;
        if (appointmentData?.appointmentId) {
          const leaveUrl = `https://control.integrarsalud.me/api-integrar/api/telemedicine/leave_room?id=${appointmentData.appointmentId}`;
          navigator.sendBeacon(leaveUrl);
        }
      };
      
      window.addEventListener('beforeunload', handleUnload);
      window.addEventListener('pagehide', handleUnload);
      document.addEventListener('visibilitychange', handleUnload);

      return () => {
        clearInterval(interval);
        window.removeEventListener('beforeunload', handleUnload);
        window.removeEventListener('pagehide', handleUnload);
        document.removeEventListener('visibilitychange', handleUnload);
      };
  }, [roomState, appointmentData]);

  const handleLeaveRoom = async () => {
    if (appointmentData?.appointmentId) {
      try {
        await fetch(`https://control.integrarsalud.me/api-integrar/api/telemedicine/leave_room?id=${appointmentData.appointmentId}`, { method: 'GET' });
      } catch (err) {
        console.error('Error leaving room', err);
      }
    }
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
      const API = 'https://control.integrarsalud.me/api-integrar/api';
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
      setRoomState('waiting');
      toast.success('Acceso correcto. Estás en la sala de espera.');
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
              roomName={`integrarsalud-${appointmentData?.appointmentId}-${codigo}`}
              displayName={appointmentData?.patientName || "Paciente"}
              onReadyToClose={handleLeaveRoom}
            />
          </div>
        </div>
      )}
    </div>
  );
}
