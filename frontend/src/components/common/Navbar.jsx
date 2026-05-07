import { Menu, LogOut, Bell } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuthStore();

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      <button onClick={onToggleSidebar} className="p-1.5 rounded-lg hover:bg-gray-100">
        <Menu size={20} className="text-gray-600" />
      </button>

      <div className="flex items-center gap-3">
        <button className="p-1.5 rounded-lg hover:bg-gray-100 relative">
          <Bell size={20} className="text-gray-600" />
        </button>
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </header>
  );
}
