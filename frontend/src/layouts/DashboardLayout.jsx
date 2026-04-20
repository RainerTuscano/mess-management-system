import { Outlet } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const STUDENT_LINKS = [
  { to: "/student", label: "Today", end: true },
  { to: "/student/calendar", label: "Calendar" },
  { to: "/student/history", label: "Meal History" },
  { to: "/student/redemptions", label: "Redemptions" }
];

const ADMIN_LINKS = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/menu", label: "Weekly Menu" },
  { to: "/admin/extras", label: "Extras" },
  { to: "/admin/redemptions", label: "Tokens" }
];

export default function DashboardLayout() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  return (
    <AppShell
      title={isAdmin ? "Mess Operations Console" : "Student Mess Dashboard"}
      subtitle={
        isAdmin
          ? "Track headcount, keep menus updated, and manage redemptions with a cleaner operational view for the hostel mess."
          : "Opt out before deadlines, monitor your points balance, and keep a simple record of meals, extras, and attendance."
      }
      links={isAdmin ? ADMIN_LINKS : STUDENT_LINKS}
    >
      <Outlet />
    </AppShell>
  );
}
