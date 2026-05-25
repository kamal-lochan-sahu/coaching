import { Menu, LogOut, Bell } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuthStore();
  const color = user?.branding?.primaryColor || "#1a56db";

  return (
    <header style={{
      height: "56px", background: "#fff",
      borderBottom: "1px solid #f1f5f9",
      display: "flex", alignItems: "center",
      justifyContent: "space-between",
      padding: "0 16px", flexShrink: 0,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <button onClick={onToggleSidebar}
        style={{ padding:"8px", borderRadius:"10px", background:"none", border:"none", cursor:"pointer", display:"flex" }}>
        <Menu size={22} color="#64748b" />
      </button>

      <div style={{ display:"flex", alignItems:"center", gap:"4px" }}>
        <span style={{ fontSize:"13px", fontWeight:700, color:"#0f172a" }}>
          {user?.branding?.instituteName || "EduManage"}
        </span>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
        <button style={{ padding:"6px", borderRadius:"10px", background:"none", border:"none", cursor:"pointer", display:"flex" }}>
          <Bell size={20} color="#64748b" />
        </button>
        <button
          onClick={logout}
          style={{ padding:"6px", borderRadius:"10px", background:"#fef2f2", border:"none", cursor:"pointer", display:"flex" }}>
          <LogOut size={18} color="#ef4444" />
        </button>
      </div>
    </header>
  );
}
