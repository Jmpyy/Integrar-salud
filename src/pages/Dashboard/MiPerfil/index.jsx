import { useState } from 'react';
import { useStore } from '../../../stores/useStore';
import { authService } from '../../../services/auth';
import { toast } from 'react-hot-toast';
import {
  User, Lock, Shield, Eye, EyeOff,
  CheckCircle2, AlertCircle, Save, KeyRound, Mail, BadgeCheck
} from 'lucide-react';

const ROLE_META = {
  admin:     { label: 'Administrador',      color: 'bg-rose-500',    text: 'text-rose-500',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20' },
  medico:    { label: 'Médico / Terapeuta', color: 'bg-[var(--accent-primary)]',  text: 'text-[var(--accent-primary)]',  bg: 'bg-[var(--accent-light)]',  border: 'border-[var(--accent-primary)]/20' },
  recepcion: { label: 'Recepcionista',      color: 'bg-emerald-500', text: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
};

const SECTIONS = [
  { id: 'perfil',      label: 'Mi Perfil',          icon: User    },
  { id: 'contrasena',  label: 'Cambiar Contraseña',  icon: Lock    },
  { id: 'seguridad',   label: 'Seguridad',           icon: Shield  },
];

export default function MiPerfilPage() {
  const { user, userRole, setUser } = useStore();
  const role = ROLE_META[userRole] || ROLE_META.recepcion;

  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const [activeSection, setSection] = useState('perfil');

  // ── Profile form ──
  const [profileName,  setProfileName]  = useState(user?.name  || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const handleSaveProfile = async () => {
    if (!profileName.trim()) return toast.error('El nombre no puede estar vacío.');
    setSavingProfile(true);
    try {
      await authService.updateProfile(user.id, { name: profileName.trim() });
      if (setUser) setUser({ ...user, name: profileName.trim() });
      toast.success('Perfil actualizado correctamente.');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'No se pudo actualizar el perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Password form ──
  const [currentPwd,  setCurrentPwd]  = useState('');
  const [newPwd,      setNewPwd]      = useState('');
  const [confirmPwd,  setConfirmPwd]  = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPwd,   setSavingPwd]   = useState(false);
  const [pwdSuccess,  setPwdSuccess]  = useState(false);

  // Password strength
  const strength = (() => {
    if (!newPwd) return { score: 0, label: '', color: '' };
    let s = 0;
    if (newPwd.length >= 8)               s++;
    if (/[A-Z]/.test(newPwd))            s++;
    if (/[0-9]/.test(newPwd))            s++;
    if (/[^A-Za-z0-9]/.test(newPwd))     s++;
    const map = [
      { score: 0, label: '',         color: '' },
      { score: 1, label: 'Débil',    color: 'bg-rose-400' },
      { score: 2, label: 'Regular',  color: 'bg-amber-400' },
      { score: 3, label: 'Buena',    color: 'bg-indigo-500' },
      { score: 4, label: 'Fuerte',   color: 'bg-emerald-500' },
    ];
    return map[s];
  })();

  const pwdMatch = newPwd && confirmPwd && newPwd === confirmPwd;
  const pwdMismatch = confirmPwd && newPwd !== confirmPwd;

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPwd || !newPwd || !confirmPwd) return toast.error('Completá todos los campos.');
    if (newPwd !== confirmPwd)                  return toast.error('Las contraseñas nuevas no coinciden.');
    if (newPwd.length < 6)                      return toast.error('La nueva contraseña debe tener al menos 6 caracteres.');

    setSavingPwd(true);
    try {
      await authService.changePassword(currentPwd, newPwd);
      setPwdSuccess(true);
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      toast.success('¡Contraseña actualizada! Podés seguir usando la app.');
      setTimeout(() => setPwdSuccess(false), 4000);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error al cambiar la contraseña.');
    } finally {
      setSavingPwd(false);
    }
  };

  // ── UI helpers ──
  const inputClass = `
    w-full border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)]
    outline-none focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-light)] bg-[var(--bg-main)] transition-all
    placeholder:text-[var(--text-secondary)]/30
  `;
  const labelClass = 'block text-[11px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-wider mb-1.5';

  const PasswordField = ({ label, value, onChange, show, onToggle, placeholder = '••••••••' }) => (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`${inputClass} pr-11`}
          placeholder={placeholder}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in-quick">
      <div className="glass-effect rounded-3xl p-6 shadow-[var(--glass-shadow)] border border-[var(--glass-border)] flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className={`w-20 h-20 rounded-3xl ${role.color} flex items-center justify-center text-white font-black text-3xl shadow-lg shrink-0`}>
          {initials}
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-2xl font-black text-[var(--text-primary)]">{user?.name || 'Mi cuenta'}</h2>
          <p className="text-sm text-[var(--text-secondary)] font-medium mt-0.5 flex items-center justify-center sm:justify-start gap-1.5">
            <Mail size={13} className="opacity-50" />
            {user?.email || '—'}
          </p>
          <div className="mt-2 flex items-center justify-center sm:justify-start gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border ${role.text} ${role.bg} ${role.border}`}>
              <BadgeCheck size={12} />
              {role.label}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className="card-premium rounded-3xl p-2 border border-[var(--glass-border)]">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left
                  ${active 
                    ? 'bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/20' 
                    : 'text-[var(--text-secondary)] hover:bg-[var(--accent-light)] hover:text-[var(--text-primary)]'}`}
              >
                <Icon size={16} className={active ? 'text-white shrink-0' : 'opacity-50 shrink-0'} />
                {s.label}
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-3 card-premium rounded-3xl p-6 border border-[var(--glass-border)] min-h-[400px]">

          {activeSection === 'perfil' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-[var(--border-color)]/30">
                <h3 className="text-lg font-black text-[var(--text-primary)]">Información Personal</h3>
                <p className="text-sm text-[var(--text-secondary)] font-medium mt-0.5 opacity-70">Datos visibles en el sistema</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Nombre completo</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    className={inputClass}
                    placeholder="Tu nombre y apellido"
                  />
                </div>
                <div>
                  <label className={labelClass}>Correo electrónico</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-30" />
                    <input
                      type="email"
                      value={profileEmail}
                      disabled
                      className={`${inputClass} pl-10 opacity-50 cursor-not-allowed bg-[var(--bg-sidebar)]/50`}
                    />
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] font-medium mt-2 flex items-center gap-1.5 opacity-60">
                    <AlertCircle size={12} />
                    El email es tu identificador de acceso y no puede modificarse
                  </p>
                </div>
                <div>
                  <label className={labelClass}>Rol en el sistema</label>
                  <div className={`px-4 py-3 rounded-xl border text-sm font-bold ${role.bg} ${role.border} ${role.text}`}>
                    {role.label}
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] font-medium mt-2 flex items-center gap-1.5 opacity-60">
                    <AlertCircle size={12} />
                    El rol solo puede cambiarlo el administrador del sistema
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile || !profileName.trim()}
                  className="flex items-center gap-2 px-6 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-black text-sm rounded-2xl shadow-lg shadow-[var(--accent-primary)]/20 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  <Save size={16} />
                  {savingProfile ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          )}

          {activeSection === 'contrasena' && (
            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="pb-4 border-b border-[var(--border-color)]/30">
                <h3 className="text-lg font-black text-[var(--text-primary)]">Cambiar Contraseña</h3>
                <p className="text-sm text-[var(--text-secondary)] font-medium mt-0.5 opacity-70">Tu contraseña actual es necesaria para confirmar el cambio</p>
              </div>

              {pwdSuccess && (
                <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                  <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-sm font-black text-emerald-500">¡Contraseña actualizada con éxito!</p>
                    <p className="text-xs text-emerald-500/70 font-medium mt-0.5">Podés seguir usando el sistema normalmente.</p>
                  </div>
                </div>
              )}

              <PasswordField
                label="Contraseña actual"
                value={currentPwd}
                onChange={setCurrentPwd}
                show={showCurrent}
                onToggle={() => setShowCurrent(p => !p)}
                placeholder="Tu contraseña actual"
              />

              <div className="pt-2 border-t border-[var(--border-color)]/20" />

              <PasswordField
                label="Nueva contraseña"
                value={newPwd}
                onChange={setNewPwd}
                show={showNew}
                onToggle={() => setShowNew(p => !p)}
              />

              {newPwd && (
                <div className="space-y-2 -mt-2">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          i <= strength.score ? strength.color : 'bg-[var(--bg-main)] border border-[var(--border-color)]/30'
                        }`}
                      />
                    ))}
                  </div>
                  {strength.label && (
                    <p className={`text-xs font-bold ${
                      strength.score <= 1 ? 'text-rose-500' :
                      strength.score === 2 ? 'text-amber-500' :
                      strength.score === 3 ? 'text-indigo-500' : 'text-emerald-500'
                    }`}>
                      Seguridad: {strength.label}
                    </p>
                  )}
                  <ul className="text-[11px] text-[var(--text-secondary)] font-medium space-y-1 mt-2">
                    {[
                      { ok: newPwd.length >= 8,               msg: 'Al menos 8 caracteres' },
                      { ok: /[A-Z]/.test(newPwd),             msg: 'Una letra mayúscula' },
                      { ok: /[0-9]/.test(newPwd),             msg: 'Un número' },
                      { ok: /[^A-Za-z0-9]/.test(newPwd),      msg: 'Un símbolo (!@#$...)' },
                    ].map((rule, i) => (
                      <li key={i} className={`flex items-center gap-2 ${rule.ok ? 'text-emerald-500' : 'opacity-40'}`}>
                        <CheckCircle2 size={12} className={rule.ok ? 'text-emerald-500' : 'text-[var(--text-secondary)]'} />
                        {rule.msg}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <PasswordField
                label="Confirmar nueva contraseña"
                value={confirmPwd}
                onChange={setConfirmPwd}
                show={showConfirm}
                onToggle={() => setShowConfirm(p => !p)}
              />

              {confirmPwd && (
                <p className={`text-xs font-bold flex items-center gap-1.5 -mt-2 ${pwdMatch ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {pwdMatch
                    ? <><CheckCircle2 size={13} /> Las contraseñas coinciden</>
                    : <><AlertCircle size={13} /> Las contraseñas no coinciden</>
                  }
                </p>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPwd || !currentPwd || !newPwd || !confirmPwd || pwdMismatch}
                  className="flex items-center gap-2 px-6 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-black text-sm rounded-2xl shadow-lg shadow-[var(--accent-primary)]/20 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  <KeyRound size={16} />
                  {savingPwd ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
              </div>
            </form>
          )}

          {activeSection === 'seguridad' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-[var(--border-color)]/30">
                <h3 className="text-lg font-black text-[var(--text-primary)]">Seguridad de la cuenta</h3>
                <p className="text-sm text-[var(--text-secondary)] font-medium mt-0.5 opacity-70">Estado de seguridad de tu cuenta</p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    icon: Lock,
                    label: 'Contraseña',
                    value: 'Configurada',
                    status: 'ok',
                    desc: 'Tu contraseña está establecida y protege tu cuenta.',
                  },
                  {
                    icon: Shield,
                    label: 'Estado de la cuenta',
                    value: 'Activa',
                    status: 'ok',
                    desc: 'Tu cuenta tiene acceso activo al sistema.',
                  },
                  {
                    icon: BadgeCheck,
                    label: 'Rol asignado',
                    value: role.label,
                    status: 'ok',
                    desc: 'Tu nivel de acceso está configurado por el administrador.',
                  },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-start gap-4 p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)]/30 hover:bg-[var(--accent-light)] transition-colors group">
                      <div className="w-10 h-10 bg-[var(--bg-card)] rounded-xl flex items-center justify-center border border-[var(--border-color)]/50 shadow-sm shrink-0">
                        <Icon size={18} className="text-[var(--accent-primary)]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-black text-[var(--text-primary)]">{item.label}</p>
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <CheckCircle2 size={11} />
                            {item.value}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] font-medium mt-1 opacity-70">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 bg-[var(--accent-light)] border border-[var(--accent-primary)]/20 rounded-2xl">
                <p className="text-xs font-black text-[var(--accent-primary)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Shield size={13} /> Recomendaciones
                </p>
                <ul className="space-y-2 text-xs text-[var(--text-primary)] font-medium opacity-80">
                  {[
                    'Usa una contraseña única para este sistema.',
                    'Evitá contraseñas simples como tu nombre o fecha de nacimiento.',
                    'Cerrá tu sesión al terminar en dispositivos compartidos.',
                    'Si sospechás acceso no autorizado, cambiá tu contraseña de inmediato.',
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-[var(--accent-primary)]" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
