import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

export default function Login() {
  const [form,     setForm]     = useState({ email:"", password:"" });
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const { login }  = useAuthStore();
  const navigate   = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success("Welcome back!");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally { setLoading(false); }
  };

  const isMobile = window.innerWidth < 768;

  return (
    <div style={{ minHeight:"100dvh", background: isMobile ? "#fff" : "linear-gradient(135deg,#f0f7ff,#e8f0fe)", display:"flex" }}>

      {/* Left panel — desktop only */}
      {!isMobile && (
        <div style={{ width:"45%", background:"linear-gradient(145deg,#1a56db,#1e3a8a)", display:"flex", flexDirection:"column", justifyContent:"space-between", padding:"48px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:"-80px", right:"-80px", width:"320px", height:"320px", borderRadius:"50%", background:"rgba(255,255,255,0.06)" }} />
          <div style={{ position:"absolute", bottom:"-60px", left:"-60px", width:"240px", height:"240px", borderRadius:"50%", background:"rgba(255,255,255,0.05)" }} />

          <div style={{ display:"flex", alignItems:"center", gap:"12px", position:"relative", zIndex:1 }}>
            <div style={{ width:"44px", height:"44px", background:"rgba(255,255,255,0.15)", borderRadius:"12px", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:"22px" }}>🎓</span>
            </div>
            <div>
              <p style={{ color:"#fff", fontWeight:700, fontSize:"18px" }}>EduManage</p>
              <p style={{ color:"rgba(255,255,255,0.5)", fontSize:"12px" }}>Coaching Management</p>
            </div>
          </div>

          <div style={{ position:"relative", zIndex:1 }}>
            <h1 style={{ color:"#fff", fontSize:"36px", fontWeight:800, lineHeight:1.2, marginBottom:"16px" }}>
              Manage your<br />institute smarter.
            </h1>
            <p style={{ color:"rgba(255,255,255,0.65)", fontSize:"15px", lineHeight:1.7, marginBottom:"36px" }}>
              Attendance, fees, results, staff & communication — everything in one dashboard.
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              {["✅ One-tap attendance marking","💰 Auto PDF fee receipts","📊 Instant report cards & rankings","📱 WhatsApp alerts to parents"].map(t=>(
                <div key={t} style={{ display:"flex", alignItems:"center", gap:"12px", background:"rgba(255,255,255,0.08)", borderRadius:"10px", padding:"10px 14px" }}>
                  <p style={{ color:"rgba(255,255,255,0.85)", fontSize:"13px", fontWeight:500 }}>{t}</p>
                </div>
              ))}
            </div>
          </div>
          <p style={{ color:"rgba(255,255,255,0.35)", fontSize:"12px", position:"relative", zIndex:1 }}>© 2026 EduManage · White Label Ready</p>
        </div>
      )}

      {/* Right / Mobile panel */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding: isMobile?"24px":"48px" }}>
        <div style={{ width:"100%", maxWidth:"400px" }}>

          {/* Mobile logo */}
          {isMobile && (
            <div style={{ textAlign:"center", marginBottom:"36px" }}>
              <div style={{ width:"72px", height:"72px", background:"linear-gradient(135deg,#1a56db,#1e3a8a)", borderRadius:"20px", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", boxShadow:"0 8px 24px rgba(26,86,219,0.3)" }}>
                <span style={{ fontSize:"36px" }}>🎓</span>
              </div>
              <h1 style={{ fontSize:"22px", fontWeight:800, color:"#0f172a" }}>EduManage</h1>
              <p style={{ fontSize:"13px", color:"#94a3b8", marginTop:"4px" }}>Coaching Management System</p>
            </div>
          )}

          <div style={{ marginBottom:"28px" }}>
            <h2 style={{ fontSize: isMobile?"24px":"28px", fontWeight:800, color:"#0f172a", marginBottom:"6px" }}>Welcome back 👋</h2>
            <p style={{ color:"#64748b", fontSize:"14px" }}>Sign in to your institute dashboard</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <div>
              <label style={{ display:"block", fontSize:"13px", fontWeight:600, color:"#374151", marginBottom:"8px" }}>Email Address</label>
              <input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@example.com"
                style={{ width:"100%", padding:"13px 16px", border:"1.5px solid #e2e8f0", borderRadius:"12px", fontSize:"15px", color:"#0f172a", background:"#fff", outline:"none", boxSizing:"border-box" }}
                onFocus={e=>e.target.style.borderColor="#1a56db"}
                onBlur={e=>e.target.style.borderColor="#e2e8f0"} />
            </div>

            <div>
              <label style={{ display:"block", fontSize:"13px", fontWeight:600, color:"#374151", marginBottom:"8px" }}>Password</label>
              <div style={{ position:"relative" }}>
                <input type={showPass?"text":"password"} required value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Enter your password"
                  style={{ width:"100%", padding:"13px 48px 13px 16px", border:"1.5px solid #e2e8f0", borderRadius:"12px", fontSize:"15px", color:"#0f172a", background:"#fff", outline:"none", boxSizing:"border-box" }}
                  onFocus={e=>e.target.style.borderColor="#1a56db"}
                  onBlur={e=>e.target.style.borderColor="#e2e8f0"} />
                <button type="button" onClick={()=>setShowPass(!showPass)}
                  style={{ position:"absolute", right:"14px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#94a3b8", display:"flex" }}>
                  {showPass ? <EyeOff size={20}/> : <Eye size={20}/>}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              style={{ width:"100%", padding:"14px", background:loading?"#93c5fd":"linear-gradient(135deg,#1a56db,#1e3a8a)", color:"#fff", border:"none", borderRadius:"12px", fontSize:"16px", fontWeight:700, cursor:loading?"not-allowed":"pointer", boxShadow:"0 4px 14px rgba(26,86,219,0.35)", marginTop:"4px" }}>
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          <div style={{ marginTop:"20px", padding:"14px 16px", background:"#f0f7ff", borderRadius:"12px", border:"1px solid #bfdbfe" }}>
            <p style={{ fontSize:"12px", fontWeight:700, color:"#1d4ed8", marginBottom:"4px" }}>🔑 Demo Credentials</p>
            <p style={{ fontSize:"12px", color:"#3b82f6" }}>kamal@test.com · test1234</p>
          </div>

          <p style={{ textAlign:"center", fontSize:"13px", color:"#94a3b8", marginTop:"20px" }}>
            No account?{" "}
            <Link to="/register" style={{ color:"#1a56db", fontWeight:600, textDecoration:"none" }}>Create one free</Link>
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}
