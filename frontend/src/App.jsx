import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Aptitude from './pages/Aptitude';
import AptitudeTest from './pages/AptitudeTest';
import Psych from './pages/Psych';
import Interview from './pages/Interview';
import InterviewDetail from './pages/InterviewDetail';
import MockInterview from './pages/MockInterview';
import Leaderboard from './pages/Leaderboard';
import Admin from './pages/Admin';
import DirectorAnalytics from './pages/DirectorAnalytics';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-8 text-ink-muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <p className="p-8 text-ink-muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function DirectorRoute({ children }) {
  const { user, loading, canAccessDirector } = useAuth();
  if (loading) return <p className="p-8 text-ink-muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!canAccessDirector) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Home />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="aptitude" element={<Aptitude />} />
        <Route path="aptitude/test/:category" element={<AptitudeTest />} />
        <Route path="psych" element={<Psych />} />
        <Route path="interview" element={<Interview />} />
        <Route path="interview/:id" element={<InterviewDetail />} />
        <Route path="mock" element={<MockInterview />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route
          path="director"
          element={
            <DirectorRoute>
              <DirectorAnalytics />
            </DirectorRoute>
          }
        />
        <Route
          path="admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
