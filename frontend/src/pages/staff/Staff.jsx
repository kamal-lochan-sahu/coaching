import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import { validateForm, isRequired, isEmail, isPhone, minLength, isPositiveNumber } from "../../utils/validation";

const ADD_STAFF_RULES = {
  name:     [isRequired],
  email:    [isRequired, isEmail],
  phone:    [isPhone],
  password: [isRequired, minLength(8)],
  branchId: [isRequired],
};
const SALARY_RULES = { basicSalary: [isRequired, isPositiveNumber] };

export default function Staff() {
  const qc = useQueryClient();
  const [showAdd,    setShowAdd]    = useState(false);
  const [showEdit,   setShowEdit]   = useState(null);
  const [showSalary, setShowSalary] = useState(null);
  const [showHistory,setShowHistory]= useState(null);

  const [addForm, setAddForm] = useState({ name:"",email:"",phone:"",password:"",role:"teacher",designation:"",subjects:"",branchId:"",salaryAmount:"" });
  const [addErrors, setAddErrors] = useState({});
  const [editForm,setEditForm]= useState({});
  const [salaryForm, setSalaryForm] = useState({ month:new Date().getMonth()+1, year:new Date().getFullYear(), basicSalary:"", advance:"0", deductions:"0", bonus:"0", paymentMode:"bank_transfer", note:"" });
  const [salaryErrors, setSalaryErrors] = useState({});

  const { data:staff=[], isLoading }    = useQuery({ queryKey:["staff"],    queryFn:()=>api.get("/staff").then(r=>r.data.data) });
  const { data:branches=[] }            = useQuery({ queryKey:["branches"], queryFn:()=>api.get("/branches").then(r=>r.data.data) });
  const { data:salaryHistory=[] }       = useQuery({
    queryKey: ["salary-history", showHistory?._id],
    queryFn:  () => api.get(`/staff/${showHistory._id}/salary-history`).then(r=>r.data.data),
    enabled:  !!showHistory,
  });

  const addStaff = useMutation({
    mutationFn:(d)=>api.post("/staff",d),
    onSuccess:()=>{ qc.invalidateQueries(["staff"]); toast.success("Staff added!"); setShowAdd(false); setAddForm({ name:"",email:"",phone:"",password:"",role:"teacher",designation:"",subjects:"",branchId:"",salaryAmount:"" }); },
    onError:(e)=>toast.error(e.response?.data?.message||"Failed"),
  });

  const updateStaff = useMutation({
    mutationFn:({id,...d})=>api.put(`/staff/${id}`,d),
    onSuccess:()=>{ qc.invalidateQueries(["staff"]); toast.success("Staff updated!"); setShowEdit(null); },
    onError:(e)=>toast.error(e.response?.data?.message||"Failed"),
  });

  const paySalary = useMutation({
    mutationFn:({id,...d})=>api.post(`/staff/${id}/salary`,d),
    onSuccess:()=>{ toast.success("Salary paid!"); setShowSalary(null); },
    onError:(e)=>toast.error(e.response?.data?.message||"Failed"),
  });

  const openEdit = (s) => {
    setEditForm({
      designation: s.designation||"",
      subjects:    s.subjects?.join(", ")||"",
      salaryAmount:s.salary?.amount||"",
      branchId:    s.branchId||"",
    });
    setShowEdit(s);
  };

  const handleAddStaff = () => {
    const newErrors = validateForm(addForm, ADD_STAFF_RULES);
    if (Object.keys(newErrors).length) { setAddErrors(newErrors); toast.error("Please fix the highlighted fields"); return; }
    setAddErrors({});
    addStaff.mutate({ ...addForm, subjects:addForm.subjects.split(",").map(s=>s.trim()).filter(Boolean), salary:{ amount:Number(addForm.salaryAmount)||0, paymentDay:1 } });
  };

  const handlePaySalary = () => {
    const newErrors = validateForm(salaryForm, SALARY_RULES);
    if (Object.keys(newErrors).length) { setSalaryErrors(newErrors); toast.error("Please fix the highlighted fields"); return; }
    setSalaryErrors({});
    paySalary.mutate({ id:showSalary._id, ...salaryForm, basicSalary:Number(salaryForm.basicSalary), advance:Number(salaryForm.advance||0), deductions:Number(salaryForm.deductions||0), bonus:Number(salaryForm.bonus||0), netSalary });
  };

  const netSalary = Number(salaryForm.basicSalary||0)+Number(salaryForm.bonus||0)-Number(salaryForm.advance||0)-Number(salaryForm.deductions||0);

  const ROLE_COLORS = { owner:"#7c3aed",admin:"#d97706",teacher:"#1a56db",receptionist:"#16a34a" };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"24px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <h1 style={{fontSize:"24px",fontWeight:800,color:"#0f172a"}}>Staff Management</h1>
          <p style={{fontSize:"13px",color:"#94a3b8",marginTop:"2px"}}>{staff.length} staff members</p>
        </div>
        <button onClick={()=>{ setAddErrors({}); setShowAdd(true); }}
          style={{padding:"10px 20px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",fontSize:"13px",fontWeight:600,cursor:"pointer"}}>
          + Add Staff
        </button>
      </div>

      {isLoading ? <p style={{color:"#94a3b8",textAlign:"center",padding:"40px"}}>Loading...</p> : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"16px"}}>
          {staff.map(s=>(
            <div key={s._id} style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"22px",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"16px"}}>
                <div style={{width:"48px",height:"48px",borderRadius:"50%",background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#1a56db",fontSize:"20px",flexShrink:0}}>
                  {s.userId?.name?.[0]||"?"}
                </div>
                <div style={{flex:1}}>
                  <p style={{fontWeight:700,color:"#0f172a",fontSize:"15px"}}>{s.userId?.name}</p>
                  <p style={{fontSize:"12px",color:"#94a3b8"}}>{s.designation||"—"}</p>
                </div>
                <span style={{padding:"3px 8px",borderRadius:"99px",fontSize:"11px",fontWeight:600,background:`${ROLE_COLORS[s.userId?.role]||"#64748b"}15`,color:ROLE_COLORS[s.userId?.role]||"#64748b",textTransform:"capitalize",flexShrink:0}}>
                  {s.userId?.role}
                </span>
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:"5px",fontSize:"12px",color:"#64748b",marginBottom:"14px"}}>
                <p>📧 {s.userId?.email}</p>
                <p>📱 {s.userId?.phone||"—"}</p>
                <p>📚 {s.subjects?.join(", ")||"No subjects"}</p>
                <p>💰 ₹{s.salary?.amount?.toLocaleString()||"0"}/month</p>
                <p>📅 Joined: {s.joiningDate?new Date(s.joiningDate).toLocaleDateString("en-IN"):"—"}</p>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px"}}>
                <button onClick={()=>openEdit(s)}
                  style={{padding:"8px",background:"#eff6ff",color:"#1a56db",border:"none",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:600}}>
                  ✏️ Edit
                </button>
                <button onClick={()=>{ setShowSalary(s); setSalaryErrors({}); setSalaryForm({...salaryForm,basicSalary:s.salary?.amount||""}); }}
                  style={{padding:"8px",background:"#f0fdf4",color:"#16a34a",border:"none",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:600}}>
                  💸 Pay
                </button>
                <button onClick={()=>setShowHistory(s)} style={{gridColumn:"1/-1",padding:"8px",background:"#f8fafc",color:"#64748b",border:"none",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:600}}>
                  📋 Salary History
                </button>
              </div>
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
      {showAdd&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}
          onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
          <div style={{background:"#fff",borderRadius:"20px",padding:"32px",width:"100%",maxWidth:"500px",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}}>
            <h2 style={{fontSize:"18px",fontWeight:800,color:"#0f172a",marginBottom:"24px"}}>Add Staff Member</h2>
            <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
              {[["Full Name *","name","text","Ramesh Kumar"],["Email *","email","email","teacher@school.com"],["Phone","phone","tel","9876543210"],["Password *","password","text","min 8 chars"]].map(([label,key,type,ph])=>(
                <div key={key}>
                  <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>{label}</label>
                  <input type={type} value={addForm[key]} onChange={e=>{setAddForm({...addForm,[key]:e.target.value}); if(addErrors[key]) setAddErrors({...addErrors,[key]:""});}} placeholder={ph}
                    style={{width:"100%",padding:"10px 14px",border:addErrors[key]?"1.5px solid #dc2626":"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
                  {addErrors[key] && <p style={{color:"#dc2626",fontSize:"11px",marginTop:"4px",fontWeight:500}}>{addErrors[key]}</p>}
                </div>
              ))}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div>
                  <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>ROLE</label>
                  <select value={addForm.role} onChange={e=>setAddForm({...addForm,role:e.target.value})}
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}}>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                    <option value="receptionist">Receptionist</option>
                  </select>
                </div>
                <div>
                  <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>BRANCH *</label>
                  <select value={addForm.branchId} onChange={e=>{setAddForm({...addForm,branchId:e.target.value}); if(addErrors.branchId) setAddErrors({...addErrors,branchId:""});}}
                    style={{width:"100%",padding:"10px 14px",border:addErrors.branchId?"1.5px solid #dc2626":"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}}>
                    <option value="">Select...</option>
                    {branches.map(b=><option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                  {addErrors.branchId && <p style={{color:"#dc2626",fontSize:"11px",marginTop:"4px",fontWeight:500}}>{addErrors.branchId}</p>}
                </div>
              </div>
              <div>
                <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>DESIGNATION</label>
                <input value={addForm.designation} onChange={e=>setAddForm({...addForm,designation:e.target.value})} placeholder="Senior Teacher"
                  style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
              </div>
              <div>
                <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>SUBJECTS (comma separated)</label>
                <input value={addForm.subjects} onChange={e=>setAddForm({...addForm,subjects:e.target.value})} placeholder="Math, Science"
                  style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
              </div>
              <div>
                <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>MONTHLY SALARY (₹)</label>
                <input type="number" value={addForm.salaryAmount} onChange={e=>setAddForm({...addForm,salaryAmount:e.target.value})} placeholder="15000"
                  style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
              </div>
            </div>
            <div style={{display:"flex",gap:"12px",marginTop:"24px"}}>
              <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:"11px",border:"1.5px solid #e2e8f0",borderRadius:"10px",cursor:"pointer",background:"#fff",color:"#64748b",fontWeight:600}}>Cancel</button>
              <button onClick={handleAddStaff}
                disabled={addStaff.isPending}
                style={{flex:1,padding:"11px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",cursor:"pointer",fontWeight:700}}>
                {addStaff.isPending?"Adding...":"Add Staff"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {showEdit&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}
          onClick={e=>e.target===e.currentTarget&&setShowEdit(null)}>
          <div style={{background:"#fff",borderRadius:"20px",padding:"32px",width:"100%",maxWidth:"440px",boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}}>
            <h2 style={{fontSize:"18px",fontWeight:800,color:"#0f172a",marginBottom:"6px"}}>Edit Staff</h2>
            <p style={{fontSize:"13px",color:"#94a3b8",marginBottom:"20px"}}>{showEdit.userId?.name}</p>
            <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
              <div>
                <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>DESIGNATION</label>
                <input value={editForm.designation} onChange={e=>setEditForm({...editForm,designation:e.target.value})}
                  style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
              </div>
              <div>
                <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>SUBJECTS</label>
                <input value={editForm.subjects} onChange={e=>setEditForm({...editForm,subjects:e.target.value})} placeholder="Math, Science"
                  style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
              </div>
              <div>
                <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>MONTHLY SALARY (₹)</label>
                <input type="number" value={editForm.salaryAmount} onChange={e=>setEditForm({...editForm,salaryAmount:e.target.value})}
                  style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
              </div>
            </div>
            <div style={{display:"flex",gap:"12px",marginTop:"24px"}}>
              <button onClick={()=>setShowEdit(null)} style={{flex:1,padding:"11px",border:"1.5px solid #e2e8f0",borderRadius:"10px",cursor:"pointer",background:"#fff",color:"#64748b",fontWeight:600}}>Cancel</button>
              <button onClick={()=>updateStaff.mutate({ id:showEdit._id, designation:editForm.designation, subjects:editForm.subjects.split(",").map(s=>s.trim()).filter(Boolean), salary:{ amount:Number(editForm.salaryAmount)||0, paymentDay:1 } })}
                disabled={updateStaff.isPending}
                style={{flex:1,padding:"11px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",cursor:"pointer",fontWeight:700}}>
                {updateStaff.isPending?"Saving...":"Save Changes"}
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
            <p style={{fontSize:"13px",color:"#94a3b8",marginBottom:"20px"}}>{showSalary.userId?.name}</p>
            <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div>
                  <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>MONTH</label>
                  <select value={salaryForm.month} onChange={e=>setSalaryForm({...salaryForm,month:Number(e.target.value)})}
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}}>
                    {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m,i)=>(
                      <option key={i} value={i+1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>YEAR</label>
                  <input type="number" value={salaryForm.year} onChange={e=>setSalaryForm({...salaryForm,year:Number(e.target.value)})}
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
                </div>
              </div>
              {[["BASIC SALARY (₹) *","basicSalary"],["ADVANCE (₹)","advance"],["DEDUCTIONS (₹)","deductions"],["BONUS (₹)","bonus"]].map(([label,key])=>(
                <div key={key}>
                  <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>{label}</label>
                  <input type="number" value={salaryForm[key]} onChange={e=>{setSalaryForm({...salaryForm,[key]:e.target.value}); if(salaryErrors[key]) setSalaryErrors({...salaryErrors,[key]:""});}} placeholder="0"
                    style={{width:"100%",padding:"10px 14px",border:salaryErrors[key]?"1.5px solid #dc2626":"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
                  {salaryErrors[key] && <p style={{color:"#dc2626",fontSize:"11px",marginTop:"4px",fontWeight:500}}>{salaryErrors[key]}</p>}
                </div>
              ))}
              <div>
                <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>PAYMENT MODE</label>
                <select value={salaryForm.paymentMode} onChange={e=>setSalaryForm({...salaryForm,paymentMode:e.target.value})}
                  style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}}>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div style={{padding:"16px",background:"#f0fdf4",borderRadius:"12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <p style={{fontWeight:600,color:"#15803d"}}>Net Salary</p>
                <p style={{fontSize:"22px",fontWeight:800,color:"#16a34a"}}>₹{netSalary.toLocaleString()}</p>
              </div>
            </div>
            <div style={{display:"flex",gap:"12px",marginTop:"24px"}}>
              <button onClick={()=>setShowSalary(null)} style={{flex:1,padding:"11px",border:"1.5px solid #e2e8f0",borderRadius:"10px",cursor:"pointer",background:"#fff",color:"#64748b",fontWeight:600}}>Cancel</button>
              <button onClick={handlePaySalary}
                disabled={paySalary.isPending}
                style={{flex:1,padding:"11px",background:"#16a34a",color:"#fff",border:"none",borderRadius:"10px",cursor:"pointer",fontWeight:700}}>
                {paySalary.isPending?"Paying...":"Pay Salary"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Salary History Modal */}
      {showHistory&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}
          onClick={e=>e.target===e.currentTarget&&setShowHistory(null)}>
          <div style={{background:"#fff",borderRadius:"20px",padding:"32px",width:"100%",maxWidth:"540px",maxHeight:"80vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}}>
            <h2 style={{fontSize:"18px",fontWeight:800,color:"#0f172a",marginBottom:"6px"}}>Salary History</h2>
            <p style={{fontSize:"13px",color:"#94a3b8",marginBottom:"20px"}}>{showHistory.userId?.name}</p>
            {salaryHistory.length===0?(
              <p style={{color:"#94a3b8",textAlign:"center",padding:"40px"}}>No salary records yet</p>
            ):(
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"13px"}}>
                <thead><tr style={{background:"#f8fafc"}}>
                  {["Month/Year","Basic","Advance","Deductions","Net","Mode"].map(h=>(
                    <th key={h} style={{textAlign:"left",padding:"10px 12px",color:"#64748b",fontWeight:600,fontSize:"11px"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {salaryHistory.map((s,i)=>(
                    <tr key={s._id} style={{borderTop:"1px solid #f8fafc",background:i%2===0?"#fff":"#fafafa"}}>
                      <td style={{padding:"10px 12px",fontWeight:600}}>{["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][s.month-1]} {s.year}</td>
                      <td style={{padding:"10px 12px"}}>₹{s.basicSalary?.toLocaleString()}</td>
                      <td style={{padding:"10px 12px",color:"#dc2626"}}>-₹{s.advance||0}</td>
                      <td style={{padding:"10px 12px",color:"#dc2626"}}>-₹{s.deductions||0}</td>
                      <td style={{padding:"10px 12px",fontWeight:700,color:"#16a34a"}}>₹{s.netSalary?.toLocaleString()}</td>
                      <td style={{padding:"10px 12px",color:"#64748b",textTransform:"capitalize"}}>{s.paymentMode?.replace("_"," ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button onClick={()=>setShowHistory(null)} style={{marginTop:"20px",width:"100%",padding:"11px",border:"1.5px solid #e2e8f0",borderRadius:"10px",cursor:"pointer",background:"#fff",color:"#64748b",fontWeight:600}}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
