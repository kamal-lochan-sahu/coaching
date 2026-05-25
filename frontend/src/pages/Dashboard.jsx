import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import api from "../services/api";
import Loader from "../components/ui/Loader";
import { useAuthStore } from "../store/authStore";
import { useState, useEffect } from "react";

const Card = ({ label, value, sub, emoji, color="#1a56db", light="#eff6ff" }) => (
  <div style={{ background:"#fff", borderRadius:"16px", padding:"18px", border:"1px solid #f1f5f9", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"10px" }}>
      <p style={{ fontSize:"11px", fontWeight:600, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.5px" }}>{label}</p>
      <div style={{ width:"34px", height:"34px", background:light, borderRadius:"10px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", flexShrink:0 }}>{emoji}</div>
    </div>
    <p style={{ fontSize:"22px", fontWeight:800, color:"#0f172a", lineHeight:1 }}>{value}</p>
    {sub && <p style={{ fontSize:"11px", color:"#94a3b8", marginTop:"4px" }}>{sub}</p>}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"10px", padding:"10px 14px", boxShadow:"0 4px 12px rgba(0,0,0,0.08)", fontSize:"12px" }}>
      <p style={{ fontWeight:700, color:"#374151", marginBottom:"6px" }}>{label}</p>
      {payload.map(p => <p key={p.name} style={{ color:p.color, margin:"2px 0" }}>{p.name}: ₹{p.value?.toLocaleString()}</p>)}
    </div>
  );
};

export default function Dashboard() {
  const user = useAuthStore(s => s.user);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  const { data, isLoading } = useQuery({ queryKey:["dashboard"], queryFn:()=>api.get("/analytics/dashboard").then(r=>r.data.data) });
  const { data:chart=[]  } = useQuery({ queryKey:["revenue-chart"], queryFn:()=>api.get("/analytics/revenue").then(r=>r.data.data) });

  if (isLoading) return <Loader text="Loading dashboard..." />;
  const d = data || {};
  const attPct    = d.attendance?.today?.percentage || 0;
  const attColor  = attPct>=80?"#16a34a":attPct>=60?"#f59e0b":"#ef4444";
  const hour      = new Date().getHours();
  const greeting  = hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
  const profit    = (d.fees?.collectedThisMonth||0) - (d.expenses?.thisMonth||0);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <p style={{ fontSize:"12px", color:"#94a3b8" }}>{greeting} 👋</p>
          <h1 style={{ fontSize: isMobile?"20px":"24px", fontWeight:800, color:"#0f172a" }}>{user?.name}</h1>
          <p style={{ fontSize:"12px", color:"#94a3b8", marginTop:"2px" }}>
            {new Date().toLocaleDateString("en-IN",{ weekday:"long", day:"numeric", month:"short" })}
          </p>
        </div>
        {!isMobile && (
          <div style={{ background:"linear-gradient(135deg,#1a56db,#1e3a8a)", padding:"10px 18px", borderRadius:"12px", display:"flex", alignItems:"center", gap:"10px" }}>
            <span style={{ fontSize:"18px" }}>🎓</span>
            <div>
              <p style={{ color:"rgba(255,255,255,0.7)", fontSize:"11px" }}>Institute</p>
              <p style={{ color:"#fff", fontWeight:700, fontSize:"13px" }}>{user?.branding?.instituteName}</p>
            </div>
          </div>
        )}
      </div>

      {/* Primary KPIs */}
      <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr 1fr":"repeat(4,1fr)", gap:"12px" }}>
        <Card label="Total Students"     value={d.students?.total||0}      sub={`${d.students?.active||0} active`}                              emoji="👥" color="#1a56db" light="#eff6ff" />
        <Card label="Today Attendance"   value={`${attPct}%`}              sub={`${d.attendance?.today?.present||0}/${d.attendance?.today?.total||0}`} emoji="📋" color={attColor} light={attPct>=80?"#f0fdf4":"#fef2f2"} />
        <Card label="Fee Collected"      value={`₹${(d.fees?.collectedToday||0).toLocaleString()}`} sub={`₹${(d.fees?.collectedThisMonth||0).toLocaleString()} this month`} emoji="💰" color="#f59e0b" light="#fffbeb" />
        <Card label="Pending Fees"       value={`₹${(d.fees?.totalPending||0).toLocaleString()}`}   sub="Outstanding"                           emoji="⚠️" color="#ef4444" light="#fef2f2" />
      </div>

      {/* Secondary KPIs */}
      <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr 1fr 1fr":"repeat(3,1fr)", gap:"12px" }}>
        <Card label="Batches"    value={d.batches?.total||0}                                    emoji="📚" light="#f5f3ff" />
        <Card label="Enquiries"  value={d.enquiries?.thisWeek||0}                               emoji="💬" light="#ecfeff" />
        <Card label="Expenses"   value={`₹${(d.expenses?.thisMonth||0).toLocaleString()}`}     emoji="📉" light="#fff1f2" />
      </div>

      {/* Chart */}
      <div style={{ background:"#fff", borderRadius:"16px", padding:"20px", border:"1px solid #f1f5f9", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"16px" }}>
          <div>
            <h3 style={{ fontSize:"15px", fontWeight:700, color:"#0f172a" }}>Revenue vs Expenses</h3>
            <p style={{ fontSize:"11px", color:"#94a3b8", marginTop:"2px" }}>Last 6 months</p>
          </div>
          <div style={{ textAlign:"right" }}>
            <p style={{ fontSize:"12px", color:"#64748b" }}>Net Profit</p>
            <p style={{ fontSize:"16px", fontWeight:800, color:profit>=0?"#16a34a":"#ef4444" }}>₹{profit.toLocaleString()}</p>
          </div>
        </div>
        {chart.length > 0 ? (
          <ResponsiveContainer width="100%" height={isMobile?180:220}>
            <BarChart data={chart} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize:10, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:10, fill:"#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill:"#f8fafc" }} />
              <Bar dataKey="revenue" name="Revenue" fill="#1a56db" radius={[5,5,0,0]} />
              <Bar dataKey="expense" name="Expense" fill="#f87171" radius={[5,5,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height:"180px", display:"flex", alignItems:"center", justifyContent:"center", color:"#cbd5e1", fontSize:"14px" }}>
            📊 Add fees & expenses to see chart
          </div>
        )}
      </div>

      {/* Attendance meter */}
      <div style={{ background: attPct>=80?"#f0fdf4":attPct>=60?"#fffbeb":"#fef2f2", borderRadius:"16px", padding:"18px", border:`1px solid ${attPct>=80?"#bbf7d0":attPct>=60?"#fde68a":"#fecaca"}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"10px" }}>
          <p style={{ fontWeight:600, color:"#374151", fontSize:"14px" }}>📋 Today Attendance Rate</p>
          <p style={{ fontWeight:800, fontSize:"18px", color:attColor }}>{attPct}%</p>
        </div>
        <div style={{ background:"rgba(0,0,0,0.08)", borderRadius:"99px", height:"8px" }}>
          <div style={{ width:`${attPct}%`, height:"8px", borderRadius:"99px", background:attColor, transition:"width 0.6s ease" }} />
        </div>
        <p style={{ fontSize:"12px", color:"#64748b", marginTop:"8px" }}>
          {attPct>=80?"✅ Excellent attendance!":attPct>=60?"⚠️ Needs improvement — remind students":"❌ Critical — send WhatsApp alerts now"}
        </p>
      </div>
    </div>
  );
}
