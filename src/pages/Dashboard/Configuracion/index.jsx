import { useState, useEffect } from 'react';
import { Settings, Clock, Building2, Shield, Bell, Save, Check, ChevronRight, FileDigit, Landmark, Globe, AlertTriangle, RefreshCw, Upload, FileCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useStore } from '../../../stores/useStore';
import { afipService } from '../../../services/afip';

const DEFAULT_CONFIG = {
  businessName: 'Integrar Salud',
  address: '',
  phone: '',
  email: '',
  defaultDuration: 1,
  defaultPaymentMethod: 'Efectivo',
  currency: 'ARS',
  timezone: 'America/Argentina/Buenos_Aires',
  sessionTimeout: 60,
  requirePasswordChangeDays: 90,
  whatsappEnabled: true,
  emailEnabled: false,
  appointmentReminders: true,
  hours: {
    1: { enabled: true,  start: '09:00', end: '18:00' },
    2: { enabled: true,  start: '09:00', end: '18:00' },
    3: { enabled: true,  start: '09:00', end: '18:00' },
    4: { enabled: true,  start: '09:00', end: '18:00' },
    5: { enabled: true,  start: '09:00', end: '18:00' },
    6: { enabled: false, start: '09:00', end: '13:00' },
    0: { enabled: false, start: '09:00', end: '13:00' },
  },
};

const DAY_NAMES = {
  1: 'Lunes', 2: 'Martes', 3: 'Miércoles',
  4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 0: 'Domingo',
};

const SECTIONS = [
  { id: 'negocio',       label: 'Información del Consultorio', icon: Building2 },
  { id: 'horarios',      label: 'Horario de Atención',         icon: Clock      },
  { id: 'preferencias',  label: 'Preferencias del Sistema',    icon: Settings   },
  { id: 'notificaciones',label: 'Notificaciones',              icon: Bell       },
  { id: 'seguridad',     label: 'Seguridad',                   icon: Shield     },
  { id: 'afip',          label: 'Facturación AFIP',            icon: Landmark   },
];

export default function ConfiguracionPage() {
  const store = useStore();
  const [config, setConfig]         = useState(store.globalConfig || DEFAULT_CONFIG);
  const [activeSection, setSection] = useState('negocio');
  const [saved, setSaved]           = useState(false);

  const [afipConfig, setAfipConfig] = useState(null);
  const [afipStatus, setAfipStatus] = useState(null);
  const [isTestingAfip, setIsTestingAfip] = useState(false);

  useEffect(() => {
    if (store.globalConfig) {
      setConfig(prev => ({ ...prev, ...store.globalConfig }));
    }
    
    // Cargar config de AFIP desde el backend
    loadAfipConfig();
  }, [store.globalConfig]);

  const loadAfipConfig = async () => {
    try {
      const data = await afipService.getConfig();
      setAfipConfig(data || {});
    } catch (err) {
      console.error("Error loading AFIP config:", err);
      setAfipConfig({}); // Stop loading even if it fails
    }
  };

  const handleSaveAfip = async () => {
    try {
      await afipService.updateConfig(afipConfig);
      toast.success('Configuración AFIP sincronizada');
    } catch (err) {
      toast.error('Error al guardar config AFip');
    }
  };

  const handleUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const loadingToast = toast.loading(`Subiendo ${type}...`);
    try {
      await afipService.uploadFile(file, type);
      toast.success(`${type.toUpperCase()} actualizado correctamente`, { id: loadingToast });
      loadAfipConfig();
    } catch (err) {
      toast.error(`Fallo en la subida de ${type}`, { id: loadingToast });
    }
  };

  const testAfip = async () => {
    setIsTestingAfip(true);
    try {
      const status = await afipService.checkStatus();
      setAfipStatus(status);
      toast.success('Conexión con AFIP exitosa');
    } catch (err) {
      setAfipStatus({ error: true });
      toast.error('Error de conexión con AFIP');
    } finally {
      setIsTestingAfip(false);
    }
  };

  const handleSave = () => {
    store.setGlobalConfig(config);
    toast.success('Configuración guardada correctamente.');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const update    = (k, v)            => setConfig(p => ({ ...p, [k]: v }));
  const updateDay = (d, k, v)         => setConfig(p => ({
    ...p, hours: { ...p.hours, [d]: { ...p.hours[d], [k]: v } }
  }));

  const fieldClass = `
    w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--text-primary)]
    outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/10 transition-all placeholder:text-[var(--text-secondary)]/30
  `;
  const labelClass = 'block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.15em] mb-2 opacity-70';

  const Toggle = ({ value, onChange, color = 'bg-[var(--accent-primary)]' }) => (
    <button
      onClick={() => onChange(!value)}
      className={`w-12 h-6.5 rounded-full transition-all relative shrink-0 border border-transparent shadow-inner ${value ? color : 'bg-[var(--border-color)]/50'}`}
      aria-checked={value}
      role="switch"
    >
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-lg transition-all transform ${value ? 'translate-x-[1.4rem]' : 'translate-x-0.5'}`} />
    </button>
  );

  return (
    <div className="space-y-8 animate-fade-in-quick">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--accent-primary)]/10 rounded-2xl flex items-center justify-center text-[var(--accent-primary)]">
              <Settings size={22} />
            </div>
            Configuración
          </h2>
          <p className="text-sm text-[var(--text-secondary)] font-medium mt-1.5 opacity-70">Ajustes centrales y preferencias del ecosistema clínico</p>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2.5 px-6 py-3 font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl transition-all active:scale-95
            ${saved ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-[var(--accent-primary)] text-white shadow-[var(--accent-primary)]/20 hover:brightness-110'}`}
        >
          {saved ? <Check size={18} /> : <Save size={18} />}
          {saved ? 'Cambios Guardados' : 'Sincronizar Ajustes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Sidebar Navigation */}
        <div className="card-premium border border-[var(--border-color)]/50 rounded-[2rem] p-3 shadow-sm backdrop-blur-xl">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all text-left group
                  ${active ? 'bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/20' : 'text-[var(--text-secondary)] opacity-60 hover:opacity-100 hover:bg-[var(--bg-main)]'}`}
              >
                <Icon size={18} className={active ? 'text-white shrink-0' : 'text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)] shrink-0 transition-colors'} />
                <span className="flex-1">{s.label}</span>
                {active && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
              </button>
            );
          })}
        </div>

        {/* Content Panel */}
        <div className="lg:col-span-3 card-premium border border-[var(--border-color)]/50 rounded-[2.5rem] p-10 shadow-lg min-h-[500px]">

          {/* ── NEGOCIO ── */}
          {activeSection === 'negocio' && (
            <div className="space-y-8 animate-fade-in-quick">
              <div className="pb-6 border-b border-[var(--border-color)]/30">
                <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Información del Consultorio</h3>
                <p className="text-sm text-[var(--text-secondary)] font-medium mt-1 opacity-60">Datos generales y fiscales para reportes y cabeceras</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Nombre Institucional</label>
                  <input type="text" value={config.businessName} onChange={e => update('businessName', e.target.value)} className={fieldClass} placeholder="Ej: Clínica Central" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Domicilio Físico</label>
                  <input type="text" value={config.address} onChange={e => update('address', e.target.value)} className={fieldClass} placeholder="Ciudad, Provincia, Dirección" />
                </div>
                <div>
                  <label className={labelClass}>Línea Telefónica</label>
                  <input type="tel" value={config.phone} onChange={e => update('phone', e.target.value)} className={fieldClass} placeholder="+54 11 0000 0000" />
                </div>
                <div>
                  <label className={labelClass}>Correo Electrónico Corporativo</label>
                  <input type="email" value={config.email} onChange={e => update('email', e.target.value)} className={fieldClass} placeholder="admin@consultorio.com" />
                </div>
              </div>
            </div>
          )}

          {/* ── HORARIOS ── */}
          {activeSection === 'horarios' && (
            <div className="space-y-8 animate-fade-in-quick">
              <div className="pb-6 border-b border-[var(--border-color)]/30">
                <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Horario de Atención</h3>
                <p className="text-sm text-[var(--text-secondary)] font-medium mt-1 opacity-60">Control global de disponibilidad para la agenda</p>
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6, 0].map(day => {
                  const h = config.hours[day] || { enabled: false, start: '09:00', end: '18:00' };
                  return (
                    <div
                      key={day}
                      className={`flex flex-wrap items-center gap-6 p-5 rounded-2xl border transition-all
                        ${h.enabled ? 'border-[var(--accent-primary)]/20 bg-[var(--accent-light)]/30' : 'border-[var(--border-color)]/30 bg-[var(--bg-main)]/50 opacity-50'}`}
                    >
                      <Toggle value={h.enabled} onChange={v => updateDay(day, 'enabled', v)} />
                      <span className={`w-28 text-[11px] font-black uppercase tracking-widest ${h.enabled ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                        {DAY_NAMES[day]}
                      </span>
                      {h.enabled ? (
                        <div className="flex items-center gap-6 ml-auto flex-wrap">
                          <label className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase opacity-60">Desde</span>
                            <input type="time" value={h.start} onChange={e => updateDay(day, 'start', e.target.value)}
                              className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs font-black text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] transition-all shadow-sm" />
                          </label>
                          <label className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase opacity-60">Hasta</span>
                            <input type="time" value={h.end} onChange={e => updateDay(day, 'end', e.target.value)}
                              className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs font-black text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] transition-all shadow-sm" />
                          </label>
                        </div>
                      ) : (
                        <span className="ml-auto text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest italic pr-4">Instalación Cerrada</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── PREFERENCIAS ── */}
          {activeSection === 'preferencias' && (
            <div className="space-y-8 animate-fade-in-quick">
              <div className="pb-6 border-b border-[var(--border-color)]/30">
                <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Preferencias del Sistema</h3>
                <p className="text-sm text-[var(--text-secondary)] font-medium mt-1 opacity-60">Parámetros lógicos y financieros predeterminados</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <label className={labelClass}>Espaciado de Turnos</label>
                  <select value={config.defaultDuration} onChange={e => update('defaultDuration', Number(e.target.value))} className={fieldClass}>
                    <option value={0.5} className="bg-[var(--bg-card)]">Intervalo de 30 minutos</option>
                    <option value={1} className="bg-[var(--bg-card)]">Bloques de 1 hora</option>
                    <option value={1.5} className="bg-[var(--bg-card)]">Bloques de 1:30 hs</option>
                    <option value={2} className="bg-[var(--bg-card)]">Bloques de 2 horas</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Caja Predeterminada</label>
                  <select value={config.defaultPaymentMethod} onChange={e => update('defaultPaymentMethod', e.target.value)} className={fieldClass}>
                    {['Efectivo', 'Transferencia', 'Tarjeta', 'Débito', 'Crédito'].map(m => <option key={m} className="bg-[var(--bg-card)]">{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Divisa Transaccional</label>
                  <select value={config.currency} onChange={e => update('currency', e.target.value)} className={fieldClass}>
                    <option value="ARS" className="bg-[var(--bg-card)]">ARS — Peso Argentino</option>
                    <option value="USD" className="bg-[var(--bg-card)]">USD — Dólar Estadounidense</option>
                    <option value="UYU" className="bg-[var(--bg-card)]">UYU — Peso Uruguayo</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Huso Horario</label>
                  <select value={config.timezone} onChange={e => update('timezone', e.target.value)} className={fieldClass}>
                    <option value="America/Argentina/Buenos_Aires" className="bg-[var(--bg-card)]">Buenos Aires (UTC-3)</option>
                    <option value="America/Montevideo" className="bg-[var(--bg-card)]">Montevideo (UTC-3)</option>
                    <option value="America/Santiago" className="bg-[var(--bg-card)]">Santiago (UTC-4)</option>
                    <option value="America/Lima" className="bg-[var(--bg-card)]">Lima (UTC-5)</option>
                    <option value="America/Bogota" className="bg-[var(--bg-card)]">Bogotá (UTC-5)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── NOTIFICACIONES ── */}
          {activeSection === 'notificaciones' && (
            <div className="space-y-8 animate-fade-in-quick">
              <div className="pb-6 border-b border-[var(--border-color)]/30">
                <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Canales de Comunicación</h3>
                <p className="text-sm text-[var(--text-secondary)] font-medium mt-1 opacity-60">Gestión de alertas y avisos automáticos</p>
              </div>
              <div className="space-y-4">
                {[
                  { key: 'whatsappEnabled',     label: 'WhatsApp API',           desc: 'Despacho de turnos y recordatorios vía WhatsApp Business', color: 'bg-emerald-500' },
                  { key: 'emailEnabled',         label: 'E-mail SMTP',            desc: 'Envío de confirmaciones y estudios por correo oficial',   color: 'bg-[var(--accent-primary)]' },
                  { key: 'appointmentReminders', label: 'Push & SMS Alerts',      desc: 'Notificación de cortesía 24 hs previas al evento clínico', color: 'bg-amber-500' },
                ].map(({ key, label, desc, color }) => (
                  <div key={key} className="flex items-center justify-between p-6 bg-[var(--bg-main)]/40 rounded-3xl border border-[var(--border-color)]/30 group hover:border-[var(--accent-primary)]/30 transition-all">
                    <div>
                      <p className="text-[13px] font-black text-[var(--text-primary)] uppercase tracking-wider">{label}</p>
                      <p className="text-[11px] text-[var(--text-secondary)] font-bold mt-1 opacity-60">{desc}</p>
                    </div>
                    <Toggle value={config[key]} onChange={v => update(key, v)} color={color} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SEGURIDAD ── */}
          {activeSection === 'seguridad' && (
            <div className="space-y-8 animate-fade-in-quick">
              <div className="pb-6 border-b border-[var(--border-color)]/30">
                <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Blindaje y Protocolos</h3>
                <p className="text-sm text-[var(--text-secondary)] font-medium mt-1 opacity-60">Gobernanza de accesos y persistencia de datos</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <label className={labelClass}>Auto-Cierre de Sesión</label>
                  <select value={config.sessionTimeout} onChange={e => update('sessionTimeout', Number(e.target.value))} className={fieldClass}>
                    <option value={30} className="bg-[var(--bg-card)]">Inactividad: 30 minutos</option>
                    <option value={60} className="bg-[var(--bg-card)]">Inactividad: 1 hora</option>
                    <option value={120} className="bg-[var(--bg-card)]">Inactividad: 2 horas</option>
                    <option value={480} className="bg-[var(--bg-card)]">Inactividad: 8 horas</option>
                    <option value={0} className="bg-[var(--bg-card)]">Mantener siempre activa</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Ciclo de Cifrado (Password)</label>
                  <select value={config.requirePasswordChangeDays} onChange={e => update('requirePasswordChangeDays', Number(e.target.value))} className={fieldClass}>
                    <option value={30} className="bg-[var(--bg-card)]">Rotar cada 30 días</option>
                    <option value={60} className="bg-[var(--bg-card)]">Rotar cada 60 días</option>
                    <option value={90} className="bg-[var(--bg-card)]">Rotar cada 90 días</option>
                    <option value={180} className="bg-[var(--bg-card)]">Rotar cada 6 meses</option>
                    <option value={0} className="bg-[var(--bg-card)]">Sin vencimiento forzado</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 p-8 bg-amber-500/5 border border-amber-500/20 rounded-[2rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-bl-full -z-0 opacity-20"></div>
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-4 relative z-10">
                  <Shield size={16} /> Compliance & Seguridad de Datos
                </p>
                <ul className="space-y-3 relative z-10">
                  {[
                    'Implementar contraseñas de alta entropía (8+ caracteres, mixtos)',
                    'Restringir el uso de cuentas maestras en dispositivos públicos',
                    'Asegurar el cierre de sesión antes de abandonar puestos de trabajo',
                    'Auditar periódicamente los registros de acceso en el log central',
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-4 text-[11px] text-[var(--text-secondary)] font-bold">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 shrink-0"></div>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* ── AFIP ── */}
          {activeSection === 'afip' && (
            <div className="space-y-8 animate-fade-in-quick">
              <div className="pb-6 border-b border-[var(--border-color)]/30 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Facturación Electrónica (AFIP)</h3>
                  <p className="text-sm text-[var(--text-secondary)] font-medium mt-1 opacity-60">Configuración legal del Web Service Facturación Electrónica (WSFE)</p>
                </div>
                {afipConfig && (
                   <button 
                    onClick={handleSaveAfip}
                    className="px-5 py-2.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all"
                   >
                     Guardar Cambios AFIP
                   </button>
                )}
              </div>

              {!afipConfig ? (
                <div className="p-20 text-center opacity-40">Cargo configuración...</div>
              ) : (
                <div className="space-y-10">
                  {/* CUIT Y PV */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                      <label className={labelClass}>CUIT del Emisor</label>
                      <input 
                        type="text" 
                        value={afipConfig.cuit || ''} 
                        onChange={e => setAfipConfig({...afipConfig, cuit: e.target.value})} 
                        className={fieldClass} 
                        placeholder="20XXXXXXXX9" 
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Punto de Venta</label>
                      <input 
                        type="number" 
                        value={afipConfig.punto_venta} 
                        onChange={e => setAfipConfig({...afipConfig, punto_venta: parseInt(e.target.value)})} 
                        className={fieldClass} 
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Condición Tributaria</label>
                      <select 
                        value={afipConfig.tax_condition} 
                        onChange={e => setAfipConfig({...afipConfig, tax_condition: e.target.value})} 
                        className={fieldClass}
                      >
                        <option value="monotributo" className="bg-[var(--bg-card)]">Responsable Monotributo</option>
                        <option value="ri" className="bg-[var(--bg-card)]">Responsable Inscripto</option>
                      </select>
                    </div>
                  </div>

                  {/* ENTORNO Y STATUS */}
                  <div className="p-8 bg-[var(--bg-main)]/40 rounded-[2.5rem] border border-[var(--border-color)]/30 flex flex-wrap items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className={`p-4 rounded-3xl ${afipConfig.environment === 'prod' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        <Globe size={28} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest">Ambiente de Operación</p>
                        <div className="flex items-center gap-3 mt-1.5">
                           <button 
                            onClick={() => setAfipConfig({...afipConfig, environment: 'test'})}
                            className={`px-3 py-1 text-[9px] font-black uppercase rounded-lg border transition-all ${afipConfig.environment === 'test' ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'text-[var(--text-secondary)] border-[var(--border-color)]'}`}
                           >Homologación</button>
                           <button 
                            onClick={() => setAfipConfig({...afipConfig, environment: 'prod'})}
                            className={`px-3 py-1 text-[9px] font-black uppercase rounded-lg border transition-all ${afipConfig.environment === 'prod' ? 'bg-rose-500 text-white border-rose-500 shadow-md' : 'text-[var(--text-secondary)] border-[var(--border-color)]'}`}
                           >Producción</button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {afipStatus && (
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${afipStatus.error ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {afipStatus.error ? <AlertTriangle size={14}/> : <FileCheck size={14}/>}
                          {afipStatus.error ? 'Error AFIP' : 'Servidor Online'}
                        </div>
                      )}
                      <button 
                        onClick={testAfip}
                        disabled={isTestingAfip}
                        className="flex items-center gap-2 px-6 py-3 bg-[var(--bg-sidebar)] text-[var(--accent-primary)] text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-[var(--accent-light)] transition-all border border-[var(--border-color)]/30 disabled:opacity-50"
                      >
                         {isTestingAfip ? <RefreshCw className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                         Verificar Conexión
                      </button>
                    </div>
                  </div>

                  {/* CERTIFICADOS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="p-8 glass-effect rounded-[2.5rem] border border-[var(--border-color)]/30 relative group overflow-hidden">
                       <div className="flex items-center justify-between mb-6">
                         <div className="flex items-center gap-3">
                           <FileDigit size={24} className="text-indigo-500" />
                           <p className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest">Certificado (.CRT)</p>
                         </div>
                         {afipConfig.has_cert && (
                           <div className="bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                              <Check size={12}/> Cargado
                           </div>
                         )}
                       </div>
                       <p className="text-[11px] text-[var(--text-secondary)] font-medium mb-6 opacity-60 leading-relaxed">
                         El certificado de seguridad pública emitido por AFIP para autorizar este CUIT.
                       </p>
                       <label className="block w-full text-center py-4 bg-[var(--bg-main)] hover:bg-[var(--accent-light)] border-2 border-dashed border-[var(--border-color)] rounded-2xl cursor-pointer transition-all text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]/50">
                         <Upload size={16} className="mx-auto mb-2 opacity-30" />
                         {afipConfig.has_cert ? 'Actualizar Certificado' : 'Subir Archivo .crt'}
                         <input type="file" className="hidden" accept=".crt,.pem" onChange={e => handleUpload(e, 'cert')} />
                       </label>
                    </div>

                    <div className="p-8 glass-effect rounded-[2.5rem] border border-[var(--border-color)]/30 relative group overflow-hidden">
                       <div className="flex items-center justify-between mb-6">
                         <div className="flex items-center gap-3">
                           <Shield size={24} className="text-amber-500" />
                           <p className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest">Key Privada (.KEY)</p>
                         </div>
                         {afipConfig.has_key && (
                           <div className="bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                              <Check size={12}/> Cargado
                           </div>
                         )}
                       </div>
                       <p className="text-[11px] text-[var(--text-secondary)] font-medium mb-6 opacity-60 leading-relaxed">
                         La llave privada generada junto con el CSR. Este archivo nunca sale de este servidor.
                       </p>
                       <label className="block w-full text-center py-4 bg-[var(--bg-main)] hover:bg-[var(--accent-light)] border-2 border-dashed border-[var(--border-color)] rounded-2xl cursor-pointer transition-all text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]/50">
                         <Upload size={16} className="mx-auto mb-2 opacity-30" />
                         {afipConfig.has_key ? 'Actualizar Llave Key' : 'Subir Archivo .key'}
                         <input type="file" className="hidden" accept=".key,.pem" onChange={e => handleUpload(e, 'key')} />
                       </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
