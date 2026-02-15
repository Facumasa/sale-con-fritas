import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import ProtectedRoute from './components/common/ProtectedRoute';
import Layout from './components/layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import SchedulesPage from './pages/schedules/SchedulesPage';
import AttendancePage from './pages/attendance/AttendancePage';
import EmployeesPage from './pages/employees/EmployeesPage';
import PublicFichajePage from './pages/PublicFichajePage';
import ChangePinPage from './pages/ChangePinPage';

function App() {
  const { token, loadUser } = useAuthStore();

  useEffect(() => {
    // Intentar cargar el usuario si hay token
    if (token) {
      loadUser();
    }
  }, [token, loadUser]);

  return (
    <Router>
      <Routes>
        {/* Root path - redirect based on auth */}
        <Route
          path="/"
          element={
            token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
          }
        />

        {/* Auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Rutas públicas (sin login) */}
        <Route path="/fichaje/:publicToken" element={<PublicFichajePage />} />
        <Route path="/cambiar-pin/:token" element={<ChangePinPage />} />

        {/* Protected routes with layout */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/horarios" element={<SchedulesPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
