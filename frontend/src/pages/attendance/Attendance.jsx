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
  const [tab,       setTab]       = useState("mark");
  const [batchId,   setBatchId]   = useState("");
  const [date,      setDate]      = useState(today);
  const [records,   setRecords]   = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [reportBatchId, setReportBatchId] = useState("");
  const [reportMonth,   setReportMonth]   = useState(new Date().toISOString().slice(0,7));
  const [exportingCSV,  setExportingCSV]  = useState(false);

  const { data: batches=[], isLoading: batchLoading } = useQuery({
    queryKey: ["batches"],
    queryFn:  () => api.get("/batches?isActive=true").then(r => r.data.data),
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: students=[], isLoading: studentsLoading } = useQuery({
    queryKey: ["batch-students", batchId],
    queryFn:  () => api.get(`/batches/${batchId}/students`).then(r => r.data.data),
    enabled:  !!batchId,
    staleTime: 0,
  });

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
    onSuccess: () => { toast.success("✅ Attendance saved!"); setSubmitted(true); },
    onError:   (e) => toast.error(e.response?.data?.message || "Failed"),
  });

  const { data: report=[], isLoading: reportLoading } = useQuery({
    queryKey: ["attendance-report", reportBatchId, reportMonth],
    queryFn:  () => api.get(`/attendance/report?batchId=${reportBatchId}&month=${reportMonth}`).then(r => r.data.data),
    enabled:  tab==="report" && !!reportBatchId,
  });

  const handleExportCSV = async () => {
    if (!reportBatchId) return toast.error("Select a batch first");
    setExportingCSV(true);
    try {
      const res = await api.get(`/attendance/export/csv?batchId=${reportBatchId}&month=${reportMonth}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${reportMonth}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to export attendance");
    } finally {
      setExportingCSV(false);
    }
  };

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

      {/* Tabs */}
      <div style={{display:"flex",gap:"4px",background:"#f1f5f9",borderRadius:"12px",padding:"4px",width:"fit-content"}}>
        {[{id:"mark",label:"✅ Mark Attendance"},{id:"report",label:"📊 Monthly Report"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"8px 16px",borderRadius:"9px",border:"none",cursor:"pointer",fontSize:"13px",fontWeight:600,
              background:tab===t.id?"#fff":"transparent",color:tab===t.id?"#0f172a":"#64748b",
              boxShadow:tab===t.id?"0 1px 3px rgba(0,0,0,0.1)":"none"}}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==="mark"&&(<>
      {/* Controls */}
      <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"20px",display:"flex",gap:"16px",alignItems:"flex-end",flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:"200px"}}>
          <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>
            SELECT BATCH {batchLoading && <span style={{color:"#94a3b8"}}>Loading...</span>}
          </label>
          <select value={batchId} onChange={e => { setBatchId(e.target.value); setSubmitted(false); }}
            style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}}>
            <option value="">
              {batchLoading ? "Loading batches..." : batches.length === 0 ? "No batches found" : "Choose batch..."}
            </option>
            {batches.map(b => (
              <option key={b._id} value={b._id}>
                {b.name} ({b.enrolled || 0} students)
              </option>
            ))}
          </select>
          {!batchLoading && batches.length === 0 && (
            <p style={{fontSize:"11px",color:"#dc2626",marginTop:"4px"}}>⚠️ No active batches. Create a batch first.</p>
          )}
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
      ) : studentsLoading ? (
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"40px",textAlign:"center",color:"#94a3b8"}}>
          Loading students...
        </div>
      ) : students.length === 0 ? (
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"60px",textAlign:"center",color:"#94a3b8"}}>
          No active students in this batch
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
                  <div style={{width:"38px",height:"38px",borderRadius:"50%",background:cfg.bg,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:cfg.color,fontSize:"14px",flexShrink:0}}>
                    {st.name[0]}
                  </div>
                  <div>
                    <p style={{fontWeight:600,color:"#0f172a",fontSize:"14px"}}>{st.name}</p>
                    <p style={{fontSize:"12px",color:"#94a3b8"}}>{st.phone || "—"}</p>
                  </div>
                </div>
                <div style={{display:"flex",gap:"6px",flexWrap:"wrap",justifyContent:"flex-end"}}>
                  {["present","absent","late"].map(s => (
                    <button key={s} onClick={() => setRecords({...records,[st._id]:s})}
                      style={{padding:"7px 12px",borderRadius:"8px",border:"1.5px solid",fontSize:"12px",fontWeight:600,cursor:"pointer",
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
      </>)}

      {tab==="report"&&(
        <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
          <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"20px",display:"flex",gap:"16px",alignItems:"flex-end",flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:"200px"}}>
              <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>BATCH</label>
              <select value={reportBatchId} onChange={e=>setReportBatchId(e.target.value)}
                style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}}>
                <option value="">Select batch...</option>
                {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>MONTH</label>
              <input type="month" value={reportMonth} onChange={e=>setReportMonth(e.target.value)}
                style={{padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}} />
            </div>
            <button onClick={handleExportCSV} disabled={!reportBatchId || exportingCSV}
              style={{padding:"10px 16px",background:"#fff",color:"#64748b",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",fontWeight:600,cursor:"pointer"}}>
              ⬇️ {exportingCSV?"Exporting...":"Export CSV"}
            </button>
          </div>

          {!reportBatchId ? (
            <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"60px",textAlign:"center",color:"#94a3b8"}}>
              📊 Select a batch to view its monthly attendance report
            </div>
          ) : reportLoading ? (
            <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"40px",textAlign:"center",color:"#94a3b8"}}>
              Loading...
            </div>
          ) : report.length===0 ? (
            <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"60px",textAlign:"center",color:"#94a3b8"}}>
              No attendance records for this batch/month
            </div>
          ) : (
            <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"13px"}}>
                <thead><tr style={{background:"#f8fafc"}}>
                  {["Student","Present","Absent","Late","Total Days","%"].map(h=>(
                    <th key={h} style={{textAlign:"left",padding:"12px 16px",color:"#64748b",fontWeight:600,fontSize:"12px"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {report.map((r,i)=>{
                    const pctColor = r.percentage>=80?"#16a34a":r.percentage>=60?"#d97706":"#dc2626";
                    return (
                      <tr key={r.student._id} style={{borderTop:"1px solid #f8fafc",background:i%2===0?"#fff":"#fafafa"}}>
                        <td style={{padding:"12px 16px",fontWeight:600,color:"#0f172a"}}>{r.student.name}</td>
                        <td style={{padding:"12px 16px",color:"#16a34a"}}>{r.present}</td>
                        <td style={{padding:"12px 16px",color:"#dc2626"}}>{r.absent}</td>
                        <td style={{padding:"12px 16px",color:"#d97706"}}>{r.late}</td>
                        <td style={{padding:"12px 16px",color:"#64748b"}}>{r.total}</td>
                        <td style={{padding:"12px 16px",fontWeight:700,color:pctColor}}>{r.percentage}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
