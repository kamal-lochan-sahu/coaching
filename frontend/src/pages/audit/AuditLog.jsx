import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import Pagination from "../../components/ui/Pagination";
import TableSkeleton from "../../components/ui/TableSkeleton";
import EmptyState from "../../components/ui/EmptyState";
import { ScrollText } from "lucide-react";

const ACTION_STYLE = {
  create:       { bg:"#f0fdf4", color:"#16a34a", label:"Created" },
  update:       { bg:"#eff6ff", color:"#1a56db", label:"Updated" },
  delete:       { bg:"#fef2f2", color:"#dc2626", label:"Deleted" },
  collect_fee:  { bg:"#f0fdf4", color:"#16a34a", label:"Fee Collected" },
  waive_fee:    { bg:"#f5f3ff", color:"#7c3aed", label:"Fee Waived" },
  pay_salary:   { bg:"#fffbeb", color:"#d97706", label:"Salary Paid" },
};

export default function AuditLog() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, entityType, action],
    queryFn:  () => api.get(`/audit-logs?page=${page}&limit=25${entityType?`&entityType=${entityType}`:""}${action?`&action=${action}`:""}`).then(r => r.data.data),
    keepPreviousData: true,
  });

  const logs = data?.logs || [];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>
      <div>
        <h1 style={{fontSize:"24px",fontWeight:800,color:"#0f172a"}}>Audit Log</h1>
        <p style={{fontSize:"13px",color:"#94a3b8",marginTop:"2px"}}>Who did what, and when — every key action across your institute</p>
      </div>

      <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
        <select value={entityType} onChange={e=>{setEntityType(e.target.value); setPage(1);}}
          style={{padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:"9px",fontSize:"12px",outline:"none"}}>
          <option value="">All types</option>
          <option value="Student">Student</option>
          <option value="Fee">Fee</option>
          <option value="Staff">Staff</option>
          <option value="Batch">Batch</option>
          <option value="Branch">Branch</option>
        </select>
        <select value={action} onChange={e=>{setAction(e.target.value); setPage(1);}}
          style={{padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:"9px",fontSize:"12px",outline:"none"}}>
          <option value="">All actions</option>
          <option value="create">Created</option>
          <option value="update">Updated</option>
          <option value="delete">Deleted</option>
          <option value="collect_fee">Fee Collected</option>
          <option value="waive_fee">Fee Waived</option>
          <option value="pay_salary">Salary Paid</option>
        </select>
      </div>

      {isLoading ? (
        <TableSkeleton cols={4} />
      ) : logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="No activity yet" description="Actions like adding students, collecting fees, or paying staff will show up here." />
      ) : (
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:"13px"}}>
            <thead><tr style={{background:"#f8fafc"}}>
              {["When","User","Action","Details"].map(h=>(
                <th key={h} style={{textAlign:"left",padding:"12px 16px",color:"#64748b",fontWeight:600,fontSize:"12px"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {logs.map((log,i)=>{
                const style = ACTION_STYLE[log.action] || { bg:"#f1f5f9", color:"#64748b", label:log.action };
                return (
                  <tr key={log._id} style={{borderTop:"1px solid #f8fafc",background:i%2===0?"#fff":"#fafafa"}}>
                    <td style={{padding:"12px 16px",color:"#94a3b8",fontSize:"12px",whiteSpace:"nowrap"}}>
                      {new Date(log.createdAt).toLocaleString("en-IN",{ day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit" })}
                    </td>
                    <td style={{padding:"12px 16px"}}>
                      <p style={{fontWeight:600,color:"#0f172a"}}>{log.userName}</p>
                      <p style={{fontSize:"11px",color:"#94a3b8",textTransform:"capitalize"}}>{log.userRole}</p>
                    </td>
                    <td style={{padding:"12px 16px"}}>
                      <span style={{padding:"3px 10px",borderRadius:"99px",fontSize:"11px",fontWeight:700,background:style.bg,color:style.color}}>
                        {style.label}
                      </span>
                    </td>
                    <td style={{padding:"12px 16px",color:"#475569"}}>{log.description}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination page={data?.page||page} pages={data?.pages||1} total={data?.total} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
