import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";

const STATUS_CONFIG = {
  present: { color:"#16a34a", bg:"#f0fdf4", label:"Present" },
  absent:  { color:"#dc2626", bg:"#fef2f2", label:"Absent"  },
  late:    { color:"#d97706", bg:"#fffbeb", label:"Late"    },
};

export default function Attendance() {
  const today = new Date().toISOString().slice(0,10);
  const [batchId,   setBatchId]   = useState("");
  const [date,      setDate]      = useState(today);
  const [records,   setRecords]   = useState({});
  const [submitted, setSubmitted] = useState(false);

  const { data: batches=[] } = useQuery({
    queryKey: ["batches"],
    queryFn:  () => api.get("/batches").then(r => r.data.data),
  });

  const { data: students=[], isLoading } = useQuery({
    queryKey: ["batch-students", batchId],
    queryFn:  () => api.get(`/batches/${batchId}/students`).then(r => r.data.data),
    enabled:  !!batchId,
  });

  // Fix: useEffect instead of deprecated onSuccess
  useEffect(() => {
    if (students.length > 0) {
      const init = {};
      students.forEach(s => { init[s._id] = "present"; });
      setRecords(init);
      setSubmitted(false);
    }
  }, [students]);

  const mark = useMutation({
    mutationFn: (payload) => api.post("/attendance/mark", payload),
    onSuccess: () => { toast.success("Attendance saved!"); setSubmitted(true); },
    onError:   (e) => toast.error(e.response?.data?.message || "Failed"),
  });

  const selectedBatch = batches.find(b => b._id === batchId);
  const present = Object.values(records).filter(v => v === "present").length;
  const absent  = Object.values(records).filter(v => v === "absent").length;
  const late    = Object.values(records).filter(v => v === "late").length;

  const handleSubmit = () => {
    if (!batchId) return toast.error("Select a batch");
    mark.mutate({
      batchId,
      branchId: selectedBatch?.branchId,
      date,
      records: Object.entries(records).map(([studentId, status]) => ({ studentId, status })),
    });
  };

  const markAll = (status) => {
    const updated = {};
    students.forEach(s => { updated[s._id] = status; });
    setRecords(updated);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"24px"}}>
      <div>
        <h1 style={{fontSize:"24px",fontWeight:800,color:"#0f172a"}}>Attendance</h1>
        <p style={{fontSize:"13px",color:"#94a3b8",marginTop:"2px"}}>Mark daily attendance batch-wise</p>
      </div>

      {/* Controls */}
      <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"20px",display:"flex",gap:"16px",alignItems:"flex-end",flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:"200px"}}>
          <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>SELECT BATCH</label>
          <select value={batchId} onChange={e => setBatchId(e.target.value)}
            style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}}>
            <option value="">Choose batch...</option>
            {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>DATE</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}} />
        </div>
        {students.length > 0 && (
          <div style={{display:"flex",gap:"8px"}}>
            {["present","absent","late"].map(s => (
              <button key={s} onClick={() => markAll(s)}
                style={{padding:"10px 16px",borderRadius:"10px",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:600,
                  background:STATUS_CONFIG[s].bg,color:STATUS_CONFIG[s].color}}>
                All {STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {students.length > 0 && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px"}}>
          {[
            {label:"Total",   val:students.length, color:"#1a56db", bg:"#eff6ff"},
            {label:"Present", val:present,          color:"#16a34a", bg:"#f0fdf4"},
            {label:"Absent",  val:absent,           color:"#dc2626", bg:"#fef2f2"},
            {label:"Late",    val:late,             color:"#d97706", bg:"#fffbeb"},
          ].map(({label,val,color,bg}) => (
            <div key={label} style={{background:bg,borderRadius:"12px",padding:"14px 18px",textAlign:"center"}}>
              <p style={{fontSize:"22px",fontWeight:800,color}}>{val}</p>
              <p style={{fontSize:"12px",color,fontWeight:600}}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Student List */}
      {!batchId ? (
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"60px",textAlign:"center",color:"#94a3b8"}}>
          📋 Select a batch to mark attendance
        </div>
      ) : isLoading ? (
        <p style={{color:"#94a3b8",textAlign:"center",padding:"40px"}}>Loading students...</p>
      ) : students.length === 0 ? (
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"60px",textAlign:"center",color:"#94a3b8"}}>
          No students in this batch
        </div>
      ) : (
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",overflow:"hidden"}}>
          <div style={{padding:"16px 20px",borderBottom:"1px solid #f8fafc",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <p style={{fontWeight:700,color:"#0f172a"}}>{selectedBatch?.name} — {students.length} Students</p>
            {submitted && <span style={{color:"#16a34a",fontSize:"13px",fontWeight:600}}>✅ Saved</span>}
          </div>
          {students.map((st, i) => {
            const status = records[st._id] || "present";
            const cfg    = STATUS_CONFIG[status];
            return (
              <div key={st._id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",borderBottom:i<students.length-1?"1px solid #f8fafc":"none",background:i%2===0?"#fff":"#fafafa"}}>
                <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                  <div style={{width:"38px",height:"38px",borderRadius:"50%",background:cfg.bg,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:cfg.color,fontSize:"14px"}}>
                    {st.name[0]}
                  </div>
                  <div>
                    <p style={{fontWeight:600,color:"#0f172a",fontSize:"14px"}}>{st.name}</p>
                    <p style={{fontSize:"12px",color:"#94a3b8"}}>{st.phone || "—"}</p>
                  </div>
                </div>
                <div style={{display:"flex",gap:"8px"}}>
                  {["present","absent","late"].map(s => (
                    <button key={s} onClick={() => setRecords({...records,[st._id]:s})}
                      style={{padding:"7px 14px",borderRadius:"8px",border:"1.5px solid",fontSize:"12px",fontWeight:600,cursor:"pointer",
                        borderColor:status===s?STATUS_CONFIG[s].color:"#e2e8f0",
                        background:status===s?STATUS_CONFIG[s].bg:"#fff",
                        color:status===s?STATUS_CONFIG[s].color:"#94a3b8"}}>
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <div style={{padding:"16px 20px",borderTop:"1px solid #f1f5f9",display:"flex",justifyContent:"flex-end"}}>
            <button onClick={handleSubmit} disabled={mark.isPending || submitted}
              style={{padding:"11px 32px",background:submitted?"#16a34a":"#1a56db",color:"#fff",border:"none",borderRadius:"10px",fontWeight:700,cursor:"pointer",fontSize:"14px"}}>
              {mark.isPending ? "Saving..." : submitted ? "✅ Attendance Saved" : "Save Attendance"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
