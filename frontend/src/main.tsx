import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppLayout } from "./components/Layout/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import "./index.css";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-gray-400">Đang tải...</div>
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/patients" element={<PlaceholderPage title="Patients" description="Quản lý hồ sơ bệnh nhân — Patient Service (Vững)" />} />
        <Route path="/appointments" element={<PlaceholderPage title="Appointments" description="Đặt lịch, hủy lịch — Appointment Service (Vững)" />} />
        <Route path="/emr" element={<PlaceholderPage title="EMR" description="Hồ sơ bệnh án điện tử — EMR Service (Vững)" />} />
        <Route path="/billing" element={<PlaceholderPage title="Billing" description="Hóa đơn & thanh toán — Billing Service (Tính)" />} />
        <Route path="/reports" element={<PlaceholderPage title="Reports" description="Báo cáo & Analytics — Analytics Service (Tính)" />} />
        <Route path="/settings" element={<PlaceholderPage title="Settings" description="Cài đặt hệ thống & quản lý người dùng — Identity/RBAC (Huy)" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
