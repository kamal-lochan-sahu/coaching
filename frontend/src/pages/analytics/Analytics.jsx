import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import api from "../../services/api";
import Loader from "../../components/ui/Loader";

const COLORS = ["#1a56db","#16a34a","#d97706","#dc2626","#7c3aed","#0891b2","#db2777","#64748b"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null;
  return (
    <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:"10px",padding:"10px 14px",boxShadow:"0 4px 12px rgba(0,0,0,0.08)",fontSize:"12px"}}>
      <p style={{fontWeight:700,color:"#374151",marginBottom:"6px"}}>{label}</p>
      {payload.map(p=><p key={p.name} style={{color:p.color,margin:"2px 0"}}>{p.name}: {typeof p.value==="number"&&p.value>100?`₹${p.value.toLocaleString()}`:p.value}</p>)}
    </div>
  );
};

export default function Analytics() {
  const { data:dashboard } = useQuery({ queryKey:["dashboard"],    queryFn:()=>api.get("/analytics/dashboard").then(r=>r.data.data) });
  const { data:revenue=[]}  = useQuery({ queryKey:["revenue-chart"],queryFn:()=>api.get("/analytics/revenue").then(r=>r.data.data) });
  const { data:enqData=[]}  = useQuery({ queryKey:["enq-conversion"],queryFn:()=>api.get("/analytics/enquiry-conversion").then(r=>r.data.data) });

  const d = dashboard||{};
  const enqStats = enqData?.stats||[];
  const convRate = enqData?.conversionRate||0;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"24px"}}>
      <div><h1 style={{fontSize:"24px",fontWeight:800,color:"#0f172a"}}>Analytics & Reports</h1>
        <p style={{fontSize:"13px",color:"#94a3b8",marginTop:"2px"}}>Complete overview of your institute</p></div>

      {/* KPI Summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"16px"}}>
        {[
          {label:"Total Students",  val:d.students?.total||0,         emoji:"👥", color:"#1a56db", bg:"#eff6ff"},
          {label:"Monthly Revenue", val:`₹${(d.fees?.collectedThisMonth||0).toLocaleString()}`, emoji:"💰", color:"#16a34a", bg:"#f0fdf4"},
          {label:"Monthly Expense", val:`₹${(d.expenses?.thisMonth||0).toLocaleString()}`,      emoji:"📉", color:"#dc2626", bg:"#fef2f2"},
          {label:"Net Profit",      val:`₹${((d.fees?.collectedThisMonth||0)-(d.expenses?.thisMonth||0)).toLocaleString()}`, emoji:"📈", color:"#7c3aed", bg:"#f5f3ff"},
        ].map(({label,val,emoji,color,bg})=>(
          <div key={label} style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"20px",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
              <p style={{fontSize:"11px",fontWeight:600,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.5px"}}>{label}</p>
              <div style={{width:"36px",height:"36px",background:bg,borderRadius:"10px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px"}}>{emoji}</div>
            </div>
            <p style={{fontSize:"24px",fontWeight:800,color}}>{val}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:"20px"}}>
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"24px"}}>
          <h3 style={{fontWeight:700,color:"#0f172a",marginBottom:"4px"}}>Revenue vs Expenses</h3>
          <p style={{fontSize:"12px",color:"#94a3b8",marginBottom:"20px"}}>Last 6 months</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenue} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
              <XAxis dataKey="month" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{fill:"#f8fafc"}} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#1a56db" radius={[6,6,0,0]} />
              <Bar dataKey="expense" name="Expense" fill="#f87171" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Enquiry Pie */}
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"24px"}}>
          <h3 style={{fontWeight:700,color:"#0f172a",marginBottom:"4px"}}>Enquiry Funnel</h3>
          <p style={{fontSize:"12px",color:"#94a3b8",marginBottom:"16px"}}>Conversion rate: <strong style={{color:"#16a34a"}}>{convRate}%</strong></p>
          {enqStats.length>0?(
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={enqStats} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={70} label={({_id,count})=>`${_id}: ${count}`} labelLine={false} fontSize={11}>
                    {enqStats.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div style={{display:"flex",flexDirection:"column",gap:"6px",marginTop:"8px"}}>
                {enqStats.map((s,i)=>(
                  <div key={s._id} style={{display:"flex",justifyContent:"space-between",fontSize:"12px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                      <div style={{width:"10px",height:"10px",borderRadius:"50%",background:COLORS[i%COLORS.length]}} />
                      <span style={{color:"#64748b",textTransform:"capitalize"}}>{s._id}</span>
                    </div>
                    <span style={{fontWeight:700,color:"#0f172a"}}>{s.count}</span>
                  </div>
                ))}
              </div>
            </>
          ):<p style={{color:"#94a3b8",fontSize:"13px",textAlign:"center",marginTop:"40px"}}>No enquiry data</p>}
        </div>
      </div>

      {/* Profit Line Chart */}
      <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"24px"}}>
        <h3 style={{fontWeight:700,color:"#0f172a",marginBottom:"4px"}}>Monthly Profit Trend</h3>
        <p style={{fontSize:"12px",color:"#94a3b8",marginBottom:"20px"}}>Revenue minus expenses per month</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={revenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
            <XAxis dataKey="month" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false} />
            <YAxis tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="profit" name="Profit" stroke="#7c3aed" strokeWidth={2.5} dot={{fill:"#7c3aed",r:4}} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
