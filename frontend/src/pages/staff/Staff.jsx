import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";

export default function Staff() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [showSalary, setShowSalary] = useState(null);
  const [form, setForm] = useState({ name:"",email:"",phone:"",password:"test1234",role:"teacher",designation:"",subjects:"",branchId:"",salaryAmount:"" });
  const [salaryForm, setSalaryForm] = useState({ month:new Date().getMonth()+1,year:new Date().getFullYear(),basicSalary:"",advance:"0",deductions:"0",bonus:"0",paymentMode:"bank_transfer",note:"" });

  const { data:staff=[], isLoading } = useQuery({ queryKey:["staff"], queryFn:()=>api.get("/staff").then(r=>r.data.data) });
  const { data:branches=[] }         = useQuery({ queryKey:["branches"], queryFn:()=>api.get("/branches").then(r=>r.data.data) });

  const addStaff = useMutation({
    mutationFn:(d)=>api.post("/staff",d),
    onSuccess:()=>{ qc.invalidateQueries(["staff"]); toast.success("Staff added!"); setShowModal(false); setForm({ name:"",email:"",phone:"",password:"test1234",role:"teacher",designation:"",subjects:"",branchId:"",salaryAmount:"" }); },
    onError:(e)=>toast.error(e.response?.data?.message||"Failed"),
  });
  const paySalary = useMutation({
    mutationFn:({id,...d})=>api.post(`/staff/${id}/salary`,d),
    onSuccess:()=>{ toast.success("Salary paid!"); setShowSalary(null); },
    onError:(e)=>toast.error(e.response?.data?.message||"Failed"),
  });

  const handleAdd = ()=>{
    if (!form.name||!form.email||!form.branchId) return toast.error("Name, email and branch required");
    addStaff.mutate({ ...form, subjects:form.subjects.split(",").map(s=>s.trim()).filter(Boolean), salary:{ amount:Number(form.salaryAmount)||0, paymentDay:1 } });
  };

  const ROLES = { owner:"purple", admin:"orange", teacher:"blue", receptionist:"green" };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"24px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div><h1 style={{fontSize:"24px",fontWeight:800,color:"#0f172a"}}>Staff Management</h1>
          <p style={{fontSize:"13px",color:"#94a3b8",marginTop:"2px"}}>{staff.length} staff members</p></div>
        <button onClick={()=>setShowModal(true)}
          style={{padding:"10px 20px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",fontSize:"13px",fontWeight:600,cursor:"pointer"}}>
          + Add Staff
        </button>
      </div>

      {isLoading?<p style={{color:"#94a3b8"}}>Loading...</p>:(
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"16px"}}>
          {staff.map(s=>(
            <div key={s._id} style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"22px",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
              <div style={{display:"flex",alignItems:"center",gap:"14px",marginBottom:"16px"}}>
                <div style={{width:"48px",height:"48px",borderRadius:"50%",background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#1a56db",fontSize:"20px"}}>
                  {s.userId?.name?.[0]||"?"}
                </div>
                <div style={{flex:1}}>
                  <p style={{fontWeight:700,color:"#0f172a",fontSize:"15px"}}>{s.userId?.name}</p>
                  <p style={{fontSize:"12px",color:"#94a3b8"}}>{s.designation||s.userId?.role}</p>
                </div>
                <span style={{padding:"3px 10px",borderRadius:"99px",fontSize:"11px",fontWeight:600,background:"#eff6ff",color:"#1a56db",textTransform:"capitalize"}}>
                  {s.userId?.role}
                </span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"6px",fontSize:"12px",color:"#64748b",marginBottom:"16px"}}>
                <p>📧 {s.userId?.email}</p>
                <p>📱 {s.userId?.phone||"—"}</p>
                <p>📚 {s.subjects?.join(", ")||"—"}</p>
                <p>💰 Salary: <strong style={{color:"#0f172a"}}>₹{s.salary?.amount?.toLocaleString()||"0"}</strong>/month</p>
              </div>
              <button onClick={()=>{ setShowSalary(s); setSalaryForm({...salaryForm,basicSalary:s.salary?.amount||""}); }}
                style={{width:"100%",padding:"9px",background:"#f0fdf4",color:"#16a34a",border:"1px solid #bbf7d0",borderRadius:"9px",cursor:"pointer",fontSize:"12px",fontWeight:600}}>
                💸 Pay Salary
              </button>
            </div>
          ))}
          {staff.length===0&&(
            <div style={{gridColumn:"1/-1",padding:"60px",textAlign:"center",color:"#94a3b8",background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9"}}>
              👥 No staff yet. Add your first staff member!
            </div>
          )}
        </div>
      )}

      {/* Add Staff Modal */}
      {showModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}
          onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div style={{background:"#fff",borderRadius:"20px",padding:"32px",width:"100%",maxWidth:"500px",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}}>
            <h2 style={{fontSize:"18px",fontWeight:800,color:"#0f172a",marginBottom:"24px"}}>Add Staff Member</h2>
            <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
              {[["Full Name *","name","text","Ramesh Kumar"],["Email *","email","email","teacher@school.com"],["Phone","phone","tel","9876543210"],["Password","password","text","min 8 chars"]].map(([label,key,type,ph])=>(
                <div key={key}><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>{label}</label>
                  <input type={type} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} placeholder={ph}
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} /></div>
              ))}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>ROLE</label>
                  <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}}>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                    <option value="receptionist">Receptionist</option>
                  </select></div>
                <div><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>BRANCH *</label>
                  <select value={form.branchId} onChange={e=>setForm({...form,branchId:e.target.value})}
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}}>
                    <option value="">Select...</option>
                    {branches.map(b=><option key={b._id} value={b._id}>{b.name}</option>)}
                  </select></div>
              </div>
              <div><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>DESIGNATION</label>
                <input value={form.designation} onChange={e=>setForm({...form,designation:e.target.value})} placeholder="Senior Teacher"
                  style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} /></div>
              <div><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>SUBJECTS (comma separated)</label>
                <input value={form.subjects} onChange={e=>setForm({...form,subjects:e.target.value})} placeholder="Math, Science"
                  style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} /></div>
              <div><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>MONTHLY SALARY (₹)</label>
                <input type="number" value={form.salaryAmount} onChange={e=>setForm({...form,salaryAmount:e.target.value})} placeholder="15000"
                  style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} /></div>
            </div>
            <div style={{display:"flex",gap:"12px",marginTop:"24px"}}>
              <button onClick={()=>setShowModal(false)} style={{flex:1,padding:"11px",border:"1.5px solid #e2e8f0",borderRadius:"10px",cursor:"pointer",background:"#fff",color:"#64748b",fontWeight:600}}>Cancel</button>
              <button onClick={handleAdd} disabled={addStaff.isPending}
                style={{flex:1,padding:"11px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",cursor:"pointer",fontWeight:700}}>
                {addStaff.isPending?"Adding...":"Add Staff"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Salary Modal */}
      {showSalary&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}
          onClick={e=>e.target===e.currentTarget&&setShowSalary(null)}>
          <div style={{background:"#fff",borderRadius:"20px",padding:"32px",width:"100%",maxWidth:"440px",boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}}>
            <h2 style={{fontSize:"18px",fontWeight:800,color:"#0f172a",marginBottom:"6px"}}>Pay Salary</h2>
            <p style={{fontSize:"13px",color:"#94a3b8",marginBottom:"24px"}}>{showSalary.userId?.name}</p>
            <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>MONTH</label>
                  <select value={salaryForm.month} onChange={e=>setSalaryForm({...salaryForm,month:Number(e.target.value)})}
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}}>
                    {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m,i)=>(
                      <option key={i} value={i+1}>{m}</option>
                    ))}
                  </select></div>
                <div><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>YEAR</label>
                  <input type="number" value={salaryForm.year} onChange={e=>setSalaryForm({...salaryForm,year:Number(e.target.value)})}
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} /></div>
              </div>
              {[["Basic Salary (₹) *","basicSalary"],["Advance (₹)","advance"],["Deductions (₹)","deductions"],["Bonus (₹)","bonus"]].map(([label,key])=>(
                <div key={key}><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>{label}</label>
                  <input type="number" value={salaryForm[key]} onChange={e=>setSalaryForm({...salaryForm,[key]:e.target.value})} placeholder="0"
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} /></div>
              ))}
              <div style={{padding:"16px",background:"#f0fdf4",borderRadius:"12px",display:"flex",justifyContent:"space-between"}}>
                <p style={{fontWeight:600,color:"#15803d"}}>Net Salary</p>
                <p style={{fontWeight:800,color:"#16a34a",fontSize:"18px"}}>
                  ₹{(Number(salaryForm.basicSalary||0)+Number(salaryForm.bonus||0)-Number(salaryForm.advance||0)-Number(salaryForm.deductions||0)).toLocaleString()}
                </p>
              </div>
            </div>
            <div style={{display:"flex",gap:"12px",marginTop:"24px"}}>
              <button onClick={()=>setShowSalary(null)} style={{flex:1,padding:"11px",border:"1.5px solid #e2e8f0",borderRadius:"10px",cursor:"pointer",background:"#fff",color:"#64748b",fontWeight:600}}>Cancel</button>
              <button onClick={()=>paySalary.mutate({ id:showSalary._id,...salaryForm, basicSalary:Number(salaryForm.basicSalary), advance:Number(salaryForm.advance||0), deductions:Number(salaryForm.deductions||0), bonus:Number(salaryForm.bonus||0), netSalary:Number(salaryForm.basicSalary||0)+Number(salaryForm.bonus||0)-Number(salaryForm.advance||0)-Number(salaryForm.deductions||0) })}
                disabled={paySalary.isPending}
                style={{flex:1,padding:"11px",background:"#16a34a",color:"#fff",border:"none",borderRadius:"10px",cursor:"pointer",fontWeight:700}}>
                {paySalary.isPending?"Paying...":"Pay Salary"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
