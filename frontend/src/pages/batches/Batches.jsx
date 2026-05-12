import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const emptyForm = { name:"", branchId:"", subjects:"", startTime:"", endTime:"", days:[], capacity:30, amount:"", frequency:"monthly", dueDate:5, description:"" };

export default function Batches() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(emptyForm);

  const { data:batches=[], isLoading } = useQuery({ queryKey:["batches"], queryFn:()=>api.get("/batches?isActive=all").then(r=>r.data.data) });
  const { data:branches=[] }           = useQuery({ queryKey:["branches"], queryFn:()=>api.get("/branches").then(r=>r.data.data) });

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (b) => {
    setEditing(b);
    setForm({
      name:        b.name,
      branchId:    b.branchId,
      subjects:    b.subjects?.join(", ")||"",
      startTime:   b.timing?.startTime||"",
      endTime:     b.timing?.endTime||"",
      days:        b.timing?.days||[],
      capacity:    b.capacity,
      amount:      b.feeStructure?.amount||"",
      frequency:   b.feeStructure?.frequency||"monthly",
      dueDate:     b.feeStructure?.dueDate||5,
      description: b.description||"",
    });
    setShowModal(true);
  };

  const createMutation = useMutation({
    mutationFn: (d)=>api.post("/batches",d),
    onSuccess: ()=>{ qc.invalidateQueries(["batches"]); toast.success("Batch created!"); setShowModal(false); },
    onError:   (e)=>toast.error(e.response?.data?.message||"Failed"),
  });
  const updateMutation = useMutation({
    mutationFn: ({id,...d})=>api.put(`/batches/${id}`,d),
    onSuccess: ()=>{ qc.invalidateQueries(["batches"]); toast.success("Batch updated!"); setShowModal(false); },
    onError:   (e)=>toast.error(e.response?.data?.message||"Failed"),
  });
  const deleteMutation = useMutation({
    mutationFn: (id)=>api.delete(`/batches/${id}`),
    onSuccess: ()=>{ qc.invalidateQueries(["batches"]); toast.success("Batch deactivated!"); },
    onError:   (e)=>toast.error(e.response?.data?.message||"Failed"),
  });

  const toggleDay = d => setForm({...form, days: form.days.includes(d)?form.days.filter(x=>x!==d):[...form.days,d]});

  const handleSubmit = () => {
    if (!form.name||!form.branchId||!form.amount) return toast.error("Name, branch and fee required");
    const payload = {
      ...form,
      subjects:     form.subjects.split(",").map(s=>s.trim()).filter(Boolean),
      timing:       { days:form.days, startTime:form.startTime, endTime:form.endTime },
      feeStructure: { amount:Number(form.amount), frequency:form.frequency, dueDate:Number(form.dueDate) },
      capacity:     Number(form.capacity),
    };
    if (editing) updateMutation.mutate({ id:editing._id, ...payload });
    else         createMutation.mutate(payload);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"24px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <h1 style={{fontSize:"24px",fontWeight:800,color:"#0f172a"}}>Batches</h1>
          <p style={{fontSize:"13px",color:"#94a3b8",marginTop:"2px"}}>{batches.filter(b=>b.isActive).length} active batches</p>
        </div>
        <button onClick={openAdd}
          style={{padding:"10px 20px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",fontSize:"13px",fontWeight:600,cursor:"pointer"}}>
          + New Batch
        </button>
      </div>

      {isLoading ? <p style={{color:"#94a3b8",textAlign:"center",padding:"40px"}}>Loading...</p> : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"16px"}}>
          {batches.map(b=>(
            <div key={b._id} style={{background:"#fff",borderRadius:"16px",border:`1px solid ${b.isActive?"#f1f5f9":"#fee2e2"}`,padding:"22px",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",opacity:b.isActive?1:0.6}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"14px"}}>
                <div style={{flex:1}}>
                  <p style={{fontWeight:700,color:"#0f172a",fontSize:"15px"}}>{b.name}</p>
                  <p style={{fontSize:"12px",color:"#94a3b8",marginTop:"2px"}}>{b.timing?.days?.join(", ")||"—"} · {b.timing?.startTime||""}{b.timing?.startTime?" - ":""}{b.timing?.endTime||""}</p>
                </div>
                <span style={{padding:"3px 10px",borderRadius:"99px",fontSize:"11px",fontWeight:600,background:b.isActive?"#f0fdf4":"#fef2f2",color:b.isActive?"#16a34a":"#dc2626",flexShrink:0,marginLeft:"8px"}}>
                  {b.isActive?"Active":"Inactive"}
                </span>
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:"6px",fontSize:"12px",color:"#64748b",marginBottom:"14px"}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span>Subjects</span><span style={{fontWeight:600,color:"#0f172a"}}>{b.subjects?.join(", ")||"—"}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span>Monthly Fee</span><span style={{fontWeight:700,color:"#1a56db"}}>₹{b.feeStructure?.amount?.toLocaleString()}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span>Capacity</span><span style={{fontWeight:600,color:"#0f172a"}}>{b.enrolled}/{b.capacity} enrolled</span>
                </div>
              </div>

              {/* Capacity bar */}
              <div style={{background:"#f1f5f9",borderRadius:"99px",height:"6px",marginBottom:"14px"}}>
                <div style={{width:`${Math.min(((b.enrolled||0)/b.capacity)*100,100)}%`,height:"6px",background:"#1a56db",borderRadius:"99px"}} />
              </div>

              <div style={{display:"flex",gap:"8px"}}>
                <button onClick={()=>openEdit(b)}
                  style={{flex:1,padding:"8px",background:"#eff6ff",color:"#1a56db",border:"none",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:600}}>
                  ✏️ Edit
                </button>
                {b.isActive&&(
                  <button onClick={()=>{ if(window.confirm(`Deactivate "${b.name}"?`)) deleteMutation.mutate(b._id); }}
                    style={{flex:1,padding:"8px",background:"#fef2f2",color:"#dc2626",border:"none",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:600}}>
                    🗑️ Delete
                  </button>
                )}
              </div>
            </div>
          ))}
          {batches.length===0&&(
            <div style={{gridColumn:"1/-1",padding:"60px",textAlign:"center",color:"#94a3b8",background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9"}}>
              📚 No batches yet. Create your first batch!
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",overflowY:"auto"}}
          onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div style={{background:"#fff",borderRadius:"20px",padding:"32px",width:"100%",maxWidth:"520px",boxShadow:"0 20px 60px rgba(0,0,0,0.15)",maxHeight:"90vh",overflowY:"auto"}}>
            <h2 style={{fontSize:"18px",fontWeight:800,color:"#0f172a",marginBottom:"24px"}}>
              {editing ? "Edit Batch" : "Create New Batch"}
            </h2>
            <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
              <div>
                <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>BATCH NAME *</label>
                <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Class 10 - Morning"
                  style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
              </div>
              <div>
                <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>BRANCH *</label>
                <select value={form.branchId} onChange={e=>setForm({...form,branchId:e.target.value})}
                  style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}}>
                  <option value="">Select Branch</option>
                  {branches.map(b=><option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>SUBJECTS (comma separated)</label>
                <input value={form.subjects} onChange={e=>setForm({...form,subjects:e.target.value})} placeholder="Math, Science, English"
                  style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div>
                  <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>START TIME</label>
                  <input type="time" value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})}
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
                </div>
                <div>
                  <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>END TIME</label>
                  <input type="time" value={form.endTime} onChange={e=>setForm({...form,endTime:e.target.value})}
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
                </div>
              </div>
              <div>
                <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"8px"}}>DAYS</label>
                <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                  {DAYS.map(d=>(
                    <button key={d} type="button" onClick={()=>toggleDay(d)}
                      style={{padding:"7px 12px",borderRadius:"8px",border:"1.5px solid",fontSize:"12px",fontWeight:600,cursor:"pointer",
                        borderColor:form.days.includes(d)?"#1a56db":"#e2e8f0",
                        background:form.days.includes(d)?"#eff6ff":"#fff",
                        color:form.days.includes(d)?"#1a56db":"#64748b"}}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div>
                  <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>MONTHLY FEE (₹) *</label>
                  <input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="2000"
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
                </div>
                <div>
                  <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>CAPACITY</label>
                  <input type="number" value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})} placeholder="30"
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div>
                  <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>FEE FREQUENCY</label>
                  <select value={form.frequency} onChange={e=>setForm({...form,frequency:e.target.value})}
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                    <option value="one-time">One Time</option>
                  </select>
                </div>
                <div>
                  <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>DUE DATE (Day of month)</label>
                  <input type="number" min="1" max="28" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})}
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:"12px",marginTop:"24px"}}>
              <button onClick={()=>setShowModal(false)}
                style={{flex:1,padding:"11px",border:"1.5px solid #e2e8f0",borderRadius:"10px",cursor:"pointer",background:"#fff",color:"#64748b",fontWeight:600}}>
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={isPending}
                style={{flex:2,padding:"11px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",cursor:"pointer",fontWeight:700}}>
                {isPending ? "Saving..." : editing ? "Save Changes" : "Create Batch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
