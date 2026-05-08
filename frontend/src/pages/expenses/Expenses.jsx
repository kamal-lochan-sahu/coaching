import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";

const CATS = { rent:"🏠", salary:"👤", electricity:"⚡", stationery:"📝", maintenance:"🔧", marketing:"📣", equipment:"💻", other:"📦" };
const CAT_COLORS = { rent:"#7c3aed",salary:"#1a56db",electricity:"#d97706",stationery:"#0891b2",maintenance:"#16a34a",marketing:"#db2777",equipment:"#dc2626",other:"#64748b" };

export default function Expenses() {
  const qc = useQueryClient();
  const [showAdd,  setShowAdd]  = useState(false);
  const [month,    setMonth]    = useState(new Date().toISOString().slice(0,7));
  const [form, setForm] = useState({ category:"rent",amount:"",description:"",date:new Date().toISOString().slice(0,10),branchId:"" });

  const { data:expenses=[], isLoading } = useQuery({
    queryKey:["expenses",month],
    queryFn:()=>api.get(`/expenses?month=${month}`).then(r=>r.data.data.expenses),
  });
  const { data:report }   = useQuery({ queryKey:["expense-report",month], queryFn:()=>api.get(`/expenses/report?month=${month}`).then(r=>r.data.data) });
  const { data:branches=[] }= useQuery({ queryKey:["branches"], queryFn:()=>api.get("/branches").then(r=>r.data.data) });

  const add = useMutation({
    mutationFn:(d)=>api.post("/expenses",d),
    onSuccess:()=>{ qc.invalidateQueries(["expenses"]); qc.invalidateQueries(["expense-report"]); toast.success("Expense recorded!"); setShowAdd(false); setForm({ category:"rent",amount:"",description:"",date:new Date().toISOString().slice(0,10),branchId:"" }); },
    onError:(e)=>toast.error(e.response?.data?.message||"Failed"),
  });

  const total = expenses.reduce((s,e)=>s+e.amount,0);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"24px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div><h1 style={{fontSize:"24px",fontWeight:800,color:"#0f172a"}}>Expenses</h1>
          <p style={{fontSize:"13px",color:"#94a3b8",marginTop:"2px"}}>Track all institute expenses</p></div>
        <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
          <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
            style={{padding:"9px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}} />
          <button onClick={()=>setShowAdd(true)}
            style={{padding:"10px 20px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",fontSize:"13px",fontWeight:600,cursor:"pointer"}}>
            + Add Expense
          </button>
        </div>
      </div>

      {/* Summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"16px"}}>
        <div style={{gridColumn:"1",background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"20px",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
          <p style={{fontSize:"12px",fontWeight:600,color:"#94a3b8",textTransform:"uppercase",marginBottom:"8px"}}>Total This Month</p>
          <p style={{fontSize:"28px",fontWeight:800,color:"#dc2626"}}>₹{total.toLocaleString()}</p>
        </div>
        {(report?.byCategory||[]).slice(0,3).map(c=>(
          <div key={c._id} style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"20px",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
              <p style={{fontSize:"12px",fontWeight:600,color:"#94a3b8",textTransform:"capitalize"}}>{c._id}</p>
              <span style={{fontSize:"18px"}}>{CATS[c._id]||"📦"}</span>
            </div>
            <p style={{fontSize:"20px",fontWeight:800,color:CAT_COLORS[c._id]||"#64748b"}}>₹{c.total.toLocaleString()}</p>
            <p style={{fontSize:"11px",color:"#94a3b8",marginTop:"2px"}}>{c.count} entries</p>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      {report?.byCategory?.length>0&&(
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"24px"}}>
          <h3 style={{fontWeight:700,color:"#0f172a",marginBottom:"16px"}}>Category Breakdown</h3>
          <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
            {report.byCategory.map(c=>{
              const pct = Math.round((c.total/report.grandTotal)*100);
              return (
                <div key={c._id}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
                    <span style={{fontSize:"13px",color:"#374151",textTransform:"capitalize"}}>{CATS[c._id]||"📦"} {c._id}</span>
                    <span style={{fontSize:"13px",fontWeight:700,color:CAT_COLORS[c._id]||"#64748b"}}>₹{c.total.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div style={{background:"#f1f5f9",borderRadius:"99px",height:"6px"}}>
                    <div style={{width:`${pct}%`,height:"6px",borderRadius:"99px",background:CAT_COLORS[c._id]||"#64748b"}} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",overflow:"hidden"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid #f8fafc"}}>
          <p style={{fontWeight:700,color:"#0f172a"}}>{expenses.length} Expenses · ₹{total.toLocaleString()} total</p>
        </div>
        {isLoading?<div style={{padding:"40px",textAlign:"center",color:"#94a3b8"}}>Loading...</div>:
        expenses.length===0?<div style={{padding:"60px",textAlign:"center",color:"#94a3b8"}}>📦 No expenses this month</div>:(
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:"13px"}}>
            <thead><tr style={{background:"#f8fafc"}}>
              {["Date","Category","Description","Amount"].map(h=>(
                <th key={h} style={{textAlign:"left",padding:"12px 16px",color:"#64748b",fontWeight:600,fontSize:"12px"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {expenses.map((e,i)=>(
                <tr key={e._id} style={{borderTop:"1px solid #f8fafc",background:i%2===0?"#fff":"#fafafa"}}>
                  <td style={{padding:"13px 16px",color:"#94a3b8"}}>{new Date(e.date).toLocaleDateString("en-IN")}</td>
                  <td style={{padding:"13px 16px"}}>
                    <span style={{display:"inline-flex",alignItems:"center",gap:"6px",padding:"4px 10px",borderRadius:"99px",fontSize:"12px",fontWeight:600,background:`${CAT_COLORS[e.category]}15`,color:CAT_COLORS[e.category]||"#64748b",textTransform:"capitalize"}}>
                      {CATS[e.category]||"📦"} {e.category}
                    </span>
                  </td>
                  <td style={{padding:"13px 16px",color:"#64748b"}}>{e.description||"—"}</td>
                  <td style={{padding:"13px 16px",fontWeight:700,color:"#dc2626"}}>₹{e.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Modal */}
      {showAdd&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}
          onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
          <div style={{background:"#fff",borderRadius:"20px",padding:"32px",width:"100%",maxWidth:"440px",boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}}>
            <h2 style={{fontSize:"18px",fontWeight:800,color:"#0f172a",marginBottom:"24px"}}>Add Expense</h2>
            <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
              <div><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"8px"}}>CATEGORY</label>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"8px"}}>
                  {Object.entries(CATS).map(([cat,emoji])=>(
                    <button key={cat} onClick={()=>setForm({...form,category:cat})} type="button"
                      style={{padding:"10px 6px",borderRadius:"10px",border:"1.5px solid",cursor:"pointer",textAlign:"center",
                        borderColor:form.category===cat?(CAT_COLORS[cat]||"#1a56db"):"#e2e8f0",
                        background:form.category===cat?`${CAT_COLORS[cat]}15`:"#fff"}}>
                      <div style={{fontSize:"20px",marginBottom:"2px"}}>{emoji}</div>
                      <div style={{fontSize:"10px",fontWeight:600,color:form.category===cat?(CAT_COLORS[cat]||"#1a56db"):"#94a3b8",textTransform:"capitalize"}}>{cat}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>AMOUNT (₹) *</label>
                  <input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="5000"
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} /></div>
                <div><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>DATE</label>
                  <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} /></div>
              </div>
              <div><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>DESCRIPTION</label>
                <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="May month rent..."
                  style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} /></div>
              <div><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>BRANCH</label>
                <select value={form.branchId} onChange={e=>setForm({...form,branchId:e.target.value})}
                  style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}}>
                  <option value="">Select branch...</option>
                  {branches.map(b=><option key={b._id} value={b._id}>{b.name}</option>)}
                </select></div>
            </div>
            <div style={{display:"flex",gap:"12px",marginTop:"24px"}}>
              <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:"11px",border:"1.5px solid #e2e8f0",borderRadius:"10px",cursor:"pointer",background:"#fff",color:"#64748b",fontWeight:600}}>Cancel</button>
              <button onClick={()=>add.mutate({...form,amount:Number(form.amount)})} disabled={add.isPending}
                style={{flex:1,padding:"11px",background:"#dc2626",color:"#fff",border:"none",borderRadius:"10px",cursor:"pointer",fontWeight:700}}>
                {add.isPending?"Saving...":"Record Expense"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
