import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";

const STATUS = {
  new:       { color:"#1a56db", bg:"#eff6ff", label:"New" },
  contacted: { color:"#7c3aed", bg:"#f5f3ff", label:"Contacted" },
  converted: { color:"#16a34a", bg:"#f0fdf4", label:"Converted" },
  lost:      { color:"#dc2626", bg:"#fef2f2", label:"Lost" },
};

export default function Enquiries() {
  const qc = useQueryClient();
  const [filter,    setFilter]    = useState("all");
  const [showAdd,   setShowAdd]   = useState(false);
  const [selected,  setSelected]  = useState(null);
  const [followUp,  setFollowUp]  = useState("");
  const [followDate,setFollowDate]= useState("");
  const [form, setForm] = useState({ name:"",phone:"",email:"",interestedIn:"",source:"walk_in",branchId:"" });

  const { data:enquiries=[], isLoading } = useQuery({
    queryKey:["enquiries",filter],
    queryFn:()=>api.get(`/enquiries${filter!=="all"?`?status=${filter}`:""}`).then(r=>r.data.data.enquiries),
  });
  const { data:stats=[] }   = useQuery({ queryKey:["enquiry-stats"], queryFn:()=>api.get("/enquiries/stats").then(r=>r.data.data) });
  const { data:branches=[] }= useQuery({ queryKey:["branches"], queryFn:()=>api.get("/branches").then(r=>r.data.data) });

  const addEnq = useMutation({
    mutationFn:(d)=>api.post("/enquiries",d),
    onSuccess:()=>{ qc.invalidateQueries(["enquiries"]); qc.invalidateQueries(["enquiry-stats"]); toast.success("Enquiry logged!"); setShowAdd(false); setForm({ name:"",phone:"",email:"",interestedIn:"",source:"walk_in",branchId:"" }); },
    onError:(e)=>toast.error(e.response?.data?.message||"Failed"),
  });
  const addFollowUp = useMutation({
    mutationFn:({id,...d})=>api.post(`/enquiries/${id}/followup`,d),
    onSuccess:()=>{ qc.invalidateQueries(["enquiries"]); toast.success("Follow-up added!"); setFollowUp(""); setFollowDate(""); setSelected(null); },
    onError:(e)=>toast.error(e.response?.data?.message||"Failed"),
  });
  const updateStatus = useMutation({
    mutationFn:({id,status})=>api.put(`/enquiries/${id}`,{status}),
    onSuccess:()=>{ qc.invalidateQueries(["enquiries"]); qc.invalidateQueries(["enquiry-stats"]); toast.success("Status updated!"); },
  });

  const statsMap = stats.reduce((acc,s)=>({...acc,[s._id]:s.count}),{});
  const total    = stats.reduce((s,x)=>s+x.count,0);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"24px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div><h1 style={{fontSize:"24px",fontWeight:800,color:"#0f172a"}}>Enquiries</h1>
          <p style={{fontSize:"13px",color:"#94a3b8",marginTop:"2px"}}>Track leads and convert to students</p></div>
        <button onClick={()=>setShowAdd(true)}
          style={{padding:"10px 20px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",fontSize:"13px",fontWeight:600,cursor:"pointer"}}>
          + New Enquiry
        </button>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"12px"}}>
        {[{label:"Total",val:total,color:"#1a56db",bg:"#eff6ff"},
          {label:"New",val:statsMap.new||0,color:"#1a56db",bg:"#eff6ff"},
          {label:"Contacted",val:statsMap.contacted||0,color:"#7c3aed",bg:"#f5f3ff"},
          {label:"Converted",val:statsMap.converted||0,color:"#16a34a",bg:"#f0fdf4"},
          {label:"Lost",val:statsMap.lost||0,color:"#dc2626",bg:"#fef2f2"},
        ].map(({label,val,color,bg})=>(
          <div key={label} style={{background:"#fff",borderRadius:"14px",border:"1px solid #f1f5f9",padding:"16px",textAlign:"center"}}>
            <p style={{fontSize:"22px",fontWeight:800,color}}>{val}</p>
            <p style={{fontSize:"12px",color:"#94a3b8",marginTop:"2px"}}>{label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{display:"flex",gap:"4px",background:"#f1f5f9",borderRadius:"12px",padding:"4px",width:"fit-content"}}>
        {["all","new","contacted","converted","lost"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{padding:"7px 16px",borderRadius:"9px",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:600,textTransform:"capitalize",
              background:filter===f?"#fff":"transparent",color:filter===f?"#0f172a":"#64748b",
              boxShadow:filter===f?"0 1px 3px rgba(0,0,0,0.1)":"none"}}>
            {f==="all"?"All":STATUS[f]?.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",overflow:"hidden"}}>
        {isLoading?<div style={{padding:"40px",textAlign:"center",color:"#94a3b8"}}>Loading...</div>:
        enquiries.length===0?<div style={{padding:"60px",textAlign:"center",color:"#94a3b8"}}>💬 No enquiries found</div>:(
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:"13px"}}>
            <thead><tr style={{background:"#f8fafc"}}>
              {["Name","Phone","Interested In","Source","Status","Follow Up","Action"].map(h=>(
                <th key={h} style={{textAlign:"left",padding:"12px 16px",color:"#64748b",fontWeight:600,fontSize:"12px"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {enquiries.map((e,i)=>{
                const st = STATUS[e.status];
                return (
                  <tr key={e._id} style={{borderTop:"1px solid #f8fafc",background:i%2===0?"#fff":"#fafafa"}}>
                    <td style={{padding:"13px 16px"}}>
                      <p style={{fontWeight:600,color:"#0f172a"}}>{e.name}</p>
                      <p style={{fontSize:"11px",color:"#94a3b8"}}>{new Date(e.createdAt).toLocaleDateString("en-IN")}</p>
                    </td>
                    <td style={{padding:"13px 16px",color:"#64748b"}}>{e.phone}</td>
                    <td style={{padding:"13px 16px",color:"#64748b"}}>{e.interestedIn||"—"}</td>
                    <td style={{padding:"13px 16px",color:"#94a3b8",textTransform:"capitalize"}}>{e.source?.replace("_"," ")}</td>
                    <td style={{padding:"13px 16px"}}>
                      <span style={{padding:"3px 10px",borderRadius:"99px",fontSize:"11px",fontWeight:600,background:st?.bg,color:st?.color}}>{st?.label}</span>
                    </td>
                    <td style={{padding:"13px 16px",color:"#94a3b8",fontSize:"12px"}}>
                      {e.followUpDate?new Date(e.followUpDate).toLocaleDateString("en-IN"):"—"}
                    </td>
                    <td style={{padding:"13px 16px"}}>
                      <div style={{display:"flex",gap:"6px"}}>
                        <button onClick={()=>setSelected(e)}
                          style={{padding:"5px 10px",background:"#eff6ff",color:"#1a56db",border:"none",borderRadius:"7px",cursor:"pointer",fontSize:"11px",fontWeight:600}}>
                          Follow Up
                        </button>
                        {e.status!=="converted"&&e.status!=="lost"&&(
                          <select onChange={ev=>updateStatus.mutate({id:e._id,status:ev.target.value})} defaultValue=""
                            style={{padding:"5px 8px",border:"1px solid #e2e8f0",borderRadius:"7px",fontSize:"11px",cursor:"pointer",color:"#64748b"}}>
                            <option value="" disabled>Change</option>
                            <option value="contacted">Contacted</option>
                            <option value="converted">Converted</option>
                            <option value="lost">Lost</option>
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Enquiry Modal */}
      {showAdd&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}
          onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
          <div style={{background:"#fff",borderRadius:"20px",padding:"32px",width:"100%",maxWidth:"460px",boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}}>
            <h2 style={{fontSize:"18px",fontWeight:800,color:"#0f172a",marginBottom:"24px"}}>New Enquiry</h2>
            <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
              {[["Name *","name","text","Student name"],["Phone *","phone","tel","9876543210"],["Email","email","email","optional"]].map(([label,key,type,ph])=>(
                <div key={key}><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>{label}</label>
                  <input type={type} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} placeholder={ph}
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} /></div>
              ))}
              <div><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>INTERESTED IN</label>
                <input value={form.interestedIn} onChange={e=>setForm({...form,interestedIn:e.target.value})} placeholder="Class 10 - Morning batch"
                  style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} /></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>SOURCE</label>
                  <select value={form.source} onChange={e=>setForm({...form,source:e.target.value})}
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}}>
                    <option value="walk_in">Walk-in</option>
                    <option value="referral">Referral</option>
                    <option value="social_media">Social Media</option>
                    <option value="online">Online</option>
                  </select></div>
                <div><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>BRANCH</label>
                  <select value={form.branchId} onChange={e=>setForm({...form,branchId:e.target.value})}
                    style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}}>
                    <option value="">Select...</option>
                    {branches.map(b=><option key={b._id} value={b._id}>{b.name}</option>)}
                  </select></div>
              </div>
            </div>
            <div style={{display:"flex",gap:"12px",marginTop:"24px"}}>
              <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:"11px",border:"1.5px solid #e2e8f0",borderRadius:"10px",cursor:"pointer",background:"#fff",color:"#64748b",fontWeight:600}}>Cancel</button>
              <button onClick={()=>addEnq.mutate(form)} disabled={addEnq.isPending}
                style={{flex:1,padding:"11px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",cursor:"pointer",fontWeight:700}}>
                {addEnq.isPending?"Saving...":"Save Enquiry"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Follow Up Modal */}
      {selected&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}
          onClick={e=>e.target===e.currentTarget&&setSelected(null)}>
          <div style={{background:"#fff",borderRadius:"20px",padding:"32px",width:"100%",maxWidth:"400px",boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}}>
            <h2 style={{fontSize:"18px",fontWeight:800,color:"#0f172a",marginBottom:"6px"}}>Add Follow Up</h2>
            <p style={{fontSize:"13px",color:"#94a3b8",marginBottom:"20px"}}>{selected.name} — {selected.phone}</p>
            <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
              <div><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>NOTE</label>
                <textarea value={followUp} onChange={e=>setFollowUp(e.target.value)} rows={3} placeholder="Called, interested in morning batch..."
                  style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",resize:"none",boxSizing:"border-box"}} /></div>
              <div><label style={{display:"block",fontSize:"12px",fontWeight:600,color:"#64748b",marginBottom:"6px"}}>NEXT FOLLOW UP DATE</label>
                <input type="date" value={followDate} onChange={e=>setFollowDate(e.target.value)}
                  style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}} /></div>
            </div>
            <div style={{display:"flex",gap:"12px",marginTop:"20px"}}>
              <button onClick={()=>setSelected(null)} style={{flex:1,padding:"11px",border:"1.5px solid #e2e8f0",borderRadius:"10px",cursor:"pointer",background:"#fff",color:"#64748b",fontWeight:600}}>Cancel</button>
              <button onClick={()=>addFollowUp.mutate({id:selected._id,text:followUp,followUpDate:followDate})} disabled={addFollowUp.isPending}
                style={{flex:1,padding:"11px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",cursor:"pointer",fontWeight:700}}>
                {addFollowUp.isPending?"Saving...":"Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
