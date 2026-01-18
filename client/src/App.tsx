import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import ProtectedRoute from './components/common/ProtectedRoute';
import Layout from './components/layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import SchedulesPage from './pages/schedules/SchedulesPage';

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

        {/* Protected routes with layout */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/horarios" element={<SchedulesPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
