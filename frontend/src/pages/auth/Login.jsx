import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

export default function Login() {
  const [form, setForm]       = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]  = useState(false);
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

  return (
    <div style={{ minHeight:"100vh", display:"flex", background:"#f8faff" }}>

      {/* ── Left brand panel ── */}
      <div style={{
        width:"45%", background:"linear-gradient(145deg,#1a56db 0%,#1e3a8a 100%)",
        display:"flex", flexDirection:"column", justifyContent:"space-between",
        padding:"48px", position:"relative", overflow:"hidden",
      }}>
        {/* decorative blobs */}
        <div style={{ position:"absolute", top:"-80px", right:"-80px", width:"320px", height:"320px", borderRadius:"50%", background:"rgba(255,255,255,0.06)" }} />
        <div style={{ position:"absolute", bottom:"-60px", left:"-60px", width:"240px", height:"240px", borderRadius:"50%", background:"rgba(255,255,255,0.05)" }} />
        <div style={{ position:"absolute", top:"40%", right:"10%", width:"120px", height:"120px", borderRadius:"50%", background:"rgba(255,255,255,0.04)" }} />

        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:"12px", position:"relative", zIndex:1 }}>
          <div style={{ width:"44px", height:"44px", background:"rgba(255,255,255,0.15)", borderRadius:"12px", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.2)" }}>
            <span style={{ fontSize:"22px" }}>🎓</span>
          </div>
          <div>
            <p style={{ color:"#fff", fontWeight:700, fontSize:"18px", lineHeight:1 }}>EduManage</p>
            <p style={{ color:"rgba(255,255,255,0.5)", fontSize:"12px", marginTop:"2px" }}>Coaching Management</p>
          </div>
        </div>

        {/* Hero text */}
        <div style={{ position:"relative", zIndex:1 }}>
          <h1 style={{ color:"#fff", fontSize:"36px", fontWeight:800, lineHeight:1.2, marginBottom:"16px" }}>
            Manage your<br />institute smarter.
          </h1>
          <p style={{ color:"rgba(255,255,255,0.65)", fontSize:"15px", lineHeight:1.7, marginBottom:"40px" }}>
            Attendance, fees, results, staff & communication — everything in one clean dashboard.
          </p>

          {/* Feature pills */}
          <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
            {[
              { icon:"✅", text:"One-tap attendance marking" },
              { icon:"💰", text:"Auto PDF fee receipts" },
              { icon:"📊", text:"Instant report cards & rankings" },
              { icon:"📱", text:"WhatsApp alerts to parents" },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display:"flex", alignItems:"center", gap:"12px", background:"rgba(255,255,255,0.08)", borderRadius:"10px", padding:"10px 14px", backdropFilter:"blur(4px)" }}>
                <span style={{ fontSize:"16px" }}>{icon}</span>
                <p style={{ color:"rgba(255,255,255,0.85)", fontSize:"13px", fontWeight:500 }}>{text}</p>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color:"rgba(255,255,255,0.35)", fontSize:"12px", position:"relative", zIndex:1 }}>
          © 2026 EduManage · White Label Ready
        </p>
      </div>

      {/* ── Right login panel ── */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"48px" }}>
        <div style={{ width:"100%", maxWidth:"400px" }}>

          <div style={{ marginBottom:"40px" }}>
            <h2 style={{ fontSize:"28px", fontWeight:800, color:"#0f172a", marginBottom:"8px" }}>Welcome back 👋</h2>
            <p style={{ color:"#64748b", fontSize:"15px" }}>Sign in to your institute dashboard</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom:"20px" }}>
              <label style={{ display:"block", fontSize:"13px", fontWeight:600, color:"#374151", marginBottom:"8px" }}>
                Email Address
              </label>
              <input
                type="email" required
                value={form.email}
                onChange={e => setForm({...form, email:e.target.value})}
                placeholder="you@example.com"
                style={{ width:"100%", padding:"12px 16px", border:"1.5px solid #e2e8f0", borderRadius:"10px", fontSize:"14px", color:"#0f172a", background:"#fff", outline:"none", boxSizing:"border-box", transition:"border-color 0.2s" }}
                onFocus={e => e.target.style.borderColor="#1a56db"}
                onBlur={e  => e.target.style.borderColor="#e2e8f0"}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom:"28px" }}>
              <label style={{ display:"block", fontSize:"13px", fontWeight:600, color:"#374151", marginBottom:"8px" }}>
                Password
              </label>
              <div style={{ position:"relative" }}>
                <input
                  type={showPass ? "text" : "password"} required
                  value={form.password}
                  onChange={e => setForm({...form, password:e.target.value})}
                  placeholder="Enter your password"
                  style={{ width:"100%", padding:"12px 44px 12px 16px", border:"1.5px solid #e2e8f0", borderRadius:"10px", fontSize:"14px", color:"#0f172a", background:"#fff", outline:"none", boxSizing:"border-box" }}
                  onFocus={e => e.target.style.borderColor="#1a56db"}
                  onBlur={e  => e.target.style.borderColor="#e2e8f0"}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position:"absolute", right:"14px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#94a3b8", display:"flex" }}>
                  {showPass ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{ width:"100%", padding:"13px", background: loading ? "#93c5fd" : "linear-gradient(135deg,#1a56db,#1e3a8a)", color:"#fff", border:"none", borderRadius:"10px", fontSize:"15px", fontWeight:700, cursor: loading ? "not-allowed" : "pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", boxShadow:"0 4px 14px rgba(26,86,219,0.35)", transition:"opacity 0.2s" }}>
              {loading
                ? <><div style={{ width:"18px", height:"18px", border:"2px solid rgba(255,255,255,0.4)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} /> Signing in...</>
                : "Sign In →"
              }
            </button>
          </form>

          {/* Demo hint */}
          <div style={{ marginTop:"24px", padding:"14px 16px", background:"#f0f7ff", borderRadius:"10px", border:"1px solid #bfdbfe" }}>
            <p style={{ fontSize:"12px", fontWeight:700, color:"#1d4ed8", marginBottom:"4px" }}>🔑 Demo Credentials</p>
            <p style={{ fontSize:"12px", color:"#3b82f6" }}>kamal@test.com · test1234</p>
          </div>

          <p style={{ textAlign:"center", fontSize:"13px", color:"#94a3b8", marginTop:"24px" }}>
            No account?{" "}
            <Link to="/register" style={{ color:"#1a56db", fontWeight:600, textDecoration:"none" }}>Create one free</Link>
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
