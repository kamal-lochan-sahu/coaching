import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Edit } from "lucide-react";
import api from "../../services/api";
import Loader from "../../components/ui/Loader";

const GRADE_COLOR = { "A+":"#16a34a","A":"#16a34a","B+":"#0891b2","B":"#0891b2","C":"#d97706","D":"#d97706","F":"#dc2626" };

export default function StudentDetail() {
  const { id } = useParams();

  const { data: history, isLoading } = useQuery({
    queryKey: ["student-history", id],
    queryFn:  () => api.get(`/students/${id}/history`).then(r => r.data.data),
  });

  if (isLoading) return <Loader />;
  const { student, attendance=[], fees=[], results=[] } = history || {};
  if (!student) return <div style={{padding:"40px",textAlign:"center",color:"#94a3b8"}}>Student not found</div>;

  const totalAtt   = attendance.length;
  const presentAtt = attendance.filter(a => a.status==="present"||a.status==="late").length;
  const attPct     = totalAtt ? Math.round((presentAtt/totalAtt)*100) : 0;
  const attColor   = attPct>=80?"#16a34a":attPct>=60?"#d97706":"#dc2626";

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"20px",maxWidth:"900px"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <Link to="/students" style={{padding:"8px",borderRadius:"10px",background:"#f1f5f9",display:"flex"}}>
            <ArrowLeft size={18} color="#64748b" />
          </Link>
          <div>
            <h1 style={{fontSize:"22px",fontWeight:800,color:"#0f172a"}}>{student.name}</h1>
            <p style={{fontSize:"13px",color:"#94a3b8"}}>{student.admissionNumber} · {student.currentBatch?.name || "No batch"}</p>
          </div>
        </div>
        <Link to={`/students/${id}/edit`}
          style={{display:"flex",alignItems:"center",gap:"8px",padding:"10px 20px",background:"#1a56db",color:"#fff",borderRadius:"10px",textDecoration:"none",fontSize:"13px",fontWeight:600}}>
          <Edit size={15} /> Edit Student
        </Link>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:"16px"}}>
        {/* Profile Card */}
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"24px"}}>
          <div style={{width:"64px",height:"64px",borderRadius:"50%",background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"26px",fontWeight:800,color:"#1a56db",marginBottom:"16px"}}>
            {student.name[0]}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"8px",fontSize:"13px"}}>
            {[
              ["📱 Phone",  student.phone||"—"],
              ["📧 Email",  student.email||"—"],
              ["⚧ Gender",  student.gender||"—"],
              ["📅 DOB",    student.dateOfBirth?new Date(student.dateOfBirth).toLocaleDateString("en-IN"):"—"],
              ["🏠 Address",student.address||"—"],
            ].map(([label,val])=>(
              <div key={label}>
                <p style={{color:"#94a3b8",fontSize:"11px",fontWeight:600}}>{label}</p>
                <p style={{color:"#0f172a",fontWeight:500,marginTop:"1px"}}>{val}</p>
              </div>
            ))}
            <div style={{borderTop:"1px solid #f1f5f9",paddingTop:"12px",marginTop:"4px"}}>
              <p style={{color:"#94a3b8",fontSize:"11px",fontWeight:600,marginBottom:"8px"}}>👨 GUARDIAN</p>
              <p style={{color:"#0f172a",fontWeight:600}}>{student.guardianName||"—"}</p>
              <p style={{color:"#64748b",fontSize:"12px"}}>{student.guardianPhone||"—"}</p>
              <p style={{color:"#94a3b8",fontSize:"11px",textTransform:"capitalize"}}>{student.guardianRelation||"—"}</p>
            </div>
          </div>

          {/* Attendance meter */}
          <div style={{marginTop:"16px",padding:"14px",background:attPct>=80?"#f0fdf4":attPct>=60?"#fffbeb":"#fef2f2",borderRadius:"12px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
              <p style={{fontSize:"12px",fontWeight:600,color:"#374151"}}>Attendance</p>
              <p style={{fontSize:"14px",fontWeight:800,color:attColor}}>{attPct}%</p>
            </div>
            <div style={{background:"rgba(0,0,0,0.08)",borderRadius:"99px",height:"6px"}}>
              <div style={{width:`${attPct}%`,height:"6px",borderRadius:"99px",background:attColor}} />
            </div>
            <p style={{fontSize:"11px",color:"#64748b",marginTop:"6px"}}>{presentAtt}/{totalAtt} days present</p>
          </div>
        </div>

        {/* Right Column */}
        <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
          {/* Results */}
          <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"20px"}}>
            <h3 style={{fontWeight:700,color:"#0f172a",marginBottom:"14px"}}>📊 Test Results</h3>
            {results.length===0?(
              <p style={{color:"#94a3b8",fontSize:"13px"}}>No results yet</p>
            ):(
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"13px"}}>
                <thead><tr style={{background:"#f8fafc"}}>
                  {["Test","Marks","%","Grade","Rank"].map(h=>(
                    <th key={h} style={{textAlign:"left",padding:"8px 12px",color:"#64748b",fontWeight:600,fontSize:"11px"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {results.map(r=>(
                    <tr key={r._id} style={{borderTop:"1px solid #f8fafc"}}>
                      <td style={{padding:"10px 12px",color:"#0f172a",fontWeight:500}}>{r.testId?.name}</td>
                      <td style={{padding:"10px 12px"}}>{r.marksObtained}/{r.testId?.totalMarks}</td>
                      <td style={{padding:"10px 12px"}}>{r.percentage}%</td>
                      <td style={{padding:"10px 12px"}}>
                        <span style={{padding:"2px 8px",borderRadius:"99px",fontSize:"11px",fontWeight:700,background:`${GRADE_COLOR[r.grade]||"#64748b"}20`,color:GRADE_COLOR[r.grade]||"#64748b"}}>{r.grade}</span>
                      </td>
                      <td style={{padding:"10px 12px",fontWeight:700,color:r.rank<=3?"#d97706":"#64748b"}}>#{r.rank}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Fee History */}
          <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",padding:"20px"}}>
            <h3 style={{fontWeight:700,color:"#0f172a",marginBottom:"14px"}}>💰 Fee History</h3>
            {fees.length===0?(
              <p style={{color:"#94a3b8",fontSize:"13px"}}>No fee records</p>
            ):(
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"13px"}}>
                <thead><tr style={{background:"#f8fafc"}}>
                  {["Month","Amount","Mode","Receipt","Status"].map(h=>(
                    <th key={h} style={{textAlign:"left",padding:"8px 12px",color:"#64748b",fontWeight:600,fontSize:"11px"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {fees.map(f=>(
                    <tr key={f._id} style={{borderTop:"1px solid #f8fafc"}}>
                      <td style={{padding:"10px 12px",fontWeight:500}}>{f.month}</td>
                      <td style={{padding:"10px 12px",fontWeight:700}}>₹{f.finalAmount?.toLocaleString()}</td>
                      <td style={{padding:"10px 12px",color:"#64748b",textTransform:"capitalize"}}>{f.paymentMode||"—"}</td>
                      <td style={{padding:"10px 12px",color:"#94a3b8",fontSize:"11px"}}>{f.receiptNumber||"—"}</td>
                      <td style={{padding:"10px 12px"}}>
                        <span style={{padding:"3px 8px",borderRadius:"99px",fontSize:"11px",fontWeight:600,
                          background:f.status==="paid"?"#f0fdf4":f.status==="pending"?"#fffbeb":"#f5f3ff",
                          color:f.status==="paid"?"#16a34a":f.status==="pending"?"#d97706":"#7c3aed",
                          textTransform:"capitalize"}}>
                          {f.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
