import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import { isPositiveNumber } from "../../utils/validation";
import Pagination from "../../components/ui/Pagination";
import ReceiptPrintModal from "../../components/ui/ReceiptPrintModal";

const MODE_COLORS = { cash:"#16a34a", upi:"#7c3aed", cheque:"#d97706", online:"#0891b2" };

export default function Fees() {
  const qc = useQueryClient();
  const [tab,       setTab]       = useState("collect");
  const [search,    setSearch]    = useState("");
  const [found,     setFound]     = useState(null);
  const [searching, setSearching] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [genForm,   setGenForm]   = useState({ batchId:"", month:new Date().toISOString().slice(0,7), dueDate:"" });
  const [form, setForm] = useState({ amount:"", discount:"0", paymentMode:"cash", month:new Date().toISOString().slice(0,7), note:"" });
  const [lastReceipt, setLastReceipt] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [printFee, setPrintFee] = useState(null);
  const [amountError, setAmountError] = useState("");
  const [allFeesPage,   setAllFeesPage]   = useState(1);
  const [allFeesStatus, setAllFeesStatus] = useState("");

  const downloadReceipt = async (feeId, receiptNumber) => {
    setDownloadingId(feeId);
    try {
      const res = await api.get(`/fees/${feeId}/receipt`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `Receipt-${receiptNumber || feeId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download receipt");
    } finally {
      setDownloadingId(null);
    }
  };

  const { data:pending=[]  } = useQuery({ queryKey:["pending-fees"], queryFn:()=>api.get("/fees/pending").then(r=>r.data.data.fees) });
  const { data:feeReport   } = useQuery({ queryKey:["fee-report"],   queryFn:()=>api.get(`/fees/report?month=${new Date().toISOString().slice(0,7)}`).then(r=>r.data.data) });
  const { data:branches=[] } = useQuery({ queryKey:["branches"],     queryFn:()=>api.get("/branches").then(r=>r.data.data) });
  const { data:batches=[]  } = useQuery({ queryKey:["batches"],      queryFn:()=>api.get("/batches").then(r=>r.data.data) });
  const { data:allFeesData, isLoading:allFeesLoading } = useQuery({
    queryKey:["all-fees",allFeesPage,allFeesStatus],
    queryFn:()=>api.get(`/fees?page=${allFeesPage}&limit=15${allFeesStatus?`&status=${allFeesStatus}`:""}`).then(r=>r.data.data),
    enabled: tab==="all",
    keepPreviousData: true,
  });

  const searchStudent = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await api.get(`/students/search?q=${search}`);
      const students = res.data.data;
      if (students.length===0) toast.error("Student not found");
      else setFound(students[0]);
    } catch { toast.error("Search failed"); }
    finally { setSearching(false); }
  };

  const collect = useMutation({
    mutationFn:(d)=>api.post("/fees/collect",d),
    onSuccess:(res)=>{
      toast.success(`✅ Receipt ${res.data.data.receiptNumber} generated!`);
      qc.invalidateQueries(["pending-fees"]);
      qc.invalidateQueries(["fee-report"]);
      setLastReceipt(res.data.data);
      setFound(null); setSearch("");
      setForm({ amount:"",discount:"0",paymentMode:"cash",month:new Date().toISOString().slice(0,7),note:"" });
    },
    onError:(e)=>toast.error(e.response?.data?.message||"Failed"),
  });

  const waiveFee = useMutation({
    mutationFn:({id,reason})=>api.put(`/fees/${id}/waive`,{reason}),
    onSuccess:()=>{ qc.invalidateQueries(["pending-fees"]); toast.success("Fee waived!"); },
    onError:(e)=>toast.error(e.response?.data?.message||"Failed"),
  });

  const generateFees = useMutation({
    mutationFn:(d)=>api.post("/fees/generate-batch",d),
    onSuccess:(res)=>{ toast.success("Fees generated!"); setShowGenerate(false); qc.invalidateQueries(["pending-fees"]); },
    onError:(e)=>toast.error(e.response?.data?.message||"Failed"),
  });

  const handleCollect = () => {
    if (!found) return toast.error("Search student first");
    const amtError = isPositiveNumber(form.amount) || (!form.amount ? "Amount is required" : "");
    if (amtError) { setAmountError(amtError); return toast.error(amtError); }
    if (Number(form.discount||0) > Number(form.amount)) {
      setAmountError("Discount cannot be greater than amount");
      return toast.error("Discount cannot be greater than amount");
    }
    setAmountError("");
    collect.mutate({
      studentId:   found._id,
      batchId:     found.currentBatch?._id||found.currentBatch,
      branchId:    found.branchId||branches[0]?._id,
      amount:      Number(form.amount),
      discount:    Number(form.discount)||0,
      paymentMode: form.paymentMode,
      month:       form.month,
      note:        form.note,
    });
  };

  const TABS = [
    {id:"collect", label:"💰 Collect Fee"},
    {id:"pending", label:`⚠️ Pending (${pending.length})`},
    {id:"generate",label:"⚡ Generate Fees"},
    {id:"all",     label:"📄 All Fees"},
    {id:"report",  label:"📊 Report"},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"24px"}}>
      <div>
        <h1 style={{fontSize:"24px",fontWeight:800,color:"#0f172a"}}>Fee Management</h1>
        <p style={{fontSize:"13px",color:"#94a3b8",marginTop:"2px"}}>Collect fees, track pending, generate receipts</p>
      </div>

      {/* Summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"16px"}}>
        {[
          {label:"Collected This Month", val:`₹${(feeReport?.totalCollected||0).toLocaleString()}`, emoji:"💰", bg:"#f0fdf4", color:"#16a34a"},
          {label:"Pending Amount",       val:`₹${pending.reduce((s,f)=>s+f.finalAmount,0).toLocaleString()}`, emoji:"⚠️", bg:"#fef2f2", color:"#dc2626"},
          {label:"Pending Students",     val:pending.length, emoji:"👥", bg:"#fffbeb", color:"#d97706"},
        ].map(({label,val,emoji,bg,color})=>(
          <div key={label} style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"20px",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
              <p style={{fontSize:"12px",fontWeight:600,color:"#94a3b8",textTransform:"uppercase"}}>{label}</p>
              <div style={{width:"36px",height:"36px",background:bg,borderRadius:"10px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px"}}>{emoji}</div>
            </div>
            <p style={{fontSize:"24px",fontWeight:800,color}}>{val}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:"4px",background:"#f1f5f9",borderRadius:"12px",padding:"4px",flexWrap:"wrap"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"8px 16px",borderRadius:"9px",border:"none",cursor:"pointer",fontSize:"13px",fontWeight:600,
              background:tab===t.id?"#fff":"transparent",color:tab===t.id?"#0f172a":"#64748b",
              boxShadow:tab===t.id?"0 1px 3px rgba(0,0,0,0.1)":"none"}}>
            {t.label}
          </button>
        ))}
      </div>

      {lastReceipt&&(
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:"12px"}}>
          <p style={{fontSize:"13px",color:"#15803d",fontWeight:600}}>
            ✅ Receipt <strong>{lastReceipt.receiptNumber}</strong> for {lastReceipt.studentId?.name} is ready
          </p>
          <div style={{display:"flex",gap:"8px"}}>
            <button onClick={()=>setPrintFee(lastReceipt)}
              style={{padding:"7px 14px",background:"#fff",color:"#15803d",border:"1.5px solid #bbf7d0",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:700}}>
              🖨️ Print
            </button>
            <button onClick={()=>downloadReceipt(lastReceipt._id, lastReceipt.receiptNumber)} disabled={downloadingId===lastReceipt._id}
              style={{padding:"7px 14px",background:"#16a34a",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:700}}>
              {downloadingId===lastReceipt._id?"Downloading...":"⬇️ Download PDF"}
            </button>
            <button onClick={()=>setLastReceipt(null)}
              style={{padding:"7px 10px",background:"transparent",color:"#15803d",border:"none",cursor:"pointer",fontSize:"12px"}}>
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Collect Tab */}
      {tab==="collect"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"}}>
          <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"24px"}}>
            <h3 style={{fontWeight:700,color:"#0f172a",marginBottom:"16px"}}>Search Student</h3>
            <div style={{display:"flex",gap:"10px",marginBottom:"16px"}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchStudent()}
                placeholder="Name or phone number..."
                style={{flex:1,padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}} />
              <button onClick={searchStudent}
                style={{padding:"10px 18px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",fontWeight:600,cursor:"pointer",fontSize:"13px"}}>
                {searching?"...":"Search"}
              </button>
            </div>
            {found&&(
              <div style={{padding:"16px",background:"#f8fafc",borderRadius:"12px",border:"1px solid #e2e8f0"}}>
                <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"10px"}}>
                  <div style={{width:"40px",height:"40px",borderRadius:"10px",background:"#1a56db",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>
                    {found.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p style={{fontWeight:700,color:"#0f172a"}}>{found.name}</p>
                    <p style={{fontSize:"12px",color:"#94a3b8"}}>{found.phone||found.guardianPhone}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"24px"}}>
            <h3 style={{fontWeight:700,color:"#0f172a",marginBottom:"16px"}}>Collect Payment</h3>
            <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
              <div>
                <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>AMOUNT *</label>
                <input type="number" value={form.amount} onChange={e=>{setForm({...form,amount:e.target.value}); if(amountError) setAmountError("");}} placeholder="0"
                  style={{width:"100%",padding:"10px 14px",border:amountError?"1.5px solid #dc2626":"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
                {amountError && <p style={{color:"#dc2626",fontSize:"11px",marginTop:"4px",fontWeight:500}}>{amountError}</p>}
              </div>
              <div>
                <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>DISCOUNT</label>
                <input type="number" value={form.discount} onChange={e=>setForm({...form,discount:e.target.value})}
                  style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
              </div>
              <div>
                <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>PAYMENT MODE</label>
                <div style={{display:"flex",gap:"8px"}}>
                  {["cash","upi","cheque","online"].map(m=>(
                    <button key={m} onClick={()=>setForm({...form,paymentMode:m})}
                      style={{flex:1,padding:"8px",borderRadius:"8px",border:form.paymentMode===m?`1.5px solid ${MODE_COLORS[m]}`:"1.5px solid #e2e8f0",
                        background:form.paymentMode===m?`${MODE_COLORS[m]}15`:"#fff",color:form.paymentMode===m?MODE_COLORS[m]:"#64748b",
                        fontWeight:600,fontSize:"12px",cursor:"pointer",textTransform:"uppercase"}}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div>
                  <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>MONTH</label>
                  <input type="month" value={form.month} onChange={e=>setForm({...form,month:e.target.value})}
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
                </div>
                <div>
                  <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>NET PAYABLE</label>
                  <p style={{fontSize:"22px",fontWeight:800,color:"#16a34a",paddingTop:"6px"}}>₹{(Number(form.amount||0)-Number(form.discount||0)).toLocaleString()}</p>
                </div>
              </div>
              <div>
                <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>NOTE (optional)</label>
                <input value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="e.g. Partial payment"
                  style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
              </div>
              <button onClick={handleCollect} disabled={collect.isPending}
                style={{width:"100%",padding:"13px",background:"#16a34a",color:"#fff",border:"none",borderRadius:"10px",fontWeight:700,cursor:"pointer",fontSize:"14px"}}>
                {collect.isPending?"Processing...":"💰 Collect Fee & Generate Receipt"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Tab */}
      {tab==="pending"&&(
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",overflow:"hidden"}}>
          <div style={{padding:"16px 20px",borderBottom:"1px solid #f8fafc",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <p style={{fontWeight:700,color:"#0f172a"}}>{pending.length} Pending Payments</p>
            <p style={{fontSize:"13px",color:"#dc2626",fontWeight:600}}>Total: ₹{pending.reduce((s,f)=>s+f.finalAmount,0).toLocaleString()}</p>
          </div>
          {pending.length===0?(
            <div style={{padding:"60px",textAlign:"center",color:"#94a3b8"}}>✅ No pending fees!</div>
          ):(
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:"13px"}}>
              <thead><tr style={{background:"#f8fafc"}}>
                {["Student","Batch","Month","Amount","Due Date","Action"].map(h=>(
                  <th key={h} style={{textAlign:"left",padding:"12px 16px",color:"#64748b",fontWeight:600,fontSize:"12px"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {pending.map((f,i)=>(
                  <tr key={f._id} style={{borderTop:"1px solid #f8fafc",background:i%2===0?"#fff":"#fafafa"}}>
                    <td style={{padding:"12px 16px"}}>
                      <p style={{fontWeight:600,color:"#0f172a"}}>{f.studentId?.name}</p>
                      <p style={{fontSize:"11px",color:"#94a3b8"}}>{f.studentId?.guardianPhone||f.studentId?.phone}</p>
                    </td>
                    <td style={{padding:"12px 16px",color:"#64748b"}}>{f.batchId?.name||"—"}</td>
                    <td style={{padding:"12px 16px",color:"#64748b"}}>{f.month}</td>
                    <td style={{padding:"12px 16px",fontWeight:700,color:"#dc2626"}}>₹{f.finalAmount?.toLocaleString()}</td>
                    <td style={{padding:"12px 16px",color:"#94a3b8"}}>{f.dueDate?new Date(f.dueDate).toLocaleDateString("en-IN"):"—"}</td>
                    <td style={{padding:"12px 16px"}}>
                      <button onClick={()=>{ const reason=window.prompt("Reason for waiving fee?"); if(reason) waiveFee.mutate({id:f._id,reason}); }}
                        style={{padding:"5px 10px",background:"#f5f3ff",color:"#7c3aed",border:"none",borderRadius:"7px",cursor:"pointer",fontSize:"11px",fontWeight:600}}>
                        Waive
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Generate Fees Tab */}
      {tab==="generate"&&(
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"28px",maxWidth:"500px"}}>
          <h3 style={{fontWeight:700,color:"#0f172a",marginBottom:"8px"}}>Generate Monthly Fees</h3>
          <p style={{fontSize:"13px",color:"#94a3b8",marginBottom:"20px"}}>Auto-create fee records for all students in a batch</p>
          <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
            <div>
              <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>SELECT BATCH *</label>
              <select value={genForm.batchId} onChange={e=>setGenForm({...genForm,batchId:e.target.value})}
                style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}}>
                <option value="">Choose batch...</option>
                {batches.map(b=><option key={b._id} value={b._id}>{b.name} (₹{b.feeStructure?.amount}/month)</option>)}
              </select>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
              <div>
                <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>MONTH *</label>
                <input type="month" value={genForm.month} onChange={e=>setGenForm({...genForm,month:e.target.value})}
                  style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
              </div>
              <div>
                <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>DUE DATE</label>
                <input type="date" value={genForm.dueDate} onChange={e=>setGenForm({...genForm,dueDate:e.target.value})}
                  style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
              </div>
            </div>
            <div style={{padding:"14px",background:"#fffbeb",borderRadius:"10px",border:"1px solid #fde68a"}}>
              <p style={{fontSize:"12px",color:"#92400e"}}>⚠️ This will create pending fee records for all active students in the selected batch. Already existing records will be skipped.</p>
            </div>
            <button onClick={()=>generateFees.mutate({ batchId:genForm.batchId, branchId:batches.find(b=>b._id===genForm.batchId)?.branchId, month:genForm.month, dueDate:genForm.dueDate })}
              disabled={!genForm.batchId||!genForm.month||generateFees.isPending}
              style={{padding:"12px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",fontWeight:700,cursor:"pointer",fontSize:"14px"}}>
              {generateFees.isPending?"Generating...":"⚡ Generate Fee Records"}
            </button>
          </div>
        </div>
      )}

      {/* All Fees Tab */}
      {tab==="all"&&(
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",overflow:"hidden"}}>
          <div style={{padding:"16px 20px",borderBottom:"1px solid #f8fafc",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"10px"}}>
            <p style={{fontWeight:700,color:"#0f172a"}}>All Fee Records</p>
            <select value={allFeesStatus} onChange={e=>{setAllFeesStatus(e.target.value); setAllFeesPage(1);}}
              style={{padding:"7px 12px",border:"1.5px solid #e2e8f0",borderRadius:"8px",fontSize:"12px",outline:"none"}}>
              <option value="">All statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="waived">Waived</option>
            </select>
          </div>
          {allFeesLoading?(
            <div style={{padding:"40px",textAlign:"center",color:"#94a3b8"}}>Loading...</div>
          ):!allFeesData?.fees?.length?(
            <div style={{padding:"60px",textAlign:"center",color:"#94a3b8"}}>No fee records found</div>
          ):(
            <>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"13px"}}>
                <thead><tr style={{background:"#f8fafc"}}>
                  {["Student","Batch","Month","Amount","Status","Receipt"].map(h=>(
                    <th key={h} style={{textAlign:"left",padding:"12px 16px",color:"#64748b",fontWeight:600,fontSize:"12px"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {allFeesData.fees.map((f,i)=>(
                    <tr key={f._id} style={{borderTop:"1px solid #f8fafc",background:i%2===0?"#fff":"#fafafa"}}>
                      <td style={{padding:"12px 16px",fontWeight:600,color:"#0f172a"}}>{f.studentId?.name||"—"}</td>
                      <td style={{padding:"12px 16px",color:"#64748b"}}>{f.batchId?.name||"—"}</td>
                      <td style={{padding:"12px 16px",color:"#64748b"}}>{f.month}</td>
                      <td style={{padding:"12px 16px",fontWeight:700}}>₹{f.finalAmount?.toLocaleString()}</td>
                      <td style={{padding:"12px 16px"}}>
                        <span style={{padding:"3px 8px",borderRadius:"99px",fontSize:"11px",fontWeight:600,
                          background:f.status==="paid"?"#f0fdf4":f.status==="pending"?"#fffbeb":"#f5f3ff",
                          color:f.status==="paid"?"#16a34a":f.status==="pending"?"#d97706":"#7c3aed",
                          textTransform:"capitalize"}}>
                          {f.status}
                        </span>
                      </td>
                      <td style={{padding:"12px 16px"}}>
                        {f.status==="paid"?(
                          <div style={{display:"flex",gap:"6px"}}>
                            <button onClick={()=>setPrintFee(f)}
                              style={{padding:"5px 8px",background:"#fff",color:"#64748b",border:"1px solid #e2e8f0",borderRadius:"7px",cursor:"pointer",fontSize:"11px",fontWeight:600}}>
                              🖨️
                            </button>
                            <button onClick={()=>downloadReceipt(f._id, f.receiptNumber)} disabled={downloadingId===f._id}
                              style={{padding:"5px 10px",background:"#eff6ff",color:"#1a56db",border:"none",borderRadius:"7px",cursor:"pointer",fontSize:"11px",fontWeight:600}}>
                              {downloadingId===f._id?"...":"⬇️ PDF"}
                            </button>
                          </div>
                        ):"—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={allFeesData.page||allFeesPage} pages={allFeesData.pages||1} total={allFeesData.total} onPageChange={setAllFeesPage} />
            </>
          )}
        </div>
      )}

      {/* Report Tab */}
      {tab==="report"&&(
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"24px"}}>
          <h3 style={{fontWeight:700,color:"#0f172a",marginBottom:"16px"}}>This Month Summary</h3>
          {feeReport?.byPaymentMode&&Object.keys(feeReport.byPaymentMode).length>0?(
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"20px"}}>
              {Object.entries(feeReport.byPaymentMode).map(([mode,amt])=>(
                <div key={mode} style={{padding:"16px",borderRadius:"12px",border:"1px solid #f1f5f9",textAlign:"center"}}>
                  <p style={{fontSize:"18px",fontWeight:800,color:MODE_COLORS[mode]||"#1a56db"}}>₹{amt.toLocaleString()}</p>
                  <p style={{fontSize:"12px",color:"#64748b",textTransform:"capitalize",marginTop:"4px"}}>{mode}</p>
                </div>
              ))}
            </div>
          ):null}
          <div style={{padding:"20px",background:"#f0fdf4",borderRadius:"12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <p style={{fontWeight:600,color:"#15803d"}}>Total Collected This Month</p>
            <p style={{fontSize:"28px",fontWeight:800,color:"#16a34a"}}>₹{(feeReport?.totalCollected||0).toLocaleString()}</p>
          </div>

          {feeReport?.fees?.length>0&&(
            <div style={{marginTop:"20px",border:"1px solid #f1f5f9",borderRadius:"12px",overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"13px"}}>
                <thead><tr style={{background:"#f8fafc"}}>
                  {["Student","Batch","Receipt No","Amount","Receipt"].map(h=>(
                    <th key={h} style={{textAlign:"left",padding:"12px 16px",color:"#64748b",fontWeight:600,fontSize:"12px"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {feeReport.fees.map((f,i)=>(
                    <tr key={f._id} style={{borderTop:"1px solid #f8fafc",background:i%2===0?"#fff":"#fafafa"}}>
                      <td style={{padding:"12px 16px",fontWeight:600,color:"#0f172a"}}>{f.studentId?.name||"—"}</td>
                      <td style={{padding:"12px 16px",color:"#64748b"}}>{f.batchId?.name||"—"}</td>
                      <td style={{padding:"12px 16px",color:"#64748b"}}>{f.receiptNumber||"—"}</td>
                      <td style={{padding:"12px 16px",fontWeight:700,color:"#16a34a"}}>₹{f.finalAmount?.toLocaleString()}</td>
                      <td style={{padding:"12px 16px"}}>
                        <div style={{display:"flex",gap:"6px"}}>
                          <button onClick={()=>setPrintFee(f)}
                            style={{padding:"5px 8px",background:"#fff",color:"#64748b",border:"1px solid #e2e8f0",borderRadius:"7px",cursor:"pointer",fontSize:"11px",fontWeight:600}}>
                            🖨️
                          </button>
                          <button onClick={()=>downloadReceipt(f._id, f.receiptNumber)} disabled={downloadingId===f._id}
                            style={{padding:"5px 10px",background:"#eff6ff",color:"#1a56db",border:"none",borderRadius:"7px",cursor:"pointer",fontSize:"11px",fontWeight:600}}>
                            {downloadingId===f._id?"...":"⬇️ PDF"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ReceiptPrintModal fee={printFee} onClose={()=>setPrintFee(null)} />
    </div>
  );
}
