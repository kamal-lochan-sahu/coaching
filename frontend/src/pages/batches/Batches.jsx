import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";

const s = {
  page:    { display:"flex", flexDirection:"column", gap:"24px" },
  header:  { display:"flex", alignItems:"center", justifyContent:"space-between" },
  h1:      { fontSize:"24px", fontWeight:800, color:"#0f172a" },
  sub:     { fontSize:"13px", color:"#94a3b8", marginTop:"2px" },
  btn:     { padding:"10px 20px", background:"#1a56db", color:"#fff", border:"none", borderRadius:"10px", fontSize:"13px", fontWeight:600, cursor:"pointer" },
  grid:    { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"16px" },
  card:    { background:"#fff", borderRadius:"16px", border:"1px solid #f1f5f9", padding:"22px", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" },
  cardTop: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"16px" },
  tag:     { display:"inline-block", padding:"3px 10px", borderRadius:"99px", fontSize:"11px", fontWeight:600, background:"#eff6ff", color:"#1a56db" },
  row:     { display:"flex", justifyContent:"space-between", fontSize:"12px", color:"#64748b", marginBottom:"6px" },
  val:     { fontWeight:600, color:"#0f172a" },
  prog:    { background:"#f1f5f9", borderRadius:"99px", height:"6px", marginTop:"12px" },
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" },
  modal:   { background:"#fff", borderRadius:"20px", padding:"32px", width:"100%", maxWidth:"480px", boxShadow:"0 20px 60px rgba(0,0,0,0.15)" },
  label:   { display:"block", fontSize:"13px", fontWeight:600, color:"#374151", marginBottom:"6px" },
  input:   { width:"100%", padding:"10px 14px", border:"1.5px solid #e2e8f0", borderRadius:"10px", fontSize:"13px", outline:"none", boxSizing:"border-box", color:"#0f172a" },
};

export default function Batches() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name:"", branchId:"", subjects:"", startTime:"", endTime:"", days:[], capacity:30, amount:"", frequency:"monthly", dueDate:5 });

  const { data: batches=[], isLoading } = useQuery({ queryKey:["batches"], queryFn:()=>api.get("/batches").then(r=>r.data.data) });
  const { data: branches=[] }           = useQuery({ queryKey:["branches"], queryFn:()=>api.get("/branches").then(r=>r.data.data) });

  const create = useMutation({
    mutationFn: (d)=>api.post("/batches",d),
    onSuccess: ()=>{ qc.invalidateQueries(["batches"]); toast.success("Batch created!"); setShowModal(false); setForm({ name:"",branchId:"",subjects:"",startTime:"",endTime:"",days:[],capacity:30,amount:"",frequency:"monthly",dueDate:5 }); },
    onError: (e)=>toast.error(e.response?.data?.message||"Failed"),
  });

  const f = k=>({ value:form[k], onChange:e=>setForm({...form,[k]:e.target.value}) });
  const toggleDay = d => setForm({...form, days: form.days.includes(d)?form.days.filter(x=>x!==d):[...form.days,d]});
  const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  const handleCreate = () => {
    if (!form.name||!form.branchId||!form.amount) return toast.error("Name, branch and fee required");
    create.mutate({ ...form, subjects: form.subjects.split(",").map(s=>s.trim()).filter(Boolean), timing:{ days:form.days, startTime:form.startTime, endTime:form.endTime }, feeStructure:{ amount:Number(form.amount), frequency:form.frequency, dueDate:Number(form.dueDate) } });
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div><h1 style={s.h1}>Batches</h1><p style={s.sub}>{batches.length} active batches</p></div>
        <button style={s.btn} onClick={()=>setShowModal(true)}>+ New Batch</button>
      </div>

      {isLoading ? <p style={{color:"#94a3b8"}}>Loading...</p> : (
        <div style={s.grid}>
          {batches.map(b=>(
            <div key={b._id} style={s.card}>
              <div style={s.cardTop}>
                <div>
                  <p style={{fontWeight:700,color:"#0f172a",fontSize:"15px"}}>{b.name}</p>
                  <p style={{fontSize:"12px",color:"#94a3b8",marginTop:"2px"}}>{b.timing?.days?.join(", ")||"—"} · {b.timing?.startTime||""} - {b.timing?.endTime||""}</p>
                </div>
                <span style={s.tag}>{b.feeStructure?.frequency||"monthly"}</span>
              </div>
              <div style={s.row}><span>Subjects</span><span style={s.val}>{b.subjects?.join(", ")||"—"}</span></div>
              <div style={s.row}><span>Fee</span><span style={s.val}>₹{b.feeStructure?.amount?.toLocaleString()}</span></div>
              <div style={s.row}><span>Capacity</span><span style={s.val}>{b.enrolled}/{b.capacity}</span></div>
              <div style={s.prog}>
                <div style={{width:`${Math.min((b.enrolled/b.capacity)*100,100)}%`,height:"6px",background:"#1a56db",borderRadius:"99px"}} />
              </div>
              <p style={{fontSize:"11px",color:"#94a3b8",marginTop:"6px"}}>{b.capacity-b.enrolled} seats available</p>
            </div>
          ))}
          {batches.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:"60px",color:"#94a3b8"}}>📚 No batches yet. Create your first batch!</div>}
        </div>
      )}

      {showModal&&(
        <div style={s.overlay} onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div style={s.modal}>
            <h2 style={{fontSize:"18px",fontWeight:800,color:"#0f172a",marginBottom:"24px"}}>Create New Batch</h2>
            <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
              <div><label style={s.label}>Batch Name *</label><input style={s.input} placeholder="e.g. Class 10 - Morning" {...f("name")} /></div>
              <div><label style={s.label}>Branch *</label>
                <select style={s.input} {...f("branchId")}>
                  <option value="">Select Branch</option>
                  {branches.map(b=><option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>
              <div><label style={s.label}>Subjects (comma separated)</label><input style={s.input} placeholder="Math, Science, English" {...f("subjects")} /></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><label style={s.label}>Start Time</label><input style={s.input} type="time" {...f("startTime")} /></div>
                <div><label style={s.label}>End Time</label><input style={s.input} type="time" {...f("endTime")} /></div>
              </div>
              <div>
                <label style={s.label}>Days</label>
                <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                  {DAYS.map(d=>(
                    <button key={d} type="button" onClick={()=>toggleDay(d)}
                      style={{padding:"6px 12px",borderRadius:"8px",border:"1.5px solid",fontSize:"12px",fontWeight:600,cursor:"pointer",
                        borderColor:form.days.includes(d)?"#1a56db":"#e2e8f0",
                        background:form.days.includes(d)?"#eff6ff":"#fff",
                        color:form.days.includes(d)?"#1a56db":"#64748b"}}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><label style={s.label}>Monthly Fee (₹) *</label><input style={s.input} type="number" placeholder="2000" {...f("amount")} /></div>
                <div><label style={s.label}>Capacity</label><input style={s.input} type="number" placeholder="30" {...f("capacity")} /></div>
              </div>
            </div>
            <div style={{display:"flex",gap:"12px",marginTop:"24px"}}>
              <button onClick={()=>setShowModal(false)} style={{flex:1,padding:"11px",border:"1.5px solid #e2e8f0",borderRadius:"10px",cursor:"pointer",background:"#fff",color:"#64748b",fontWeight:600}}>Cancel</button>
              <button onClick={handleCreate} disabled={create.isPending} style={{flex:1,padding:"11px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",cursor:"pointer",fontWeight:700}}>
                {create.isPending?"Creating...":"Create Batch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
