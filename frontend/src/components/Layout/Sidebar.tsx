import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  Plus,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/patients", icon: Users, label: "Patients" },
  { to: "/appointments", icon: Calendar, label: "Appointments" },
  { to: "/emr", icon: FileText, label: "EMR" },
  { to: "/billing", icon: CreditCard, label: "Billing" },
  { to: "/reports", icon: BarChart3, label: "Reports" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-sidebar text-white flex flex-col z-20">
      <div className="px-5 py-6 border-b border-white/10">
        <h1 className="text-lg font-bold tracking-tight">MediFlow HMS</h1>
        <p className="text-xs text-gray-400 mt-1">City General Hospital</p>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-3 text-sm transition-colors relative ${
                isActive
                  ? "bg-primary/20 text-white before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary"
                  : "text-gray-400 hover:text-white hover:bg-sidebar-hover"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 pb-4">
        <button className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors">
          <Plus size={16} />
          New Admission
        </button>
      </div>

      <div className="border-t border-white/10 py-3">
        <button className="flex items-center gap-3 px-5 py-2.5 text-sm text-gray-400 hover:text-white w-full transition-colors">
          <HelpCircle size={18} />
          Help Center
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-5 py-2.5 text-sm text-gray-400 hover:text-white w-full transition-colors"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
