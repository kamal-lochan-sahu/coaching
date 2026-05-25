import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";
import { useState, useEffect } from "react";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isMobile,    setIsMobile]    = useState(window.innerWidth < 1024);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close sidebar on mobile route change
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div style={{ display:"flex", height:"100dvh", background:"#f8faff", overflow:"hidden" }}>

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:40 }} />
      )}

      {/* Sidebar */}
      <div style={{
        position: isMobile ? "fixed" : "relative",
        left: isMobile ? (sidebarOpen ? 0 : "-260px") : 0,
        top: 0, bottom: 0, zIndex: 50,
        transition: "left 0.25s ease",
        flexShrink: 0,
      }}>
        <Sidebar open={true} onClose={() => setSidebarOpen(false)} isMobile={isMobile} />
      </div>

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main style={{
          flex: 1, overflowY: "auto",
          padding: isMobile ? "16px 12px 80px" : "24px",
        }}>
          <Outlet />
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      {isMobile && <BottomNav />}
    </div>
  );
}
