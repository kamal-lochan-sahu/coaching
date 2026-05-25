import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, CreditCard, ClipboardCheck, BarChart3 } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

const tabs = [
  { to:"/",           icon:LayoutDashboard, label:"Home"       },
  { to:"/students",   icon:Users,           label:"Students"   },
  { to:"/attendance", icon:ClipboardCheck,  label:"Attendance" },
  { to:"/fees",       icon:CreditCard,      label:"Fees"       },
  { to:"/analytics",  icon:BarChart3,       label:"Reports"    },
];

export default function BottomNav() {
  const user  = useAuthStore(s => s.user);
  const color = user?.branding?.primaryColor || "#1a56db";

  return (
    <nav style={{
      position:"fixed", bottom:0, left:0, right:0,
      background:"#fff", borderTop:"1px solid #f1f5f9",
      display:"flex", height:"60px",
      paddingBottom:"env(safe-area-inset-bottom)",
      zIndex:30, boxShadow:"0 -2px 8px rgba(0,0,0,0.06)",
    }}>
      {tabs.map(({ to, icon:Icon, label }) => (
        <NavLink key={to} to={to} end={to==="/"}
          style={({ isActive }) => ({
            flex:1, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", gap:"2px",
            textDecoration:"none", padding:"6px 4px",
            color: isActive ? color : "#94a3b8",
            background: "none", border: "none",
            transition: "color 0.15s",
          })}>
          {({ isActive }) => (
            <>
              <Icon size={22} color={isActive ? color : "#94a3b8"} />
              <span style={{ fontSize:"10px", fontWeight: isActive ? 700 : 500 }}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
