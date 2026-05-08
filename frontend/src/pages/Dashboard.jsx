import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import api from "../services/api";
import Loader from "../components/ui/Loader";
import { useAuthStore } from "../store/authStore";

const Card = ({ label, value, sub, emoji, accent = "#1a56db", light = "#eff6ff" }) => (
  <div style={{ background:"#fff", borderRadius:"16px", padding:"22px 24px", border:"1px solid #f1f5f9", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"14px" }}>
      <p style={{ fontSize:"12px", fontWeight:600, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.6px" }}>{label}</p>
      <div style={{ width:"38px", height:"38px", background:light, borderRadius:"10px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px" }}>{emoji}</div>
    </div>
    <p style={{ fontSize:"26px", fontWeight:800, color:"#0f172a", lineHeight:1 }}>{value}</p>
    {sub && <p style={{ fontSize:"12px", color:"#94a3b8", marginTop:"6px" }}>{sub}</p>}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"10px", padding:"10px 14px", boxShadow:"0 4px 12px rgba(0,0,0,0.08)", fontSize:"12px" }}>
      <p style={{ fontWeight:700, color:"#374151", marginBottom:"6px" }}>{label}</p>
      {payload.map(p => <p key={p.name} style={{ color:p.color, margin:"2px 0" }}>{p.name}: ₹{p.value.toLocaleString()}</p>)}
    </div>
  );
};

export default function Dashboard() {
  const user = useAuthStore(s => s.user);
  const { data, isLoading } = useQuery({ queryKey:["dashboard"], queryFn: () => api.get("/analytics/dashboard").then(r=>r.data.data) });
  const { data: chart }     = useQuery({ queryKey:["revenue-chart"], queryFn: () => api.get("/analytics/revenue").then(r=>r.data.data) });

  if (isLoading) return <Loader text="Loading dashboard..." />;
  const d = data || {};
  const attPct = d.attendance?.today?.percentage || 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const profit = (d.fees?.collectedThisMonth || 0) - (d.expenses?.thisMonth || 0);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"28px" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <p style={{ fontSize:"13px", color:"#94a3b8", marginBottom:"4px" }}>{greeting} 👋</p>
          <h1 style={{ fontSize:"26px", fontWeight:800, color:"#0f172a" }}>{user?.name}</h1>
          <p style={{ fontSize:"13px", color:"#94a3b8", marginTop:"2px" }}>
            {new Date().toLocaleDateString("en-IN",{ weekday:"long", day:"numeric", month:"long", year:"numeric" })}
          </p>
        </div>
        <div style={{ background:"linear-gradient(135deg,#1a56db,#1e3a8a)", padding:"10px 20px", borderRadius:"12px", display:"flex", alignItems:"center", gap:"10px" }}>
          <span style={{ fontSize:"20px" }}>🎓</span>
          <div>
            <p style={{ color:"rgba(255,255,255,0.7)", fontSize:"11px" }}>Institute</p>
            <p style={{ color:"#fff", fontWeight:700, fontSize:"14px" }}>{user?.branding?.instituteName || "EduManage"}</p>
          </div>
        </div>
      </div>

      {/* Primary KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"16px" }}>
        <Card label="Total Students"     value={d.students?.total || 0}
          sub={`${d.students?.active||0} active · ${d.students?.newThisMonth||0} new this month`}
          emoji="👥" accent="#1a56db" light="#eff6ff" />
        <Card label="Today Attendance"   value={`${attPct}%`}
          sub={`${d.attendance?.today?.present||0} present / ${d.attendance?.today?.total||0} total`}
          emoji="📋" accent="#10b981" light="#f0fdf4" />
        <Card label="Fee Collected Today" value={`₹${(d.fees?.collectedToday||0).toLocaleString()}`}
          sub={`₹${(d.fees?.collectedThisMonth||0).toLocaleString()} this month`}
          emoji="💰" accent="#f59e0b" light="#fffbeb" />
        <Card label="Pending Fees"       value={`₹${(d.fees?.totalPending||0).toLocaleString()}`}
          sub="Total outstanding"
          emoji="⚠️" accent="#ef4444" light="#fef2f2" />
      </div>

      {/* Secondary KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"16px" }}>
        <Card label="Active Batches"    value={d.batches?.total||0}             emoji="📚" light="#f5f3ff" />
        <Card label="Enquiries (Week)"  value={d.enquiries?.thisWeek||0}        emoji="💬" light="#ecfeff" />
        <Card label="Expenses (Month)"  value={`₹${(d.expenses?.thisMonth||0).toLocaleString()}`} emoji="📉" light="#fff1f2" />
      </div>

      {/* Charts */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:"20px" }}>

        {/* Bar Chart */}
        <div style={{ background:"#fff", borderRadius:"16px", padding:"24px", border:"1px solid #f1f5f9", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ marginBottom:"20px" }}>
            <h3 style={{ fontSize:"15px", fontWeight:700, color:"#0f172a" }}>Revenue vs Expenses</h3>
            <p style={{ fontSize:"12px", color:"#94a3b8", marginTop:"3px" }}>Last 6 months</p>
          </div>
          {chart?.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={chart} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill:"#f8fafc" }} />
                <Bar dataKey="revenue" name="Revenue" fill="#1a56db" radius={[6,6,0,0]} />
                <Bar dataKey="expense" name="Expense" fill="#f87171" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height:"210px", display:"flex", alignItems:"center", justifyContent:"center", color:"#cbd5e1", fontSize:"14px" }}>
              📊 No data yet — add fees to see chart
            </div>
          )}
        </div>

        {/* Summary panel */}
        <div style={{ background:"#fff", borderRadius:"16px", padding:"24px", border:"1px solid #f1f5f9", boxShadow:"0 1px 4px rgba(0,0,0,0.05)", display:"flex", flexDirection:"column", gap:"0" }}>
          <h3 style={{ fontSize:"15px", fontWeight:700, color:"#0f172a", marginBottom:"20px" }}>This Month</h3>

          {[
            { label:"Revenue",  value:`₹${(d.fees?.collectedThisMonth||0).toLocaleString()}`,  color:"#1a56db" },
            { label:"Expenses", value:`₹${(d.expenses?.thisMonth||0).toLocaleString()}`,        color:"#ef4444" },
            { label:"Profit",   value:`₹${profit.toLocaleString()}`,                            color: profit>=0?"#10b981":"#ef4444" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 0", borderBottom:"1px solid #f8fafc" }}>
              <p style={{ fontSize:"13px", color:"#64748b" }}>{label}</p>
              <p style={{ fontSize:"15px", fontWeight:700, color }}>{value}</p>
            </div>
          ))}

          {/* Attendance meter */}
          <div style={{ marginTop:"20px", background: attPct>=80?"#f0fdf4":attPct>=60?"#fffbeb":"#fef2f2", borderRadius:"12px", padding:"16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"8px" }}>
              <p style={{ fontSize:"12px", fontWeight:600, color:"#374151" }}>Attendance Rate</p>
              <p style={{ fontSize:"14px", fontWeight:800, color: attPct>=80?"#10b981":attPct>=60?"#f59e0b":"#ef4444" }}>{attPct}%</p>
            </div>
            <div style={{ background:"rgba(0,0,0,0.08)", borderRadius:"99px", height:"6px" }}>
              <div style={{ width:`${attPct}%`, height:"6px", borderRadius:"99px", background: attPct>=80?"#10b981":attPct>=60?"#f59e0b":"#ef4444", transition:"width 0.6s ease" }} />
            </div>
            <p style={{ fontSize:"11px", color:"#64748b", marginTop:"8px" }}>
              {attPct>=80 ? "✅ Excellent!" : attPct>=60 ? "⚠️ Needs attention" : "❌ Send alerts now"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
