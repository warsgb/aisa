import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { MobileLayout } from './components/layout/MobileLayout';
import LoginPage from './pages/auth/LoginPage';
import { AdaptiveHomePage } from './pages/home/AdaptiveHomePage';
import DashboardPage from './pages/dashboard/DashboardPage';
import CustomersPage from './pages/customers/CustomersPage';
import SkillsPage from './pages/skills/SkillsPage';
import InteractionsPage from './pages/interactions/InteractionsPage';
import InteractionDetailPage from './pages/interactions/InteractionDetailPage';
import DocumentsPage from './pages/documents/DocumentsPage';
import SettingsPage from './pages/settings/SettingsPage';
import SystemPage from './pages/system/SystemPage';
import SystemConfigPage from './pages/system/SystemConfigPage';
import LtcConfigPage from './pages/ltc-config/LtcConfigPage';
import { useIsMobile } from './hooks/useMediaQuery';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Use mobile layout without sidebar for mobile screens
  if (isMobile) {
    return <MobileLayout>{children}</MobileLayout>;
  }

  return <Layout>{children}</Layout>;
}

function SystemAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'SYSTEM_ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AdaptiveHomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <AdaptiveHomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ltc-config"
            element={
              <ProtectedRoute>
                <LtcConfigPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <CustomersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/skills"
            element={
              <ProtectedRoute>
                <SkillsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interactions"
            element={
              <ProtectedRoute>
                <InteractionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interactions/:id"
            element={
              <ProtectedRoute>
                <InteractionDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <DocumentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/skills"
            element={
              <ProtectedRoute>
                <Navigate to="/system-config?tab=skills" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/system"
            element={
              <ProtectedRoute>
                <SystemPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/system-config"
            element={
              <SystemAdminRoute>
                <SystemConfigPage />
              </SystemAdminRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
