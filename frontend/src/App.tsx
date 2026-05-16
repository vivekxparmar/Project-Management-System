import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks";
import { useUIStore } from "@/stores";
import { connectSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores";

// Layouts
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import Page from "@/pages/portal/Page";

// Public pages
import Landing from "@/pages/Landing";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import VerifyOTP from "@/pages/auth/VerifyOTP";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";
import GoogleCallback from "@/pages/auth/GoogleCallback";

// Protected
import Projects from "@/pages/projects/Projects";
import Profile from "@/pages/portal/profile/Profile";

// Portal pages
import Sprint from "@/pages/portal/sprint/Sprint";
import Backlog from "@/pages/portal/backlog/Backlog";
import BugTracker from "@/pages/portal/bug/BugTracker";
import Resources from "@/pages/portal/resources/Resources";
import Team from "@/pages/portal/team/Team";
import ProjectDashboard from "@/pages/portal/dashboard/ProjectDashboard";
import Settings from "@/pages/portal/settings/Settings";
import Chat from "@/pages/portal/chat/Chat";
import AuditLog from "@/pages/portal/audit/AuditLog";

// Loading screen
import AppLoader from "@/components/shared/AppLoader";

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const setAppLoading = useUIStore((s) => s.setAppLoading);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!isLoading) {
      setAppLoading(false);
    }
  }, [isLoading]);

  useEffect(() => {
    if (token) {
      connectSocket(token);
    }
  }, [token]);

  if (isLoading) return <AppLoader />;

  return (
    <Routes>
      {/* PUBLIC */}
      <Route
        path="/"
        element={
          isAuthenticated ? <Navigate to="/projects" replace /> : <Landing />
        }
      />
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/projects" replace /> : <Login />
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated ? <Navigate to="/projects" replace /> : <Register />
        }
      />
      <Route path="/verify-otp" element={<VerifyOTP />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth/callback" element={<GoogleCallback />} />

      {/* PROTECTED */}
      <Route element={<ProtectedRoute />}>
        <Route path="/projects" element={<Projects />} />
        <Route path="/profile" element={<Profile />} />

        {/* PORTAL */}
        <Route path="/projects/portal/:projectId" element={<Page />}>
          <Route index element={<Sprint />} />
          <Route path="sprint" element={<Sprint />} />
          <Route path="backlog" element={<Backlog />} />
          <Route path="bugtracker" element={<BugTracker />} />
          <Route path="resources" element={<Resources />} />
          <Route path="team" element={<Team />} />
          <Route path="dashboard" element={<ProjectDashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="chat" element={<Chat />} />
          <Route path="audit" element={<AuditLog />} />
        </Route>
      </Route>

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
