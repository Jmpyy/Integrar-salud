import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './stores/useStore';
import toast from 'react-hot-toast';
import DashboardLayout from './components/Layout/DashboardLayout';
import PublicLayout from './components/Layout/PublicLayout';
import InstallPWA from './components/InstallPWA/InstallPWA';
import ReloadPrompt from './components/ReloadPrompt/ReloadPrompt';

// ── Code Splitting: cada página se carga solo cuando se necesita ──
const LandingPage       = lazy(() => import('./pages/Landing'));
const ProfesionalPage   = lazy(() => import('./pages/Public/Profesional'));
const TramitesPage      = lazy(() => import('./pages/Public/Tramites'));
const InfoPage          = lazy(() => import('./pages/Public/Info'));
const PrivacidadPage    = lazy(() => import('./pages/Public/Privacidad'));
const TerminosPage      = lazy(() => import('./pages/Public/Terminos'));
const AdultosPage       = lazy(() => import('./pages/Public/Servicios/Adultos'));
const InfantoJuvenilPage= lazy(() => import('./pages/Public/Servicios/InfantoJuvenil'));
const FarmacologiaPage  = lazy(() => import('./pages/Public/Servicios/Farmacologia'));
const EvaluacionPage    = lazy(() => import('./pages/Public/Servicios/Evaluacion'));
const LoginPage         = lazy(() => import('./pages/LoginPage'));
const DashboardPage     = lazy(() => import('./pages/Dashboard'));
const AgendaPage        = lazy(() => import('./pages/Dashboard/Agenda'));
const PacientesPage     = lazy(() => import('./pages/Dashboard/Pacientes'));
const ConsultorioPage   = lazy(() => import('./pages/Dashboard/Consultorio'));
const FinanzasPage      = lazy(() => import('./pages/Dashboard/Finanzas'));
const PersonalPage      = lazy(() => import('./pages/Dashboard/Personal'));
const ReportesPage      = lazy(() => import('./pages/Dashboard/Reportes'));
const ConfiguracionPage = lazy(() => import('./pages/Dashboard/Configuracion'));
const MedicamentosPage  = lazy(() => import('./pages/Dashboard/Medicamentos'));
const MiPerfilPage      = lazy(() => import('./pages/Dashboard/MiPerfil'));
const NotFoundPage      = lazy(() => import('./pages/NotFoundPage'));
const VirtualRoomPage   = lazy(() => import('./pages/VirtualRoom'));
const AuthSetup         = lazy(() => import('./components/AuthSetup/AuthSetup'));

/** Fallback mientras carga el chunk de la página */
function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-[var(--accent-primary)] border-t-transparent animate-spin" />
        <p className="text-sm font-semibold text-[var(--text-secondary)]">Cargando...</p>
      </div>
    </div>
  );
}

/**
 * Protege una ruta por roles.
 * Si el usuario no tiene el rol requerido, redirige al /dashboard.
 */
function ProtectedRoute({ allowedRoles, children }) {
  const { userRole } = useStore();
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

/**
 * Fuerza a que ciertas rutas solo carguen si el subdominio es "control."
 * o si estamos en entorno local. De lo contrario redirige al dominio correcto.
 */
function RequireControlPanel({ children }) {
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isControlSubdomain = hostname.startsWith('control.');

  if (!isLocalhost && !isControlSubdomain) {
    // Redirigir al subdominio manteniendo la ruta hash actual
    window.location.replace(`https://control.integrarsalud.me${window.location.hash}`);
    return null;
  }
  return children;
}

function App() {
  const isAuthenticated = useStore(state => state.isAuthenticated);
  const authLoading = useStore(state => state.authLoading);
  const auth = useStore(state => state.auth);
  const fetchPatients = useStore(state => state.fetchPatients);
  const fetchAppointments = useStore(state => state.fetchAppointments);
  const fetchDoctors = useStore(state => state.fetchDoctors);
  const fetchAdminStaff = useStore(state => state.fetchAdminStaff);
  const fetchTransactions = useStore(state => state.fetchTransactions);
  const initTheme = useStore(state => state.initTheme);
  const fetchGlobalConfig = useStore(state => state.fetchGlobalConfig);
  const appointments = useStore(state => state.appointments);
  const userRole = useStore(state => state.userRole);
  const user = useStore(state => state.user);
  const globalConfig = useStore(state => state.globalConfig);

  const [initialized, setInitialized] = useState(false);
  const prevWaitingIds = useRef([]);

  // Sonido de notificación (Ping suave)
  const playPing = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.volume = 0.5;
    audio.play().catch(e => console.log('Audio blocked by browser policy'));
  };

  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    const init = async () => {
      await auth.initSession();
      setInitialized(true);
    };
    init();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDoctors();
      fetchPatients();
      fetchAppointments();
      fetchAdminStaff();
      if (['admin', 'administracion'].includes(userRole)) fetchTransactions();
      fetchGlobalConfig();

      // Polling global de turnos cada 10 segundos
      const poll = setInterval(() => {
        fetchAppointments();
      }, 10000);

      return () => clearInterval(poll);
    }
  }, [isAuthenticated, fetchDoctors, fetchPatients, fetchAppointments, fetchAdminStaff, fetchTransactions, fetchGlobalConfig]);

  // Detector global de pacientes en sala de espera
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const waitingRoomApps = (appointments || []).filter(a => a && a.attendance === 'en_espera');
    const currentWaitingIds = waitingRoomApps.map(a => a.id);
    
    const newArrivals = waitingRoomApps.filter(app => !prevWaitingIds.current.includes(app.id));
    
    if (newArrivals.length > 0 && prevWaitingIds.current.length > 0) {
      newArrivals.forEach(app => {
        toast.success(`¡Paciente en sala!: ${app.patient}`, {
          duration: 5000,
          icon: '🛎️',
          style: {
            borderRadius: '20px',
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #0ea5e9',
            fontSize: '14px',
            fontWeight: 'bold'
          }
        });
      });
      playPing();
    }
    
    prevWaitingIds.current = currentWaitingIds;
  }, [appointments, isAuthenticated]);

  // --- Branding Dinámico ---
  useEffect(() => {
    if (globalConfig?.primaryColor) {
      // Sobrescribimos las variables de Tailwind (rose-500) y las personalizadas (--accent-primary)
      document.documentElement.style.setProperty('--color-rose-500', globalConfig.primaryColor);
      document.documentElement.style.setProperty('--color-rose-600', globalConfig.primaryColor); // Fallback para hovers
      document.documentElement.style.setProperty('--accent-primary', globalConfig.primaryColor);
    }
  }, [globalConfig?.primaryColor]);

  // --- Auto-logout por inactividad ---
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // sessionTimeout está en minutos. Si es 0 o null, "Mantener siempre activa"
    const timeoutMinutes = globalConfig?.sessionTimeout;
    if (!timeoutMinutes || timeoutMinutes <= 0) return;

    let inactivityTimer;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        toast('Sesión cerrada por inactividad', {
          icon: '🔒',
          duration: 4000,
          style: { background: '#1e293b', color: '#fff' }
        });
        auth.logout();
      }, timeoutMinutes * 60 * 1000);
    };

    // Eventos de usuario que reinician el contador
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));

    resetTimer(); // Inicializar

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [isAuthenticated, globalConfig?.sessionTimeout, auth]);

  if (!initialized) return null;

  const handleLogin = async (email, password, rememberMe) => {
    await auth.login(email, password, rememberMe);
  };

  const handleLogout = () => {
    auth.logout();
  };

  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        {user?.must_change_password && (
          <AuthSetup />
        )}
        <Routes>
          {/* Rutas Públicas */}
          <Route element={<PublicLayout />}>
            <Route 
              path="/" 
              element={
                window.location.hostname.startsWith('control.') 
                  ? <Navigate to="/dashboard" replace /> 
                  : <LandingPage />
              } 
            />
            <Route path="/profesional" element={<ProfesionalPage />} />
            <Route path="/tramites" element={<TramitesPage />} />
            <Route path="/info" element={<InfoPage />} />
            <Route path="/privacidad" element={<PrivacidadPage />} />
            <Route path="/terminos" element={<TerminosPage />} />
            <Route path="/servicios/adultos" element={<AdultosPage />} />
            <Route path="/servicios/infanto-juvenil" element={<InfantoJuvenilPage />} />
            <Route path="/servicios/farmacologia" element={<FarmacologiaPage />} />
            <Route path="/servicios/evaluacion" element={<EvaluacionPage />} />
          </Route>
          <Route 
            path="/login" 
            element={
              <RequireControlPanel>
                {!isAuthenticated ? <LoginPage onLogin={handleLogin} loading={authLoading} /> : <Navigate to="/dashboard" />}
              </RequireControlPanel>
            } 
          />
          <Route path="/virtual" element={<VirtualRoomPage />} />
          <Route path="/sala-virtual" element={<VirtualRoomPage />} />
          
          {/* Rutas Privadas (Dashboard) */}
          <Route 
            path="/dashboard" 
            element={
              <RequireControlPanel>
                {isAuthenticated ? <DashboardLayout onLogout={handleLogout} /> : <Navigate to="/login" />}
              </RequireControlPanel>
            }
          >
             <Route index element={<DashboardPage />} />
             <Route path="agenda" element={<ProtectedRoute allowedRoles={['admin', 'medico', 'recepcionista', 'administracion']}><AgendaPage /></ProtectedRoute>} />
             <Route path="pacientes" element={<ProtectedRoute allowedRoles={['admin', 'medico', 'recepcionista', 'administracion']}><PacientesPage /></ProtectedRoute>} />
             <Route path="consultorio" element={<ProtectedRoute allowedRoles={['admin', 'medico', 'administracion']}><ConsultorioPage /></ProtectedRoute>} />
             <Route path="medicamentos" element={<ProtectedRoute allowedRoles={['admin', 'medico']}><MedicamentosPage /></ProtectedRoute>} />
             <Route path="finanzas" element={<ProtectedRoute allowedRoles={['admin', 'administracion']}><FinanzasPage /></ProtectedRoute>} />
             <Route path="personal" element={<ProtectedRoute allowedRoles={['admin']}><PersonalPage /></ProtectedRoute>} />
             <Route path="reportes" element={<ProtectedRoute allowedRoles={['admin', 'administracion']}><ReportesPage /></ProtectedRoute>} />
             <Route path="configuracion" element={<ProtectedRoute allowedRoles={['admin']}><ConfiguracionPage /></ProtectedRoute>} />
             <Route path="perfil" element={<MiPerfilPage />} />
          </Route>

          {/* Redirecciones de compatibilidad para URLs antiguas */}
          <Route path="/agenda" element={<Navigate to="/dashboard/agenda" replace />} />
          <Route path="/pacientes" element={<Navigate to="/dashboard/pacientes" replace />} />
          <Route path="/finanzas" element={<Navigate to="/dashboard/finanzas" replace />} />
          <Route path="/configuracion" element={<Navigate to="/dashboard/configuracion" replace />} />
          <Route path="/perfil" element={<Navigate to="/dashboard/perfil" replace />} />
          <Route path="/reportes" element={<Navigate to="/dashboard/reportes" replace />} />
          <Route path="/home" element={<Navigate to="/dashboard" replace />} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <InstallPWA />
      <ReloadPrompt />
    </Router>
  );
}

export default App;
