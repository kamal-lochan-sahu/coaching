import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";

export default function EditStudent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState(null);

  const { data: studentData } = useQuery({
    queryKey: ["student", id],
    queryFn:  () => api.get(`/students/${id}`).then(r => r.data.data),
  });
  const { data: branches=[] } = useQuery({ queryKey:["branches"], queryFn:()=>api.get("/branches").then(r=>r.data.data) });
  const { data: batches=[]  } = useQuery({ queryKey:["batches"],  queryFn:()=>api.get("/batches").then(r=>r.data.data) });

  useEffect(() => {
    if (studentData) {
      setForm({
        name:             studentData.name || "",
        phone:            studentData.phone || "",
        email:            studentData.email || "",
        gender:           studentData.gender || "male",
        dateOfBirth:      studentData.dateOfBirth ? studentData.dateOfBirth.slice(0,10) : "",
        address:          studentData.address || "",
        guardianName:     studentData.guardianName || "",
        guardianPhone:    studentData.guardianPhone || "",
        guardianRelation: studentData.guardianRelation || "father",
        branchId:         studentData.branchId || "",
        batchId:          studentData.currentBatch?._id || studentData.currentBatch || "",
        status:           studentData.status || "active",
        notes:            studentData.notes || "",
      });
    }
  }, [studentData]);

  const mutation = useMutation({
    mutationFn: (data) => api.put(`/students/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries(["students"]);
      qc.invalidateQueries(["student", id]);
      toast.success("Student updated!");
      navigate(`/students/${id}`);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  });

  if (!form) return <div style={{padding:"40px",textAlign:"center",color:"#94a3b8"}}>Loading...</div>;

  const f = (key) => ({ value: form[key], onChange: e => setForm({...form, [key]: e.target.value}) });

  return (
    <div style={{maxWidth:"680px",margin:"0 auto",display:"flex",flexDirection:"column",gap:"24px"}}>
      <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
        <Link to={`/students/${id}`} style={{padding:"8px",borderRadius:"10px",background:"#f1f5f9",border:"none",cursor:"pointer",display:"flex"}}>
          <ArrowLeft size={18} color="#64748b" />
        </Link>
        <div>
          <h1 style={{fontSize:"22px",fontWeight:800,color:"#0f172a"}}>Edit Student</h1>
          <p style={{fontSize:"13px",color:"#94a3b8"}}>Update student information</p>
        </div>
      </div>

      <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"28px",display:"flex",flexDirection:"column",gap:"20px"}}>
        <h3 style={{fontWeight:700,color:"#0f172a",borderBottom:"1px solid #f1f5f9",paddingBottom:"12px"}}>Basic Information</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
          {[["Full Name *","name","text"],["Phone","phone","tel"],["Email","email","email"],["Date of Birth","dateOfBirth","date"]].map(([label,key,type])=>(
            <div key={key}>
              <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>{label}</label>
              <input type={type} {...f(key)}
                style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
            </div>
          ))}
          <div>
            <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>Gender</label>
            <select {...f("gender")} style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}}>
              <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select>
          </div>
          <div>
            <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>Status</label>
            <select {...f("status")} style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}}>
              <option value="active">Active</option><option value="inactive">Inactive</option><option value="passed">Passed</option><option value="dropped">Dropped</option>
            </select>
          </div>
        </div>
        <div>
          <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>Address</label>
          <textarea {...f("address")} rows={2} style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",resize:"none",boxSizing:"border-box"}} />
        </div>

        <h3 style={{fontWeight:700,color:"#0f172a",borderBottom:"1px solid #f1f5f9",paddingBottom:"12px",marginTop:"8px"}}>Guardian Details</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
          <div>
            <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>Guardian Name</label>
            <input type="text" {...f("guardianName")} style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
          </div>
          <div>
            <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>Guardian Phone</label>
            <input type="tel" {...f("guardianPhone")} style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
          </div>
          <div>
            <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>Relation</label>
            <select {...f("guardianRelation")} style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}}>
              <option value="father">Father</option><option value="mother">Mother</option><option value="guardian">Guardian</option><option value="other">Other</option>
            </select>
          </div>
        </div>

        <h3 style={{fontWeight:700,color:"#0f172a",borderBottom:"1px solid #f1f5f9",paddingBottom:"12px",marginTop:"8px"}}>Academic</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
          <div>
            <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>Branch</label>
            <select {...f("branchId")} style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}}>
              <option value="">Select Branch</option>
              {branches.map(b=><option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>Batch</label>
            <select {...f("batchId")} style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}}>
              <option value="">Select Batch</option>
              {batches.map(b=><option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>Notes</label>
          <textarea {...f("notes")} rows={2} placeholder="Any additional notes..."
            style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",resize:"none",boxSizing:"border-box"}} />
        </div>

        <div style={{display:"flex",gap:"12px",paddingTop:"8px"}}>
          <Link to={`/students/${id}`} style={{flex:1,padding:"12px",border:"1.5px solid #e2e8f0",borderRadius:"10px",textAlign:"center",color:"#64748b",fontWeight:600,textDecoration:"none",fontSize:"14px"}}>
            Cancel
          </Link>
          <button onClick={() => mutation.mutate(form)} disabled={!form.name || mutation.isPending}
            style={{flex:1,padding:"12px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",fontWeight:700,cursor:"pointer",fontSize:"14px"}}>
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
