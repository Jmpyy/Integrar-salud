import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Sparkles, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage({ onLogin, isLoading = false }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    let newErrors = { email: '', password: '' };
    let hasError = false;

    // 1. Validaciones de campos vacíos
    if (!email.trim()) {
      newErrors.email = 'El correo es obligatorio.';
      hasError = true;
    }
    if (!password) {
      newErrors.password = 'La contraseña es obligatoria.';
      hasError = true;
    }

    setErrors(newErrors);

    // 2. Manejo de Focus si hay error
    if (hasError) {
      if (newErrors.email) emailRef.current?.focus();
      else if (newErrors.password) passwordRef.current?.focus();
      return;
    }

    try {
      // 3. Llamar al backend vía store
      if (onLogin) {
        await onLogin(email, password);
      }

      toast.success('¡Bienvenido!');
      setIsTransitioning(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (error) {
      const message = error.response?.data?.message || 'Credenciales no válidas';
      setErrors({
        email: message,
        password: 'Revisá tus datos'
      });
      toast.error(message);
    }
  };

  return (
    <div className={`min-h-screen flex selection:bg-indigo-100 bg-white ${isTransitioning ? 'animate-fade-out pointer-events-none' : ''}`}>

      {/* LADO IZQUIERDO: Imagen / Branding (Oculto en móviles) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-50 items-center justify-center">
        {/* Fondo decorativo animado */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-emerald-50"></div>
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Contenido flotante */}
        <div className="relative z-10 w-full max-w-lg p-12 glass-panel rounded-3xl backdrop-blur-sm bg-white/30 border border-white/40 shadow-2xl mx-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 text-indigo-700 font-medium text-sm mb-6 shadow-sm backdrop-blur-md">
            <Sparkles size={16} />
            <span>Portal de Gestión Profesional</span>
          </div>
          <h2 className="text-4xl font-bold text-slate-900 mb-6 leading-tight">
            Priorizando el bienestar, simplificando la <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-600">atención</span>.
          </h2>
          <p className="text-slate-600 text-lg leading-relaxed">
            Bienvenido al panel central de Integrar Salud. Acceda para gestionar agendas y brindar una mejor experiencia a nuestros pacientes.
          </p>
        </div>
      </div>

      {/* LADO DERECHO: Formulario de Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-6 sm:p-12">
        <div className="w-full max-w-md animate-fade-in-up">

          {/* Logo móvil */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <span className="text-white font-bold text-2xl">I</span>
            </div>
          </div>

          {/* Encabezado */}
          <div className="mb-10 lg:mb-12">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
              Ingreso al Sistema
            </h1>
            <p className="text-slate-500 font-medium">Gestión de Consultorio Interdisciplinario</p>
          </div>

          {/* Formulario */}
          <form className="space-y-6" onSubmit={handleSubmit} noValidate>

            {/* Campo Email */}
            <div className="group relative">
              <label className="block text-sm font-semibold text-slate-700 mb-2 transition-colors group-focus-within:text-indigo-600">
                Email Profesional <span className="text-indigo-500 ml-1" title="Campo requerido">*</span>
              </label>

              <div className="relative">
                <span className={`absolute inset-y-0 left-0 pl-4 flex items-center transition-colors ${errors.email ? 'text-red-500' : 'text-slate-400 group-focus-within:text-indigo-500'}`}>
                  <Mail size={20} />
                </span>
                <input
                  type="email"
                  ref={emailRef}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                  placeholder="usuario@email.com"
                  autoComplete="username"
                  className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 border rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 transition-all duration-300 shadow-sm
                    ${errors.email
                      ? 'border-red-300 focus:ring-red-100 focus:border-red-500'
                      : 'border-slate-200 focus:ring-indigo-100 focus:border-indigo-400'
                    }`}
                  required
                />
              </div>

              {/* Mensaje de Error */}
              {errors.email && (
                <div className="absolute z-20 mt-2 left-0 bg-white border border-slate-200 shadow-xl rounded-lg p-3 flex items-start gap-3 w-64 animate-fade-in-up">
                  <div className="absolute -top-2 left-6 w-4 h-4 bg-white border-t border-l border-slate-200 transform rotate-45"></div>
                  <div className="bg-amber-500 text-white p-1 rounded-sm mt-0.5">
                    <AlertCircle size={16} strokeWidth={3} />
                  </div>
                  <p className="text-slate-800 font-medium text-sm leading-tight pt-0.5 relative z-10">
                    {errors.email}
                  </p>
                </div>
              )}
            </div>

            {/* Campo Contraseña */}
            <div className="group relative mt-12">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-slate-700 transition-colors group-focus-within:text-indigo-600">
                  Contraseña <span className="text-indigo-500 ml-1" title="Campo requerido">*</span>
                </label>
              </div>

              <div className="relative">
                <span className={`absolute inset-y-0 left-0 pl-4 flex items-center transition-colors ${errors.password ? 'text-red-500' : 'text-slate-400 group-focus-within:text-indigo-500'}`}>
                  <Lock size={20} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  ref={passwordRef}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: '' });
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`w-full pl-12 pr-12 py-3.5 bg-slate-50 border rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 transition-all duration-300 shadow-sm
                    ${errors.password
                      ? 'border-red-300 focus:ring-red-100 focus:border-red-500'
                      : 'border-slate-200 focus:ring-indigo-100 focus:border-indigo-400'
                    }`}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {/* Mensaje de Error */}
              {errors.password && (
                <div className="absolute z-20 mt-2 left-0 bg-white border border-slate-200 shadow-xl rounded-lg p-3 flex items-start gap-3 w-64 animate-fade-in-up">
                  <div className="absolute -top-2 left-6 w-4 h-4 bg-white border-t border-l border-slate-200 transform rotate-45"></div>
                  <div className="bg-amber-500 text-white p-1 rounded-sm mt-0.5">
                    <AlertCircle size={16} strokeWidth={3} />
                  </div>
                  <p className="text-slate-800 font-medium text-sm leading-tight pt-0.5 relative z-10">
                    {errors.password}
                  </p>
                </div>
              )}
            </div>

            {/* Checkbox Recordarme */}
            <div className="flex items-center pt-6">
              <input
                id="remember-me"
                type="checkbox"
                className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 focus:ring-2 cursor-pointer"
              />
              <label htmlFor="remember-me" className="ml-2 text-sm font-medium text-slate-600 cursor-pointer">
                Mantener sesión iniciada
              </label>
            </div>

            {/* Botón de Ingreso */}
            <button
              type="submit"
              disabled={isLoading || isTransitioning}
              className={`relative overflow-hidden w-full mt-8 text-white font-bold py-4 px-4 rounded-2xl shadow-xl transition-all duration-300 group flex items-center justify-center gap-3 transform
                ${(isLoading || isTransitioning) ? 'bg-slate-400 cursor-not-allowed shadow-none' : 'bg-slate-900 hover:bg-indigo-900 hover:shadow-2xl hover:shadow-indigo-200 hover:-translate-y-1 animate-float'}`}
            >
              {!(isLoading || isTransitioning) && <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shine_1.5s_ease-in-out]"></div>}

              <span className="relative z-10 flex items-center gap-2">
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Cargando...
                  </>
                ) : isTransitioning ? (
                  <>
                    Accediendo...
                  </>
                ) : (
                  <>
                    Entrar al Sistema
                    <ArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform duration-300" />
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Link para volver */}
          <div className="mt-10 text-center">
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors">
              <ArrowRight size={16} className="rotate-180" />
              Volver a la página principal
            </Link>
          </div>

        </div>
      </div>

    </div>
  );
}
