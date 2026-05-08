import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";

const GRADE_COLOR = { "A+":"#16a34a","A":"#16a34a","B+":"#0891b2","B":"#0891b2","C":"#d97706","D":"#d97706","F":"#dc2626" };

export default function Tests() {
  const qc = useQueryClient();
  const [tab,         setTab]         = useState("tests");
  const [showCreate,  setShowCreate]  = useState(false);
  const [selectedTest,setSelectedTest]= useState(null);
  const [marksMap,    setMarksMap]    = useState({});
  const [form, setForm] = useState({ name:"",subject:"",batchId:"",branchId:"",date:new Date().toISOString().slice(0,10),totalMarks:100,passingMarks:40 });

  const { data: tests=[]   } = useQuery({ queryKey:["tests"],   queryFn:()=>api.get("/tests").then(r=>r.data.data) });
  const { data: batches=[]  } = useQuery({ queryKey:["batches"], queryFn:()=>api.get("/batches").then(r=>r.data.data) });
  const { data: branches=[] } = useQuery({ queryKey:["branches"],queryFn:()=>api.get("/branches").then(r=>r.data.data) });
  const { data: testStudents=[], isLoading:loadingStudents } = useQuery({
    queryKey:["batch-students-for-test", selectedTest?.batchId],
    queryFn:()=>api.get(`/batches/${selectedTest.batchId._id||selectedTest.batchId}/students`).then(r=>r.data.data),
    enabled:!!selectedTest&&tab==="results",
    onSuccess:(data)=>{ const m={}; data.forEach(s=>{ m[s._id]=""; }); setMarksMap(m); }
  });
  const { data: existingResults=[] } = useQuery({
    queryKey:["test-results",selectedTest?._id],
    queryFn:()=>api.get(`/tests/${selectedTest._id}/results`).then(r=>r.data.data.results),
    enabled:!!selectedTest&&tab==="results",
  });

  const createTest = useMutation({
    mutationFn:(d)=>api.post("/tests",d),
    onSuccess:()=>{ qc.invalidateQueries(["tests"]); toast.success("Test created!"); setShowCreate(false); },
    onError:(e)=>toast.error(e.response?.data?.message||"Failed"),
  });
  const enterResults = useMutation({
    mutationFn:({id,results})=>api.post(`/tests/${id}/results`,{results}),
    onSuccess:()=>{ qc.invalidateQueries(["test-results",selectedTest?._id]); toast.success("Results saved!"); },
    onError:(e)=>toast.error(e.response?.data?.message||"Failed"),
  });

  const handleSaveResults = ()=>{
    const results = Object.entries(marksMap)
      .filter(([,m])=>m!=="")
      .map(([studentId,marksObtained])=>({ studentId, marksObtained:Number(marksObtained) }));
    if (!results.length) return toast.error("Enter at least one mark");
    enterResults.mutate({ id:selectedTest._id, results });
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"24px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div><h1 style={{fontSize:"24px",fontWeight:800,color:"#0f172a"}}>Tests & Results</h1>
          <p style={{fontSize:"13px",color:"#94a3b8",marginTop:"2px"}}>Create tests, enter marks, auto-generate rankings</p>
        </div>
        <button onClick={()=>setShowCreate(true)}
          style={{padding:"10px 20px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",fontSize:"13px",fontWeight:600,cursor:"pointer"}}>
          + Create Test
        </button>
      </div>

      <div style={{display:"flex",gap:"4px",background:"#f1f5f9",borderRadius:"12px",padding:"4px",width:"fit-content"}}>
        {[{id:"tests",label:"📝 All Tests"},{id:"results",label:"📊 Enter Results"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"8px 20px",borderRadius:"9px",border:"none",cursor:"pointer",fontSize:"13px",fontWeight:600,
              background:tab===t.id?"#fff":"transparent",color:tab===t.id?"#0f172a":"#64748b",
              boxShadow:tab===t.id?"0 1px 3px rgba(0,0,0,0.1)":"none"}}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==="tests"&&(
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",overflow:"hidden"}}>
          {tests.length===0?(
            <div style={{padding:"60px",textAlign:"center",color:"#94a3b8"}}>📝 No tests yet. Create your first test!</div>
          ):(
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:"13px"}}>
              <thead><tr style={{background:"#f8fafc"}}>
                {["Test Name","Batch","Subject","Date","Total Marks","Action"].map(h=>(
                  <th key={h} style={{textAlign:"left",padding:"12px 16px",color:"#64748b",fontWeight:600,fontSize:"12px"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {tests.map((t,i)=>(
                  <tr key={t._id} style={{borderTop:"1px solid #f8fafc",background:i%2===0?"#fff":"#fafafa"}}>
                    <td style={{padding:"13px 16px",fontWeight:600,color:"#0f172a"}}>{t.name}</td>
                    <td style={{padding:"13px 16px",color:"#64748b"}}>{t.batchId?.name||"—"}</td>
                    <td style={{padding:"13px 16px",color:"#64748b"}}>{t.subject||"—"}</td>
                    <td style={{padding:"13px 16px",color:"#94a3b8"}}>{new Date(t.date).toLocaleDateString("en-IN")}</td>
                    <td style={{padding:"13px 16px",fontWeight:600}}>{t.totalMarks}</td>
                    <td style={{padding:"13px 16px"}}>
                      <button onClick={()=>{ setSelectedTest(t); setTab("results"); }}
                        style={{padding:"6px 14px",background:"#eff6ff",color:"#1a56db",border:"none",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:600}}>
                        Enter Results
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab==="results"&&(
        <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
          <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"16px 20px"}}>
            <label style={{fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"8px",display:"block"}}>SELECT TEST</label>
            <select value={selectedTest?._id||""} onChange={e=>setSelectedTest(tests.find(t=>t._id===e.target.value)||null)}
              style={{width:"100%",maxWidth:"400px",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}}>
              <option value="">Choose test...</option>
              {tests.map(t=><option key={t._id} value={t._id}>{t.name} — {t.batchId?.name}</option>)}
            </select>
          </div>

          {selectedTest&&(
            <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",overflow:"hidden"}}>
              <div style={{padding:"16px 20px",borderBottom:"1px solid #f8fafc",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <p style={{fontWeight:700,color:"#0f172a"}}>{selectedTest.name}</p>
                  <p style={{fontSize:"12px",color:"#94a3b8"}}>Total Marks: {selectedTest.totalMarks} · Passing: {selectedTest.passingMarks}</p>
                </div>
                <button onClick={handleSaveResults} disabled={enterResults.isPending}
                  style={{padding:"10px 24px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",fontWeight:700,cursor:"pointer",fontSize:"13px"}}>
                  {enterResults.isPending?"Saving...":"Save & Rank"}
                </button>
              </div>

              {loadingStudents?<div style={{padding:"40px",textAlign:"center",color:"#94a3b8"}}>Loading...</div>:(
                existingResults.length>0?(
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:"13px"}}>
                    <thead><tr style={{background:"#f8fafc"}}>
                      {["Rank","Student","Marks","Percentage","Grade","Status"].map(h=>(
                        <th key={h} style={{textAlign:"left",padding:"12px 16px",color:"#64748b",fontWeight:600,fontSize:"12px"}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {existingResults.map((r,i)=>(
                        <tr key={r._id} style={{borderTop:"1px solid #f8fafc",background:i%2===0?"#fff":"#fafafa"}}>
                          <td style={{padding:"13px 16px"}}>
                            <span style={{fontWeight:800,color:r.rank<=3?"#d97706":"#64748b",fontSize:"16px"}}>#{r.rank}</span>
                          </td>
                          <td style={{padding:"13px 16px",fontWeight:600,color:"#0f172a"}}>{r.studentId?.name}</td>
                          <td style={{padding:"13px 16px"}}>{r.marksObtained}/{selectedTest.totalMarks}</td>
                          <td style={{padding:"13px 16px"}}>{r.percentage}%</td>
                          <td style={{padding:"13px 16px"}}>
                            <span style={{padding:"3px 10px",borderRadius:"99px",fontSize:"11px",fontWeight:700,background:`${GRADE_COLOR[r.grade]}20`,color:GRADE_COLOR[r.grade]||"#64748b"}}>{r.grade}</span>
                          </td>
                          <td style={{padding:"13px 16px"}}>
                            <span style={{color:r.isPassed?"#16a34a":"#dc2626",fontWeight:600,fontSize:"12px"}}>{r.isPassed?"✅ Pass":"❌ Fail"}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ):(
                  <div>
                    {testStudents.map((st,i)=>(
                      <div key={st._id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 20px",borderTop:i>0?"1px solid #f8fafc":"none",background:i%2===0?"#fff":"#fafafa"}}>
                        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                          <div style={{width:"34px",height:"34px",borderRadius:"50%",background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"#1a56db",fontSize:"13px"}}>{st.name[0]}</div>
                          <p style={{fontWeight:600,color:"#0f172a",fontSize:"13px"}}>{st.name}</p>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                          <input type="number" min="0" max={selectedTest.totalMarks}
                            value={marksMap[st._id]||""}
                            onChange={e=>setMarksMap({...marksMap,[st._id]:e.target.value})}
                            placeholder={`0 - ${selectedTest.totalMarks}`}
                            style={{width:"120px",padding:"8px 12px",border:"1.5px solid #e2e8f0",borderRadius:"8px",fontSize:"13px",outline:"none",textAlign:"center"}} />
                          <span style={{fontSize:"12px",color:"#94a3b8"}}>/ {selectedTest.totalMarks}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreate&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}
          onClick={e=>e.target===e.currentTarget&&setShowCreate(false)}>
          <div style={{background:"#fff",borderRadius:"20px",padding:"32px",width:"100%",maxWidth:"480px",boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}}>
            <h2 style={{fontSize:"18px",fontWeight:800,color:"#0f172a",marginBottom:"24px"}}>Create Test</h2>
            <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
              <div><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>TEST NAME *</label>
                <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Unit Test 1"
                  style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} /></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>BATCH *</label>
                  <select value={form.batchId} onChange={e=>{ const b=batches.find(x=>x._id===e.target.value); setForm({...form,batchId:e.target.value,branchId:b?.branchId||""}); }}
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}}>
                    <option value="">Select...</option>
                    {batches.map(b=><option key={b._id} value={b._id}>{b.name}</option>)}
                  </select></div>
                <div><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>SUBJECT</label>
                  <input value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="Math"
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} /></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px"}}>
                <div><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>DATE</label>
                  <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} /></div>
                <div><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>TOTAL MARKS</label>
                  <input type="number" value={form.totalMarks} onChange={e=>setForm({...form,totalMarks:e.target.value})}
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} /></div>
                <div><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>PASSING</label>
                  <input type="number" value={form.passingMarks} onChange={e=>setForm({...form,passingMarks:e.target.value})}
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} /></div>
              </div>
            </div>
            <div style={{display:"flex",gap:"12px",marginTop:"24px"}}>
              <button onClick={()=>setShowCreate(false)} style={{flex:1,padding:"11px",border:"1.5px solid #e2e8f0",borderRadius:"10px",cursor:"pointer",background:"#fff",color:"#64748b",fontWeight:600}}>Cancel</button>
              <button onClick={()=>createTest.mutate(form)} disabled={createTest.isPending}
                style={{flex:1,padding:"11px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",cursor:"pointer",fontWeight:700}}>
                {createTest.isPending?"Creating...":"Create Test"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
