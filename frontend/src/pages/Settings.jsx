import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";
import { validateForm, isRequired, isEmail, isPhone } from "../utils/validation";

const BRANCH_RULES = { name: [isRequired], phone: [isPhone], email: [isEmail] };

export default function Settings() {
  const qc = useQueryClient();
  const { user, setUser } = useAuthStore();
  const [tab, setTab] = useState("institute");
  const [form, setForm] = useState({ instituteName:"",address:"",phone:"",email:"",website:"",primaryColor:"#1a56db" });
  const [notifForm, setNotifForm] = useState({ feeReminder:true,attendanceAlert:true,resultNotify:true,reminderDaysBefore:3 });
  const [attForm, setAttForm] = useState({ minPercentage:80 });
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchForm, setBranchForm] = useState({ name:"",address:"",phone:"",email:"" });
  const [branchErrors, setBranchErrors] = useState({});

  const { data:settings } = useQuery({ queryKey:["settings"], queryFn:()=>api.get("/settings").then(r=>r.data.data) });
  const { data:branches=[], refetch:refetchBranches } = useQuery({ queryKey:["branches"], queryFn:()=>api.get("/branches").then(r=>r.data.data) });

  useEffect(()=>{
    if (settings) {
      setForm({ instituteName:settings.institute?.name||"", address:settings.institute?.address||"", phone:settings.institute?.phone||"", email:settings.institute?.email||"", website:settings.institute?.website||"", primaryColor:settings.branding?.primaryColor||"#1a56db" });
      setNotifForm(settings.notifications||notifForm);
      setAttForm({ minPercentage:settings.attendance?.minPercentage||80 });
    }
  },[settings]);

  const updateBranding = useMutation({
    mutationFn:(d)=>api.put("/settings/branding",d),
    onSuccess:()=>{ qc.invalidateQueries(["settings"]); toast.success("Saved!"); const u={...user,branding:{...user.branding,instituteName:form.instituteName,primaryColor:form.primaryColor}}; setUser(u); },
    onError:(e)=>toast.error(e.response?.data?.message||"Failed"),
  });
  const updateSettings = useMutation({
    mutationFn:(d)=>api.put("/settings",d),
    onSuccess:()=>{ qc.invalidateQueries(["settings"]); toast.success("Settings saved!"); },
    onError:(e)=>toast.error(e.response?.data?.message||"Failed"),
  });
  const createBranch = useMutation({
    mutationFn:(d)=>api.post("/branches",d),
    onSuccess:()=>{ refetchBranches(); toast.success("Branch created!"); setShowBranchModal(false); setBranchForm({ name:"",address:"",phone:"",email:"" }); },
    onError:(e)=>toast.error(e.response?.data?.message||"Failed"),
  });
  const updateBranch = useMutation({
    mutationFn:({id,...d})=>api.put(`/branches/${id}`,d),
    onSuccess:()=>{ refetchBranches(); toast.success("Branch updated!"); setEditingBranch(null); setBranchForm({ name:"",address:"",phone:"",email:"" }); },
    onError:(e)=>toast.error(e.response?.data?.message||"Failed"),
  });
  const deleteBranch = useMutation({
    mutationFn:(id)=>api.delete(`/branches/${id}`),
    onSuccess:()=>{ refetchBranches(); toast.success("Branch deleted!"); },
    onError:(e)=>toast.error(e.response?.data?.message||"Failed"),
  });

  const handleCreateBranch = () => {
    const newErrors = validateForm(branchForm, BRANCH_RULES);
    if (Object.keys(newErrors).length) { setBranchErrors(newErrors); toast.error("Please fix the highlighted fields"); return; }
    setBranchErrors({});
    createBranch.mutate(branchForm);
  };
  const handleUpdateBranch = () => {
    const newErrors = validateForm(branchForm, BRANCH_RULES);
    if (Object.keys(newErrors).length) { setBranchErrors(newErrors); toast.error("Please fix the highlighted fields"); return; }
    setBranchErrors({});
    updateBranch.mutate({ id:editingBranch._id, ...branchForm });
  };

  const TABS = [
    {id:"institute",  label:"🏫 Institute"},
    {id:"branches",   label:"🏢 Branches"},
    {id:"notifications",label:"🔔 Notifications"},
    {id:"attendance", label:"📋 Attendance"},
    {id:"account",    label:"👤 Account"},
  ];

  const openEdit = (b) => {
    setEditingBranch(b);
    setBranchErrors({});
    setBranchForm({ name:b.name, address:b.address||"", phone:b.phone||"", email:b.email||"" });
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"24px",maxWidth:"800px"}}>
      <div>
        <h1 style={{fontSize:"24px",fontWeight:800,color:"#0f172a"}}>Settings</h1>
        <p style={{fontSize:"13px",color:"#94a3b8",marginTop:"2px"}}>Configure your institute preferences</p>
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

      {/* ── Institute Tab ── */}
      {tab==="institute"&&(
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"28px"}}>
          <h3 style={{fontWeight:700,color:"#0f172a",marginBottom:"20px"}}>Institute Information</h3>
          <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
            {[["Institute Name","instituteName","text","e.g. EduManage"],["Address","address","text","e.g. 123 Main St, City"],["Phone","phone","tel","e.g. 9876543210"],["Email","email","email","e.g. info@edumanage.com"],["Website","website","url","e.g. www.edumanage.com"]].map(([label,key,type,ph])=>(
              <div key={key}>
                <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>{label.toUpperCase()}</label>
                <input type={type} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} placeholder={ph}
                  style={{width:"100%",padding:"11px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
              </div>
            ))}
            <div>
              <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"8px"}}>BRAND COLOR</label>
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

      {/* ── Branches Tab ── */}
      {tab==="branches"&&(
        <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <h3 style={{fontWeight:700,color:"#0f172a"}}>Branch Management</h3>
              <p style={{fontSize:"12px",color:"#94a3b8",marginTop:"2px"}}>Add and manage your institute locations</p>
            </div>
            <button onClick={()=>{ setEditingBranch(null); setBranchForm({ name:"",address:"",phone:"",email:"" }); setBranchErrors({}); setShowBranchModal(true); }}
              style={{padding:"10px 20px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",fontSize:"13px",fontWeight:600,cursor:"pointer"}}>
              + Add Branch
            </button>
          </div>

          {branches.length===0?(
            <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"60px",textAlign:"center",color:"#94a3b8"}}>
              🏢 No branches yet. Add your first branch!
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              {branches.map(b=>(
                <div key={b._id} style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"20px",display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
                    <div style={{width:"44px",height:"44px",background:"#eff6ff",borderRadius:"12px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px"}}>
                      🏢
                    </div>
                    <div>
                      <p style={{fontWeight:700,color:"#0f172a",fontSize:"15px"}}>{b.name}</p>
                      <p style={{fontSize:"12px",color:"#94a3b8",marginTop:"2px"}}>{b.address||"No address"} · {b.phone||"No phone"}</p>
                      {b.email&&<p style={{fontSize:"12px",color:"#94a3b8"}}>{b.email}</p>}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:"8px"}}>
                    <button onClick={()=>openEdit(b)}
                      style={{padding:"8px 16px",background:"#eff6ff",color:"#1a56db",border:"none",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:600}}>
                      ✏️ Edit
                    </button>
                    <button onClick={()=>{ if(window.confirm(`Delete "${b.name}"?`)) deleteBranch.mutate(b._id); }}
                      style={{padding:"8px 16px",background:"#fef2f2",color:"#dc2626",border:"none",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:600}}>
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Notifications Tab ── */}
      {tab==="notifications"&&(
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"28px"}}>
          <h3 style={{fontWeight:700,color:"#0f172a",marginBottom:"20px"}}>Notification Settings</h3>
          <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
            {[
              {key:"feeReminder",    label:"Fee Due Reminders",     desc:"WhatsApp reminder before fee due date"},
              {key:"attendanceAlert",label:"Low Attendance Alerts", desc:"Alert parents when attendance drops below minimum"},
              {key:"resultNotify",   label:"Result Notifications",  desc:"Notify parents when results are published"},
            ].map(({key,label,desc})=>(
              <div key={key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px",background:"#f8fafc",borderRadius:"12px"}}>
                <div>
                  <p style={{fontWeight:600,color:"#0f172a",fontSize:"14px"}}>{label}</p>
                  <p style={{fontSize:"12px",color:"#94a3b8",marginTop:"2px"}}>{desc}</p>
                </div>
                <button onClick={()=>setNotifForm({...notifForm,[key]:!notifForm[key]})}
                  style={{width:"48px",height:"26px",borderRadius:"99px",border:"none",cursor:"pointer",background:notifForm[key]?"#1a56db":"#e2e8f0",position:"relative",flexShrink:0}}>
                  <div style={{position:"absolute",top:"3px",width:"20px",height:"20px",borderRadius:"50%",background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,0.2)",transition:"left 0.2s",left:notifForm[key]?"25px":"3px"}} />
                </button>
              </div>
            ))}
            <div>
              <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>REMINDER DAYS BEFORE DUE DATE</label>
              <input type="number" min="1" max="10" value={notifForm.reminderDaysBefore} onChange={e=>setNotifForm({...notifForm,reminderDaysBefore:Number(e.target.value)})}
                style={{width:"120px",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}} />
            </div>
          </div>
          <button onClick={()=>updateSettings.mutate({notifications:notifForm})} disabled={updateSettings.isPending}
            style={{marginTop:"20px",padding:"12px 28px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",fontWeight:700,cursor:"pointer",fontSize:"14px"}}>
            {updateSettings.isPending?"Saving...":"Save Settings"}
          </button>
        </div>
      )}

      {/* ── Attendance Tab ── */}
      {tab==="attendance"&&(
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"28px"}}>
          <h3 style={{fontWeight:700,color:"#0f172a",marginBottom:"20px"}}>Attendance Settings</h3>
          <div>
            <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"8px"}}>MINIMUM ATTENDANCE PERCENTAGE</label>
            <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
              <input type="range" min="50" max="100" value={attForm.minPercentage} onChange={e=>setAttForm({minPercentage:Number(e.target.value)})}
                style={{flex:1,accentColor:"#1a56db"}} />
              <span style={{fontSize:"24px",fontWeight:800,color:"#1a56db",minWidth:"60px"}}>{attForm.minPercentage}%</span>
            </div>
            <p style={{fontSize:"12px",color:"#94a3b8",marginTop:"8px"}}>Students below this will trigger automatic alerts to parents.</p>
          </div>
          <button onClick={()=>updateSettings.mutate({attendance:attForm})} disabled={updateSettings.isPending}
            style={{marginTop:"20px",padding:"12px 28px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",fontWeight:700,cursor:"pointer",fontSize:"14px"}}>
            {updateSettings.isPending?"Saving...":"Save Settings"}
          </button>
        </div>
      )}

      {/* ── Account Tab ── */}
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

      {/* ── Branch Modal ── */}
      {showBranchModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}
          onClick={e=>e.target===e.currentTarget&&setShowBranchModal(false)}>
          <div style={{background:"#fff",borderRadius:"20px",padding:"32px",width:"100%",maxWidth:"460px",boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}}>
            <h2 style={{fontSize:"18px",fontWeight:800,color:"#0f172a",marginBottom:"24px"}}>Add New Branch</h2>
            <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
              {[["Branch Name *","name","text","e.g. North Campus"],["Address","address","text","e.g. 123 Main St, City"],["Phone","phone","tel","e.g. 9876543210"],["Email","email","email","e.g. branch@edumanage.com"]].map(([label,key,type,ph])=>(
                <div key={key}>
                  <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>{label}</label>
                  <input type={type} value={branchForm[key]} onChange={e=>{setBranchForm({...branchForm,[key]:e.target.value}); if(branchErrors[key]) setBranchErrors({...branchErrors,[key]:""});}} placeholder={ph}
                    style={{width:"100%",padding:"10px 14px",border:branchErrors[key]?"1.5px solid #dc2626":"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
                  {branchErrors[key] && <p style={{color:"#dc2626",fontSize:"11px",marginTop:"4px",fontWeight:500}}>{branchErrors[key]}</p>}
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:"12px",marginTop:"24px"}}>
              <button onClick={()=>setShowBranchModal(false)} style={{flex:1,padding:"11px",border:"1.5px solid #e2e8f0",borderRadius:"10px",cursor:"pointer",background:"#fff",color:"#64748b",fontWeight:600}}>Cancel</button>
              <button onClick={handleCreateBranch} disabled={createBranch.isPending}
                style={{flex:1,padding:"11px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",cursor:"pointer",fontWeight:700}}>
                {createBranch.isPending?"Creating...":"Create Branch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Branch Modal ── */}
      {editingBranch&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}
          onClick={e=>e.target===e.currentTarget&&setEditingBranch(null)}>
          <div style={{background:"#fff",borderRadius:"20px",padding:"32px",width:"100%",maxWidth:"460px",boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}}>
            <h2 style={{fontSize:"18px",fontWeight:800,color:"#0f172a",marginBottom:"24px"}}>Edit Branch</h2>
            <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
              {[["Branch Name *","name","text"],["Address","address","text"],["Phone","phone","tel"],["Email","email","email"]].map(([label,key,type])=>(
                <div key={key}>
                  <label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>{label}</label>
                  <input type={type} value={branchForm[key]} onChange={e=>{setBranchForm({...branchForm,[key]:e.target.value}); if(branchErrors[key]) setBranchErrors({...branchErrors,[key]:""});}}
                    style={{width:"100%",padding:"10px 14px",border:branchErrors[key]?"1.5px solid #dc2626":"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} />
                  {branchErrors[key] && <p style={{color:"#dc2626",fontSize:"11px",marginTop:"4px",fontWeight:500}}>{branchErrors[key]}</p>}
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:"12px",marginTop:"24px"}}>
              <button onClick={()=>setEditingBranch(null)} style={{flex:1,padding:"11px",border:"1.5px solid #e2e8f0",borderRadius:"10px",cursor:"pointer",background:"#fff",color:"#64748b",fontWeight:600}}>Cancel</button>
              <button onClick={handleUpdateBranch} disabled={updateBranch.isPending}
                style={{flex:1,padding:"11px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",cursor:"pointer",fontWeight:700}}>
                {updateBranch.isPending?"Saving...":"Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
