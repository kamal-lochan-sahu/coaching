import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, BookOpen, ClipboardCheck, CreditCard, FileText, UserCheck, MessageSquare, TrendingDown, BarChart3, Settings, GraduationCap } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

const links = [
  { to: "/",           icon: LayoutDashboard, label: "Dashboard" },
  { to: "/students",   icon: Users,           label: "Students" },
  { to: "/batches",    icon: BookOpen,        label: "Batches" },
  { to: "/attendance", icon: ClipboardCheck,  label: "Attendance" },
  { to: "/fees",       icon: CreditCard,      label: "Fees" },
  { to: "/tests",      icon: FileText,        label: "Tests & Results" },
  { to: "/staff",      icon: UserCheck,       label: "Staff" },
  { to: "/enquiries",  icon: MessageSquare,   label: "Enquiries" },
  { to: "/expenses",   icon: TrendingDown,    label: "Expenses" },
  { to: "/analytics",  icon: BarChart3,       label: "Analytics" },
  { to: "/settings",   icon: Settings,        label: "Settings" },
];

export default function Sidebar({ open }) {
  const user = useAuthStore(s => s.user);
  const color = user?.branding?.primaryColor || "#3b82f6";

  if (!open) return null;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100" style={{ borderTop: `4px solid ${color}` }}>
        <div className="flex items-center gap-2">
          <GraduationCap size={28} style={{ color }} />
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">
              {user?.branding?.instituteName || "EduManage"}
            </p>
            <p className="text-xs text-gray-400">Management System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? "text-white font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`
            }
            style={({ isActive }) => isActive ? { backgroundColor: color } : {}}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-800">{user?.name}</p>
        <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
      </div>
    </aside>
  );
}
