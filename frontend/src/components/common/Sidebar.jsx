import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, BookOpen, ClipboardCheck, CreditCard, FileText, UserCheck, MessageSquare, TrendingDown, BarChart3, Settings, GraduationCap, Calendar, Bell, X } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

const links = [
  { to:"/",              icon:LayoutDashboard, label:"Dashboard"      },
  { to:"/students",      icon:Users,           label:"Students"       },
  { to:"/batches",       icon:BookOpen,        label:"Batches"        },
  { to:"/attendance",    icon:ClipboardCheck,  label:"Attendance"     },
  { to:"/fees",          icon:CreditCard,      label:"Fees"           },
  { to:"/tests",         icon:FileText,        label:"Tests & Results"},
  { to:"/timetable",     icon:Calendar,        label:"Timetable"      },
  { to:"/staff",         icon:UserCheck,       label:"Staff"          },
  { to:"/enquiries",     icon:MessageSquare,   label:"Enquiries"      },
  { to:"/expenses",      icon:TrendingDown,    label:"Expenses"       },
  { to:"/notifications", icon:Bell,            label:"Notifications"  },
  { to:"/analytics",     icon:BarChart3,       label:"Analytics"      },
  { to:"/settings",      icon:Settings,        label:"Settings"       },
];

export default function Sidebar({ onClose, isMobile }) {
  const user  = useAuthStore(s => s.user);
  const color = user?.branding?.primaryColor || "#1a56db";

  return (
    <aside style={{
      width:"240px", height:"100%", background:"#fff",
      borderRight:"1px solid #f1f5f9",
      display:"flex", flexDirection:"column",
      overflowY:"auto",
    }}>
      {/* Logo */}
      <div style={{ padding:"16px", borderBottom:"1px solid #f1f5f9", borderTop:`4px solid ${color}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <div style={{ width:"36px", height:"36px", background:color, borderRadius:"10px", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <GraduationCap size={20} color="#fff" />
          </div>
          <div>
            <p style={{ fontWeight:700, color:"#0f172a", fontSize:"13px", lineHeight:1.2 }}>
              {user?.branding?.instituteName || "EduManage"}
            </p>
            <p style={{ fontSize:"11px", color:"#94a3b8", marginTop:"2px" }}>Management System</p>
          </div>
        </div>
        {isMobile && (
          <button onClick={onClose} style={{ padding:"4px", background:"none", border:"none", cursor:"pointer", display:"flex", flexShrink:0 }}>
            <X size={20} color="#94a3b8" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:"8px" }}>
        {links.map(({ to, icon:Icon, label }) => (
          <NavLink key={to} to={to} end={to==="/"}
            style={({ isActive }) => ({
              display:"flex", alignItems:"center", gap:"10px",
              padding:"10px 12px", borderRadius:"10px", marginBottom:"2px",
              fontSize:"13px", fontWeight:500, textDecoration:"none",
              background: isActive ? color : "transparent",
              color: isActive ? "#fff" : "#64748b",
              transition: "all 0.15s",
            })}>
            {({ isActive }) => (
              <>
                <Icon size={17} color={isActive ? "#fff" : "#94a3b8"} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding:"14px 16px", borderTop:"1px solid #f1f5f9" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <div style={{ width:"32px", height:"32px", borderRadius:"50%", background:color, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:"13px", flexShrink:0 }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div style={{ overflow:"hidden" }}>
            <p style={{ fontSize:"13px", fontWeight:600, color:"#0f172a", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{user?.name}</p>
            <p style={{ fontSize:"11px", color:"#94a3b8", textTransform:"capitalize" }}>{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
