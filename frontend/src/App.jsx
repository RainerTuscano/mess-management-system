import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AuthLayout from "./layouts/AuthLayout.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import StudentDashboardPage from "./pages/student/StudentDashboardPage.jsx";
import StudentCalendarPage from "./pages/student/StudentCalendarPage.jsx";
import StudentHistoryPage from "./pages/student/StudentHistoryPage.jsx";
import StudentRedemptionsPage from "./pages/student/StudentRedemptionsPage.jsx";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage.jsx";
import AdminMenuPage from "./pages/admin/AdminMenuPage.jsx";
import AdminExtrasPage from "./pages/admin/AdminExtrasPage.jsx";
import AdminRedemptionsPage from "./pages/admin/AdminRedemptionsPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route
        path="/student"
        element={
          <ProtectedRoute role="STUDENT">
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentDashboardPage />} />
        <Route path="calendar" element={<StudentCalendarPage />} />
        <Route path="history" element={<StudentHistoryPage />} />
        <Route path="redemptions" element={<StudentRedemptionsPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="ADMIN">
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="menu" element={<AdminMenuPage />} />
        <Route path="extras" element={<AdminExtrasPage />} />
        <Route path="redemptions" element={<AdminRedemptionsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
