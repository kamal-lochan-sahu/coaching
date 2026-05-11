import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const DAY_FULL = { Mon:"Monday",Tue:"Tuesday",Wed:"Wednesday",Thu:"Thursday",Fri:"Friday",Sat:"Saturday",Sun:"Sunday" };

export default function Timetable() {
  const qc = useQueryClient();
  const [batchId, setBatchId] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [schedule, setSchedule] = useState(
    DAYS.map(day => ({ day, slots:[{ startTime:"", endTime:"", subject:"", teacherId:"" }] }))
  );

  const { data:batches=[] } = useQuery({ queryKey:["batches"], queryFn:()=>api.get("/batches").then(r=>r.data.data) });
  const { data:timetable }  = useQuery({
    queryKey: ["timetable", batchId],
    queryFn:  () => api.get(`/timetable/batch/${batchId}`).then(r=>r.data.data),
    enabled:  !!batchId,
  });
  const { data:staff=[] } = useQuery({ queryKey:["staff"], queryFn:()=>api.get("/staff").then(r=>r.data.data) });

  const selectedBatch = batches.find(b=>b._id===batchId);

  const saveTimetable = useMutation({
    mutationFn: (data) => api.post("/timetable", data),
    onSuccess: () => {
      qc.invalidateQueries(["timetable", batchId]);
      toast.success("Timetable saved!");
      setShowEdit(false);
    },
    onError: (e) => toast.error(e.response?.data?.message||"Failed"),
  });

  const initSchedule = () => {
    if (timetable?.schedule) {
      setSchedule(DAYS.map(day => {
        const existing = timetable.schedule.find(s=>s.day===day);
        return existing || { day, slots:[{startTime:"",endTime:"",subject:"",teacherId:""}] };
      }));
    } else {
      setSchedule(DAYS.map(day => ({ day, slots:[{startTime:"",endTime:"",subject:"",teacherId:""}] })));
    }
    setShowEdit(true);
  };

  const addSlot = (dayIdx) => {
    const updated = [...schedule];
    updated[dayIdx].slots.push({startTime:"",endTime:"",subject:"",teacherId:""});
    setSchedule(updated);
  };

  const removeSlot = (dayIdx, slotIdx) => {
    const updated = [...schedule];
    updated[dayIdx].slots.splice(slotIdx,1);
    setSchedule(updated);
  };

  const updateSlot = (dayIdx, slotIdx, field, value) => {
    const updated = [...schedule];
    updated[dayIdx].slots[slotIdx][field] = value;
    setSchedule(updated);
  };

  const handleSave = () => {
    if (!batchId) return toast.error("Select a batch first");
    const branchId = selectedBatch?.branchId;
    const filteredSchedule = schedule.filter(s => s.slots.some(sl=>sl.subject||sl.startTime));
    saveTimetable.mutate({ batchId, branchId, schedule:filteredSchedule, effectiveFrom: new Date() });
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"24px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <h1 style={{fontSize:"24px",fontWeight:800,color:"#0f172a"}}>Timetable</h1>
          <p style={{fontSize:"13px",color:"#94a3b8",marginTop:"2px"}}>Manage weekly schedules for each batch</p>
        </div>
        {batchId && (
          <button onClick={initSchedule}
            style={{padding:"10px 20px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",fontSize:"13px",fontWeight:600,cursor:"pointer"}}>
            ✏️ Edit Timetable
          </button>
        )}
      </div>

      {/* Batch Select */}
      <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"20px"}}>
        <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"8px"}}>SELECT BATCH</label>
        <select value={batchId} onChange={e=>setBatchId(e.target.value)}
          style={{width:"100%",maxWidth:"400px",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}}>
          <option value="">Choose batch...</option>
          {batches.map(b=><option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
      </div>

      {/* Timetable Display */}
      {!batchId ? (
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"60px",textAlign:"center",color:"#94a3b8"}}>
          🗓️ Select a batch to view timetable
        </div>
      ) : !timetable ? (
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"60px",textAlign:"center"}}>
          <p style={{color:"#94a3b8",marginBottom:"16px"}}>No timetable set for this batch</p>
          <button onClick={initSchedule}
            style={{padding:"10px 24px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",cursor:"pointer",fontWeight:600}}>
            Create Timetable
          </button>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"10px"}}>
          {DAYS.map(day => {
            const daySchedule = timetable.schedule?.find(s=>s.day===day);
            return (
              <div key={day} style={{background:"#fff",borderRadius:"14px",border:"1px solid #f1f5f9",overflow:"hidden"}}>
                <div style={{padding:"10px 14px",background:"#1a56db",textAlign:"center"}}>
                  <p style={{color:"#fff",fontWeight:700,fontSize:"13px"}}>{DAY_FULL[day]}</p>
                </div>
                <div style={{padding:"10px"}}>
                  {daySchedule?.slots?.filter(s=>s.subject||s.startTime).length > 0 ? (
                    daySchedule.slots.filter(s=>s.subject||s.startTime).map((slot,i)=>(
                      <div key={i} style={{background:"#eff6ff",borderRadius:"8px",padding:"8px",marginBottom:"6px"}}>
                        <p style={{fontWeight:700,color:"#1a56db",fontSize:"12px"}}>{slot.subject||"—"}</p>
                        <p style={{color:"#64748b",fontSize:"11px",marginTop:"2px"}}>{slot.startTime||"?"} - {slot.endTime||"?"}</p>
                      </div>
                    ))
                  ) : (
                    <p style={{color:"#cbd5e1",fontSize:"12px",textAlign:"center",padding:"16px 0"}}>No class</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:50,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"20px",overflowY:"auto"}}>
          <div style={{background:"#fff",borderRadius:"20px",padding:"32px",width:"100%",maxWidth:"900px",boxShadow:"0 20px 60px rgba(0,0,0,0.15)",marginTop:"20px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"24px"}}>
              <h2 style={{fontSize:"18px",fontWeight:800,color:"#0f172a"}}>Edit Timetable — {selectedBatch?.name}</h2>
              <button onClick={()=>setShowEdit(false)} style={{padding:"8px 16px",border:"1px solid #e2e8f0",borderRadius:"8px",cursor:"pointer",background:"#fff",color:"#64748b"}}>Close</button>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>
              {schedule.map((dayObj,dayIdx)=>(
                <div key={dayObj.day} style={{border:"1px solid #f1f5f9",borderRadius:"12px",overflow:"hidden"}}>
                  <div style={{padding:"10px 16px",background:"#f8fafc",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <p style={{fontWeight:700,color:"#0f172a",fontSize:"14px"}}>{DAY_FULL[dayObj.day]}</p>
                    <button onClick={()=>addSlot(dayIdx)}
                      style={{padding:"5px 12px",background:"#eff6ff",color:"#1a56db",border:"none",borderRadius:"6px",cursor:"pointer",fontSize:"12px",fontWeight:600}}>
                      + Add Slot
                    </button>
                  </div>
                  <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:"8px"}}>
                    {dayObj.slots.map((slot,slotIdx)=>(
                      <div key={slotIdx} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr auto",gap:"8px",alignItems:"center"}}>
                        <input placeholder="Subject" value={slot.subject} onChange={e=>updateSlot(dayIdx,slotIdx,"subject",e.target.value)}
                          style={{padding:"8px 12px",border:"1.5px solid #e2e8f0",borderRadius:"8px",fontSize:"12px",outline:"none"}} />
                        <input type="time" value={slot.startTime} onChange={e=>updateSlot(dayIdx,slotIdx,"startTime",e.target.value)}
                          style={{padding:"8px 12px",border:"1.5px solid #e2e8f0",borderRadius:"8px",fontSize:"12px",outline:"none"}} />
                        <input type="time" value={slot.endTime} onChange={e=>updateSlot(dayIdx,slotIdx,"endTime",e.target.value)}
                          style={{padding:"8px 12px",border:"1.5px solid #e2e8f0",borderRadius:"8px",fontSize:"12px",outline:"none"}} />
                        <select value={slot.teacherId} onChange={e=>updateSlot(dayIdx,slotIdx,"teacherId",e.target.value)}
                          style={{padding:"8px 12px",border:"1.5px solid #e2e8f0",borderRadius:"8px",fontSize:"12px",outline:"none"}}>
                          <option value="">Teacher (optional)</option>
                          {staff.map(s=><option key={s._id} value={s._id}>{s.userId?.name}</option>)}
                        </select>
                        <button onClick={()=>removeSlot(dayIdx,slotIdx)}
                          style={{padding:"8px",background:"#fef2f2",color:"#dc2626",border:"none",borderRadius:"8px",cursor:"pointer",fontSize:"14px"}}>
                          🗑️
                        </button>
                      </div>
                    ))}
                    {dayObj.slots.length===0&&(
                      <p style={{color:"#cbd5e1",fontSize:"12px"}}>No slots — click "+ Add Slot"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{display:"flex",gap:"12px",marginTop:"24px"}}>
              <button onClick={()=>setShowEdit(false)} style={{flex:1,padding:"12px",border:"1.5px solid #e2e8f0",borderRadius:"10px",cursor:"pointer",background:"#fff",color:"#64748b",fontWeight:600}}>Cancel</button>
              <button onClick={handleSave} disabled={saveTimetable.isPending}
                style={{flex:2,padding:"12px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",cursor:"pointer",fontWeight:700,fontSize:"14px"}}>
                {saveTimetable.isPending?"Saving...":"💾 Save Timetable"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
