import { useState } from 'react';
import { useStore } from '../../stores/useStore';
import { Key, Lock, ShieldCheck, RefreshCw, X } from 'lucide-react';
import api from '../../services/api';

export default function ForcePasswordChange() {
  const { user, isAuthenticated, auth } = useStore();
  const [show, setShow] = useState(isAuthenticated && user?.must_change_password);
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!show || !isAuthenticated || !user?.must_change_password) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (form.new_password !== form.confirm_password) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (form.new_password.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        current_password: form.current_password,
        new_password: form.new_password
      });
      
      setIsSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-xl animate-fade-in">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl relative overflow-hidden border border-slate-100">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-500 via-amber-400 to-indigo-600"></div>
        
        <div className="p-8">
          {isSuccess ? (
            <div className="text-center animate-in fade-in zoom-in duration-500">
              <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500 shadow-inner ring-8 ring-emerald-50/50">
                 <ShieldCheck size={48} className="animate-bounce" />
              </div>

              <h3 className="text-2xl font-black text-slate-800 mb-2">¡Listo!</h3>
              <p className="text-sm font-medium text-slate-500 mb-8 px-4 leading-relaxed">
                Tu contraseña fue actualizada con éxito. Por seguridad, debés ingresar nuevamente con tu nueva clave.
              </p>

              <button 
                onClick={() => {
                  auth.logout();
                  setShow(false);
                }}
                className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-2xl transition-all shadow-xl hover:shadow-2xl active:scale-95 flex items-center justify-center gap-2"
              >
                Volver al Login
              </button>
            </div>
          ) : (
            <>
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500 shadow-inner ring-8 ring-amber-50/50">
                 <Key size={40} className="animate-pulse" />
              </div>

              <h3 className="text-2xl font-black text-slate-800 text-center mb-2">Seguridad Requerida</h3>
              <p className="text-sm font-medium text-slate-500 text-center mb-8 px-4 leading-relaxed">
                Por seguridad, debes cambiar tu contraseña temporal <strong>(password)</strong> para poder continuar usando el sistema.
              </p>

              {error && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold animate-shake">
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña Actual</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input 
                      type="password" required
                      value={form.current_password}
                      onChange={e => setForm({...form, current_password: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all"
                      placeholder="La contraseña que usaste recién"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 focus-within:translate-x-1 transition-transform delay-75">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nueva Contraseña</label>
                  <div className="relative">
                    <ShieldCheck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input 
                      type="password" required
                      value={form.new_password}
                      onChange={e => setForm({...form, new_password: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all"
                      placeholder="Elegí algo seguro"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 focus-within:translate-x-1 transition-transform delay-100">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Nueva Contraseña</label>
                  <div className="relative">
                    <RefreshCw size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input 
                      type="password" required
                      value={form.confirm_password}
                      onChange={e => setForm({...form, confirm_password: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all"
                      placeholder="Repetí la nueva contraseña"
                    />
                  </div>
                </div>

                <button 
                  disabled={loading}
                  className="w-full bg-slate-900 ring-offset-4 hover:bg-black text-white font-black py-4 rounded-2xl mt-4 transition-all shadow-xl hover:shadow-2xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw size={18} className="animate-spin" /> : 'Actualizar y Reingresar'}
                </button>
              </form>
            </>
          )}
          
          <button 
            onClick={() => auth.logout()}
            className="w-full mt-4 text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-tighter"
          >
            Cerrar Sesión y salir
          </button>
        </div>
      </div>
    </div>
  );
}
