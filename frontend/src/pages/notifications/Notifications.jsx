import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";
import { validateForm, isRequired } from "../../utils/validation";

const TYPES = [
  { id:"custom",         label:"📢 Custom Notice",      desc:"Send any message to all/batch" },
  { id:"fee_reminder",   label:"💰 Fee Reminder",       desc:"Remind parents about pending fees" },
  { id:"attendance_alert",label:"📋 Attendance Alert",  desc:"Alert parents about low attendance" },
  { id:"result",         label:"📊 Result Published",   desc:"Notify about new test results" },
];

const NOTIF_RULES = { title: [isRequired], message: [isRequired] };

export default function Notifications() {
  const [form, setForm] = useState({ type:"custom", title:"", message:"", channel:"whatsapp", recipientType:"all", batchId:"" });
  const [errors, setErrors] = useState({});
  const [tab, setTab] = useState("send");

  const { data:batches=[]  } = useQuery({ queryKey:["batches"],  queryFn:()=>api.get("/batches").then(r=>r.data.data) });
  const { data:history=[]  } = useQuery({ queryKey:["notif-history"], queryFn:()=>api.get("/notifications/history").then(r=>r.data.data), enabled: tab==="history" });

  const send = useMutation({
    mutationFn: (d) => api.post("/notifications/send", d),
    onSuccess: () => { toast.success("Notification queued!"); setForm({ type:"custom",title:"",message:"",channel:"whatsapp",recipientType:"all",batchId:"" }); },
    onError:   (e) => toast.error(e.response?.data?.message||"Failed"),
  });

  const handleSend = () => {
    const newErrors = validateForm(form, NOTIF_RULES);
    if (form.recipientType === "batch" && !form.batchId) newErrors.batchId = "Select a batch";
    if (Object.keys(newErrors).length) { setErrors(newErrors); toast.error("Please fix the highlighted fields"); return; }
    setErrors({});
    send.mutate(form);
  };

  const CHANNEL_INFO = {
    whatsapp: "📱 WhatsApp (Twilio required)",
    sms:      "💬 SMS (Twilio required)",
    email:    "📧 Email (SMTP required)",
    inapp:    "🔔 In-App only",
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"24px",maxWidth:"800px"}}>
      <div>
        <h1 style={{fontSize:"24px",fontWeight:800,color:"#0f172a"}}>Notifications</h1>
        <p style={{fontSize:"13px",color:"#94a3b8",marginTop:"2px"}}>Send messages to students, parents and staff</p>
      </div>

      <div style={{display:"flex",gap:"4px",background:"#f1f5f9",borderRadius:"12px",padding:"4px",width:"fit-content"}}>
        {[{id:"send",label:"📤 Send Message"},{id:"history",label:"📋 History"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"8px 20px",borderRadius:"9px",border:"none",cursor:"pointer",fontSize:"13px",fontWeight:600,
              background:tab===t.id?"#fff":"transparent",color:tab===t.id?"#0f172a":"#64748b",
              boxShadow:tab===t.id?"0 1px 3px rgba(0,0,0,0.1)":"none"}}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==="send"&&(
        <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
          {/* Notification Type */}
          <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"24px"}}>
            <h3 style={{fontWeight:700,color:"#0f172a",marginBottom:"16px"}}>Notification Type</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
              {TYPES.map(t=>(
                <button key={t.id} onClick={()=>setForm({...form,type:t.id})}
                  style={{padding:"14px",borderRadius:"12px",border:"1.5px solid",textAlign:"left",cursor:"pointer",
                    borderColor:form.type===t.id?"#1a56db":"#e2e8f0",
                    background:form.type===t.id?"#eff6ff":"#fff"}}>
                  <p style={{fontWeight:700,color:form.type===t.id?"#1a56db":"#0f172a",fontSize:"13px"}}>{t.label}</p>
                  <p style={{fontSize:"12px",color:"#94a3b8",marginTop:"4px"}}>{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Recipients */}
          <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"24px"}}>
            <h3 style={{fontWeight:700,color:"#0f172a",marginBottom:"16px"}}>Recipients</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
              <div>
                <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>SEND TO</label>
                <select value={form.recipientType} onChange={e=>setForm({...form,recipientType:e.target.value})}
                  style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}}>
                  <option value="all">All Students & Parents</option>
                  <option value="batch">Specific Batch</option>
                  <option value="parent">All Parents</option>
                  <option value="staff">All Staff</option>
                </select>
              </div>
              {form.recipientType==="batch"&&(
                <div>
                  <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>SELECT BATCH</label>
                  <select value={form.batchId} onChange={e=>{setForm({...form,batchId:e.target.value}); if(errors.batchId) setErrors({...errors,batchId:""});}}
                    style={{width:"100%",padding:"10px 14px",border:errors.batchId?"1.5px solid #dc2626":"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}}>
                    <option value="">Choose batch...</option>
                    {batches.map(b=><option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                  {errors.batchId && <p style={{color:"#dc2626",fontSize:"11px",marginTop:"4px",fontWeight:500}}>{errors.batchId}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Message */}
          <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"24px"}}>
            <h3 style={{fontWeight:700,color:"#0f172a",marginBottom:"16px"}}>Message</h3>
            <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
              <div>
                <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>TITLE</label>
                <input value={form.title} onChange={e=>{setForm({...form,title:e.target.value}); if(errors.title) setErrors({...errors,title:""});}} placeholder="e.g. School Closed Tomorrow"
                  style={{width:"100%",padding:"10px 14px",border:errors.title?"1.5px solid #dc2626":"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
                {errors.title && <p style={{color:"#dc2626",fontSize:"11px",marginTop:"4px",fontWeight:500}}>{errors.title}</p>}
              </div>
              <div>
                <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>MESSAGE</label>
                <textarea value={form.message} onChange={e=>{setForm({...form,message:e.target.value}); if(errors.message) setErrors({...errors,message:""});}}
                  placeholder="Type your message here..." rows={4}
                  style={{width:"100%",padding:"10px 14px",border:errors.message?"1.5px solid #dc2626":"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",resize:"none",boxSizing:"border-box"}} />
                {errors.message && <p style={{color:"#dc2626",fontSize:"11px",marginTop:"4px",fontWeight:500}}>{errors.message}</p>}
              </div>
              <div>
                <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"8px"}}>CHANNEL</label>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"8px"}}>
                  {Object.entries(CHANNEL_INFO).map(([key,label])=>(
                    <button key={key} onClick={()=>setForm({...form,channel:key})}
                      style={{padding:"10px 8px",borderRadius:"10px",border:"1.5px solid",cursor:"pointer",textAlign:"center",fontSize:"11px",fontWeight:600,
                        borderColor:form.channel===key?"#1a56db":"#e2e8f0",
                        background:form.channel===key?"#eff6ff":"#fff",
                        color:form.channel===key?"#1a56db":"#64748b"}}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{marginTop:"20px",padding:"12px 16px",background:"#fffbeb",borderRadius:"10px",border:"1px solid #fde68a"}}>
              <p style={{fontSize:"12px",color:"#92400e"}}>⚠️ WhatsApp/SMS requires Twilio credentials in backend. Email requires SMTP. In-app works always.</p>
            </div>

            <button onClick={handleSend} disabled={send.isPending}
              style={{marginTop:"16px",width:"100%",padding:"13px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",fontWeight:700,cursor:"pointer",fontSize:"14px"}}>
              {send.isPending?"Sending...":"📤 Send Notification"}
            </button>
          </div>
        </div>
      )}

      {tab==="history"&&(
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",overflow:"hidden"}}>
          <div style={{padding:"16px 20px",borderBottom:"1px solid #f8fafc"}}>
            <p style={{fontWeight:700,color:"#0f172a"}}>Notification History</p>
          </div>
          {history.length===0?(
            <div style={{padding:"60px",textAlign:"center",color:"#94a3b8"}}>🔔 No notifications sent yet</div>
          ):(
            <div>
              {history.map((n,i)=>(
                <div key={n._id} style={{padding:"16px 20px",borderBottom:i<history.length-1?"1px solid #f8fafc":"none",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <p style={{fontWeight:600,color:"#0f172a",fontSize:"14px"}}>{n.title}</p>
                    <p style={{fontSize:"12px",color:"#64748b",marginTop:"4px"}}>{n.message}</p>
                    <div style={{display:"flex",gap:"8px",marginTop:"8px"}}>
                      <span style={{padding:"2px 8px",borderRadius:"99px",fontSize:"11px",fontWeight:600,background:"#eff6ff",color:"#1a56db",textTransform:"capitalize"}}>{n.channel}</span>
                      <span style={{padding:"2px 8px",borderRadius:"99px",fontSize:"11px",fontWeight:600,background:"#f5f3ff",color:"#7c3aed",textTransform:"capitalize"}}>{n.recipientType}</span>
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0,marginLeft:"16px"}}>
                    <span style={{padding:"4px 10px",borderRadius:"99px",fontSize:"11px",fontWeight:600,
                      background:n.status==="sent"?"#f0fdf4":"#fef2f2",
                      color:n.status==="sent"?"#16a34a":"#dc2626"}}>
                      {n.status}
                    </span>
                    <p style={{fontSize:"11px",color:"#94a3b8",marginTop:"6px"}}>{new Date(n.createdAt).toLocaleDateString("en-IN")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
