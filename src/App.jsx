import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './stores/useStore';
import DashboardLayout from './components/Layout/DashboardLayout';

// ── Code Splitting: cada página se carga solo cuando se necesita ──
const LandingPage       = lazy(() => import('./pages/Landing'));
const LoginPage         = lazy(() => import('./pages/LoginPage'));
const DashboardPage     = lazy(() => import('./pages/Dashboard'));
const AgendaPage        = lazy(() => import('./pages/Dashboard/Agenda'));
const PacientesPage     = lazy(() => import('./pages/Dashboard/Pacientes'));
const ConsultorioPage   = lazy(() => import('./pages/Dashboard/Consultorio'));
const FinanzasPage      = lazy(() => import('./pages/Dashboard/Finanzas'));
const PersonalPage      = lazy(() => import('./pages/Dashboard/Personal'));
const ReportesPage      = lazy(() => import('./pages/Dashboard/Reportes'));
const ConfiguracionPage = lazy(() => import('./pages/Dashboard/Configuracion'));
const MiPerfilPage      = lazy(() => import('./pages/Dashboard/MiPerfil'));
const NotFoundPage      = lazy(() => import('./pages/NotFoundPage'));
const ForcePasswordChange = lazy(() => import('./components/ForcePasswordChange/ForcePasswordChange'));

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

function App() {
  const {
    isAuthenticated,
    authLoading,
    auth,
    fetchPatients,
    fetchAppointments,
    fetchDoctors,
    fetchAdminStaff,
    fetchTransactions,
    initTheme,
  } = useStore();

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    initTheme();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const init = async () => {
      await auth.initSession();
      setInitialized(true);
    };
    init();
    // auth es un objeto estable del store, no cambia entre renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDoctors();
      fetchPatients();
      fetchAppointments();
      fetchAdminStaff();
      fetchTransactions();
    }
  }, [isAuthenticated, fetchDoctors, fetchPatients, fetchAppointments, fetchAdminStaff, fetchTransactions]);

  if (!initialized) return null;

  const handleLogin = async (email, password) => {
    await auth.login(email, password);
  };

  const handleLogout = () => {
    auth.logout();
  };

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <ForcePasswordChange />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage onLogin={handleLogin} isLoading={authLoading} />} />

          {/* Rutas Protegidas */}
          <Route
            element={
              isAuthenticated ? (
                <DashboardLayout onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          >
            {/* Todos los roles autenticados */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/agenda"    element={<AgendaPage />} />
            <Route path="/pacientes" element={<PacientesPage />} />
            <Route path="/mi-perfil" element={<MiPerfilPage />} />

            {/* Solo médicos y admin */}
            <Route path="/consultorio" element={
              <ProtectedRoute allowedRoles={['admin', 'medico']}>
                <ConsultorioPage />
              </ProtectedRoute>
            } />

            {/* Solo admin */}
            <Route path="/finanzas" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <FinanzasPage />
              </ProtectedRoute>
            } />
            <Route path="/personal" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <PersonalPage />
              </ProtectedRoute>
            } />
            <Route path="/reportes" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ReportesPage />
              </ProtectedRoute>
            } />
            <Route path="/configuracion" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ConfiguracionPage />
              </ProtectedRoute>
            } />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;

