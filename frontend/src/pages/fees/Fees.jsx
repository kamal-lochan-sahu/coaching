import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";

const MODE_COLORS = { cash:"#16a34a", upi:"#7c3aed", cheque:"#d97706", online:"#0891b2" };

export default function Fees() {
  const qc = useQueryClient();
  const [tab,      setTab]      = useState("collect");
  const [search,   setSearch]   = useState("");
  const [found,    setFound]    = useState(null);
  const [searching,setSearching]= useState(false);
  const [form,     setForm]     = useState({ amount:"", discount:"0", paymentMode:"cash", month: new Date().toISOString().slice(0,7), note:"" });

  const { data: pending=[] } = useQuery({ queryKey:["pending-fees"], queryFn:()=>api.get("/fees/pending").then(r=>r.data.data.fees) });
  const { data: feeReport }  = useQuery({ queryKey:["fee-report"], queryFn:()=>api.get(`/fees/report?month=${new Date().toISOString().slice(0,7)}`).then(r=>r.data.data) });
  const { data: branches=[] }= useQuery({ queryKey:["branches"], queryFn:()=>api.get("/branches").then(r=>r.data.data) });

  const searchStudent = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await api.get(`/students/search?q=${search}`);
      const students = res.data.data;
      if (students.length===0) toast.error("Student not found");
      else setFound(students[0]);
    } catch { toast.error("Search failed"); }
    finally { setSearching(false); }
  };

  const collect = useMutation({
    mutationFn: (d)=>api.post("/fees/collect",d),
    onSuccess: (res)=>{
      toast.success(`Receipt ${res.data.data.receiptNumber} generated!`);
      qc.invalidateQueries(["pending-fees"]);
      qc.invalidateQueries(["fee-report"]);
      setFound(null); setSearch("");
      setForm({ amount:"",discount:"0",paymentMode:"cash",month:new Date().toISOString().slice(0,7),note:"" });
    },
    onError: (e)=>toast.error(e.response?.data?.message||"Failed"),
  });

  const handleCollect = ()=>{
    if (!found) return toast.error("Search student first");
    if (!form.amount) return toast.error("Enter amount");
    collect.mutate({
      studentId: found._id,
      batchId:   found.currentBatch?._id||found.currentBatch,
      branchId:  found.branchId||branches[0]?._id,
      amount:    Number(form.amount),
      discount:  Number(form.discount)||0,
      paymentMode: form.paymentMode,
      month:     form.month,
      note:      form.note,
    });
  };

  const TABS = [
    {id:"collect",label:"💰 Collect Fee"},
    {id:"pending",label:"⚠️ Pending"},
    {id:"report", label:"📊 Report"},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"24px"}}>
      <div><h1 style={{fontSize:"24px",fontWeight:800,color:"#0f172a"}}>Fee Management</h1>
        <p style={{fontSize:"13px",color:"#94a3b8",marginTop:"2px"}}>Collect fees, track pending, generate receipts</p>
      </div>

      {/* Summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"16px"}}>
        {[
          {label:"Collected This Month", val:`₹${(feeReport?.totalCollected||0).toLocaleString()}`, emoji:"💰", bg:"#f0fdf4", color:"#16a34a"},
          {label:"Pending Amount",       val:`₹${pending.reduce((s,f)=>s+f.finalAmount,0).toLocaleString()}`, emoji:"⚠️", bg:"#fef2f2", color:"#dc2626"},
          {label:"Pending Students",     val:pending.length, emoji:"👥", bg:"#fffbeb", color:"#d97706"},
        ].map(({label,val,emoji,bg,color})=>(
          <div key={label} style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"20px",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
              <p style={{fontSize:"12px",fontWeight:600,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.5px"}}>{label}</p>
              <div style={{width:"36px",height:"36px",background:bg,borderRadius:"10px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px"}}>{emoji}</div>
            </div>
            <p style={{fontSize:"24px",fontWeight:800,color}}>{val}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:"4px",background:"#f1f5f9",borderRadius:"12px",padding:"4px",width:"fit-content"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"8px 20px",borderRadius:"9px",border:"none",cursor:"pointer",fontSize:"13px",fontWeight:600,
              background:tab===t.id?"#fff":"transparent",color:tab===t.id?"#0f172a":"#64748b",
              boxShadow:tab===t.id?"0 1px 3px rgba(0,0,0,0.1)":"none"}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Collect Fee Tab */}
      {tab==="collect"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"}}>
          {/* Search */}
          <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"24px"}}>
            <h3 style={{fontWeight:700,color:"#0f172a",marginBottom:"16px"}}>Search Student</h3>
            <div style={{display:"flex",gap:"10px",marginBottom:"16px"}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchStudent()}
                placeholder="Name or phone number..."
                style={{flex:1,padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}} />
              <button onClick={searchStudent}
                style={{padding:"10px 18px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",fontWeight:600,cursor:"pointer",fontSize:"13px"}}>
                {searching?"...":"Search"}
              </button>
            </div>
            {found&&(
              <div style={{padding:"16px",background:"#f8fafc",borderRadius:"12px",border:"1px solid #e2e8f0"}}>
                <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"12px"}}>
                  <div style={{width:"44px",height:"44px",borderRadius:"50%",background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"#1a56db",fontSize:"18px"}}>
                    {found.name[0]}
                  </div>
                  <div>
                    <p style={{fontWeight:700,color:"#0f172a"}}>{found.name}</p>
                    <p style={{fontSize:"12px",color:"#94a3b8"}}>{found.phone} · {found.currentBatch?.name||"No batch"}</p>
                  </div>
                </div>
                <p style={{fontSize:"12px",color:"#64748b"}}>Guardian: {found.guardianName||"—"} ({found.guardianPhone||"—"})</p>
              </div>
            )}
          </div>

          {/* Fee form */}
          <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"24px"}}>
            <h3 style={{fontWeight:700,color:"#0f172a",marginBottom:"16px"}}>Fee Details</h3>
            <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div>
                  <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>AMOUNT (₹) *</label>
                  <input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="2000"
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
                </div>
                <div>
                  <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>DISCOUNT (₹)</label>
                  <input type="number" value={form.discount} onChange={e=>setForm({...form,discount:e.target.value})} placeholder="0"
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
                </div>
              </div>
              <div>
                <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"8px"}}>PAYMENT MODE</label>
                <div style={{display:"flex",gap:"8px"}}>
                  {["cash","upi","cheque","online"].map(m=>(
                    <button key={m} onClick={()=>setForm({...form,paymentMode:m})}
                      style={{flex:1,padding:"9px",borderRadius:"9px",border:"1.5px solid",fontSize:"12px",fontWeight:600,cursor:"pointer",textTransform:"capitalize",
                        borderColor:form.paymentMode===m?(MODE_COLORS[m]||"#1a56db"):"#e2e8f0",
                        background:form.paymentMode===m?"#eff6ff":"#fff",
                        color:form.paymentMode===m?(MODE_COLORS[m]||"#1a56db"):"#94a3b8"}}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div>
                  <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>MONTH</label>
                  <input type="month" value={form.month} onChange={e=>setForm({...form,month:e.target.value})}
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
                </div>
                <div>
                  <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>NET PAYABLE</label>
                  <p style={{fontSize:"22px",fontWeight:800,color:"#16a34a",paddingTop:"6px"}}>₹{(Number(form.amount||0)-Number(form.discount||0)).toLocaleString()}</p>
                </div>
              </div>
              <button onClick={handleCollect} disabled={collect.isPending}
                style={{width:"100%",padding:"13px",background:"#16a34a",color:"#fff",border:"none",borderRadius:"10px",fontWeight:700,cursor:"pointer",fontSize:"14px"}}>
                {collect.isPending?"Processing...":"💰 Collect Fee & Generate Receipt"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Tab */}
      {tab==="pending"&&(
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",overflow:"hidden"}}>
          <div style={{padding:"16px 20px",borderBottom:"1px solid #f8fafc"}}>
            <p style={{fontWeight:700,color:"#0f172a"}}>{pending.length} Pending Payments</p>
          </div>
          {pending.length===0?(
            <div style={{padding:"60px",textAlign:"center",color:"#94a3b8"}}>✅ No pending fees!</div>
          ):(
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:"13px"}}>
              <thead><tr style={{background:"#f8fafc"}}>
                {["Student","Batch","Month","Amount","Due Date"].map(h=>(
                  <th key={h} style={{textAlign:"left",padding:"12px 16px",color:"#64748b",fontWeight:600,fontSize:"12px"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {pending.map((f,i)=>(
                  <tr key={f._id} style={{borderTop:"1px solid #f8fafc",background:i%2===0?"#fff":"#fafafa"}}>
                    <td style={{padding:"12px 16px"}}>
                      <p style={{fontWeight:600,color:"#0f172a"}}>{f.studentId?.name}</p>
                      <p style={{fontSize:"11px",color:"#94a3b8"}}>{f.studentId?.guardianPhone||f.studentId?.phone}</p>
                    </td>
                    <td style={{padding:"12px 16px",color:"#64748b"}}>{f.batchId?.name||"—"}</td>
                    <td style={{padding:"12px 16px",color:"#64748b"}}>{f.month}</td>
                    <td style={{padding:"12px 16px",fontWeight:700,color:"#dc2626"}}>₹{f.finalAmount?.toLocaleString()}</td>
                    <td style={{padding:"12px 16px",color:"#94a3b8"}}>{f.dueDate?new Date(f.dueDate).toLocaleDateString("en-IN"):"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Report Tab */}
      {tab==="report"&&(
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"24px"}}>
          <h3 style={{fontWeight:700,color:"#0f172a",marginBottom:"16px"}}>This Month Summary</h3>
          {feeReport?.byPaymentMode&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"20px"}}>
              {Object.entries(feeReport.byPaymentMode).map(([mode,amt])=>(
                <div key={mode} style={{padding:"16px",borderRadius:"12px",border:"1px solid #f1f5f9",textAlign:"center"}}>
                  <p style={{fontSize:"18px",fontWeight:800,color:MODE_COLORS[mode]||"#1a56db"}}>₹{amt.toLocaleString()}</p>
                  <p style={{fontSize:"12px",color:"#64748b",textTransform:"capitalize",marginTop:"4px"}}>{mode}</p>
                </div>
              ))}
            </div>
          )}
          <div style={{padding:"20px",background:"#f0fdf4",borderRadius:"12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <p style={{fontWeight:600,color:"#15803d"}}>Total Collected This Month</p>
            <p style={{fontSize:"28px",fontWeight:800,color:"#16a34a"}}>₹{(feeReport?.totalCollected||0).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}
