import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";

export default function Settings() {
  const qc = useQueryClient();
  const { user, setUser } = useAuthStore();
  const [tab, setTab] = useState("institute");
  const [form, setForm] = useState({ instituteName:"",address:"",phone:"",email:"",website:"",primaryColor:"#1a56db" });
  const [notifForm, setNotifForm] = useState({ feeReminder:true,attendanceAlert:true,resultNotify:true,reminderDaysBefore:3 });
  const [attForm,   setAttForm]   = useState({ minPercentage:80 });

  const { data:settings } = useQuery({ queryKey:["settings"], queryFn:()=>api.get("/settings").then(r=>r.data.data) });

  useEffect(()=>{
    if (settings) {
      setForm({ instituteName:settings.institute?.name||"", address:settings.institute?.address||"", phone:settings.institute?.phone||"", email:settings.institute?.email||"", website:settings.institute?.website||"", primaryColor:settings.branding?.primaryColor||"#1a56db" });
      setNotifForm(settings.notifications||notifForm);
      setAttForm({ minPercentage:settings.attendance?.minPercentage||80 });
    }
  },[settings]);

  const updateBranding = useMutation({
    mutationFn:(d)=>api.put("/settings/branding",d),
    onSuccess:(res)=>{ qc.invalidateQueries(["settings"]); toast.success("Branding updated!"); const u={...user,branding:{...user.branding,instituteName:form.instituteName,primaryColor:form.primaryColor}}; setUser(u); },
    onError:(e)=>toast.error(e.response?.data?.message||"Failed"),
  });
  const updateSettings = useMutation({
    mutationFn:(d)=>api.put("/settings",d),
    onSuccess:()=>{ qc.invalidateQueries(["settings"]); toast.success("Settings saved!"); },
    onError:(e)=>toast.error(e.response?.data?.message||"Failed"),
  });

  const TABS = [{id:"institute",label:"🏫 Institute"},{id:"notifications",label:"🔔 Notifications"},{id:"attendance",label:"📋 Attendance"},{id:"account",label:"👤 Account"}];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"24px",maxWidth:"760px"}}>
      <div><h1 style={{fontSize:"24px",fontWeight:800,color:"#0f172a"}}>Settings</h1>
        <p style={{fontSize:"13px",color:"#94a3b8",marginTop:"2px"}}>Configure your institute preferences</p></div>

      <div style={{display:"flex",gap:"4px",background:"#f1f5f9",borderRadius:"12px",padding:"4px",width:"fit-content"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"8px 16px",borderRadius:"9px",border:"none",cursor:"pointer",fontSize:"13px",fontWeight:600,
              background:tab===t.id?"#fff":"transparent",color:tab===t.id?"#0f172a":"#64748b",
              boxShadow:tab===t.id?"0 1px 3px rgba(0,0,0,0.1)":"none"}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Institute Tab */}
      {tab==="institute"&&(
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"28px"}}>
          <h3 style={{fontWeight:700,color:"#0f172a",marginBottom:"20px"}}>Institute Information</h3>
          <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
            {[["Institute Name","instituteName","text","Kamal Coaching Center"],["Address","address","text","MG Road, Cuttack"],["Phone","phone","tel","0671-1234567"],["Email","email","email","info@kamalcoaching.com"],["Website","website","url","www.kamalcoaching.com"]].map(([label,key,type,ph])=>(
              <div key={key}><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>{label.toUpperCase()}</label>
                <input type={type} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} placeholder={ph}
                  style={{width:"100%",padding:"11px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} /></div>
            ))}
            <div><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"8px"}}>BRAND COLOR</label>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <input type="color" value={form.primaryColor} onChange={e=>setForm({...form,primaryColor:e.target.value})}
                  style={{width:"48px",height:"48px",border:"none",borderRadius:"10px",cursor:"pointer",padding:"2px"}} />
                <div style={{flex:1,padding:"11px 14px",background:form.primaryColor,borderRadius:"10px",color:"#fff",fontSize:"13px",fontWeight:600}}>
                  Preview: {form.primaryColor}
                </div>
              </div>
            </div>
          </div>
          <button onClick={()=>updateBranding.mutate({instituteName:form.instituteName,primaryColor:form.primaryColor,logo:null,domain:null})} disabled={updateBranding.isPending}
            style={{marginTop:"20px",padding:"12px 28px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",fontWeight:700,cursor:"pointer",fontSize:"14px"}}>
            {updateBranding.isPending?"Saving...":"Save Changes"}
          </button>
        </div>
      )}

      {/* Notifications Tab */}
      {tab==="notifications"&&(
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"28px"}}>
          <h3 style={{fontWeight:700,color:"#0f172a",marginBottom:"20px"}}>Notification Settings</h3>
          <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
            {[
              {key:"feeReminder",    label:"Fee Due Reminders",       desc:"Send WhatsApp reminder before fee due date"},
              {key:"attendanceAlert",label:"Low Attendance Alerts",   desc:"Alert parents when attendance drops below minimum"},
              {key:"resultNotify",   label:"Result Notifications",    desc:"Notify parents when test results are published"},
            ].map(({key,label,desc})=>(
              <div key={key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px",background:"#f8fafc",borderRadius:"12px"}}>
                <div>
                  <p style={{fontWeight:600,color:"#0f172a",fontSize:"14px"}}>{label}</p>
                  <p style={{fontSize:"12px",color:"#94a3b8",marginTop:"2px"}}>{desc}</p>
                </div>
                <button onClick={()=>setNotifForm({...notifForm,[key]:!notifForm[key]})}
                  style={{width:"48px",height:"26px",borderRadius:"99px",border:"none",cursor:"pointer",transition:"background 0.2s",
                    background:notifForm[key]?"#1a56db":"#e2e8f0",position:"relative"}}>
                  <div style={{position:"absolute",top:"3px",width:"20px",height:"20px",borderRadius:"50%",background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,0.2)",transition:"left 0.2s",left:notifForm[key]?"25px":"3px"}} />
                </button>
              </div>
            ))}
            <div><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>REMINDER DAYS BEFORE DUE DATE</label>
              <input type="number" min="1" max="10" value={notifForm.reminderDaysBefore} onChange={e=>setNotifForm({...notifForm,reminderDaysBefore:Number(e.target.value)})}
                style={{width:"120px",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}} /></div>
          </div>
          <button onClick={()=>updateSettings.mutate({notifications:notifForm})} disabled={updateSettings.isPending}
            style={{marginTop:"20px",padding:"12px 28px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",fontWeight:700,cursor:"pointer",fontSize:"14px"}}>
            {updateSettings.isPending?"Saving...":"Save Settings"}
          </button>
        </div>
      )}

      {/* Attendance Tab */}
      {tab==="attendance"&&(
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"28px"}}>
          <h3 style={{fontWeight:700,color:"#0f172a",marginBottom:"20px"}}>Attendance Settings</h3>
          <div><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"8px"}}>MINIMUM ATTENDANCE PERCENTAGE</label>
            <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
              <input type="range" min="50" max="100" value={attForm.minPercentage} onChange={e=>setAttForm({minPercentage:Number(e.target.value)})}
                style={{flex:1,accentColor:"#1a56db"}} />
              <span style={{fontSize:"24px",fontWeight:800,color:"#1a56db",minWidth:"60px"}}>{attForm.minPercentage}%</span>
            </div>
            <p style={{fontSize:"12px",color:"#94a3b8",marginTop:"8px"}}>Students below this threshold will trigger automatic alerts to parents.</p>
          </div>
          <button onClick={()=>updateSettings.mutate({attendance:attForm})} disabled={updateSettings.isPending}
            style={{marginTop:"20px",padding:"12px 28px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",fontWeight:700,cursor:"pointer",fontSize:"14px"}}>
            {updateSettings.isPending?"Saving...":"Save Settings"}
          </button>
        </div>
      )}

      {/* Account Tab */}
      {tab==="account"&&(
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"28px"}}>
          <h3 style={{fontWeight:700,color:"#0f172a",marginBottom:"20px"}}>Account Information</h3>
          <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
            {[["Name",user?.name],["Email",user?.email],["Phone",user?.phone||"—"],["Role",user?.role],["Institute",user?.branding?.instituteName]].map(([label,val])=>(
              <div key={label} style={{display:"flex",justifyContent:"space-between",padding:"14px 16px",background:"#f8fafc",borderRadius:"10px"}}>
                <p style={{fontSize:"13px",color:"#64748b",fontWeight:500}}>{label}</p>
                <p style={{fontSize:"13px",color:"#0f172a",fontWeight:600,textTransform:"capitalize"}}>{val}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
