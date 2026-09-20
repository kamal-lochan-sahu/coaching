import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Search, Users } from "lucide-react";
import { useState } from "react";
import api from "../../services/api";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import Pagination from "../../components/ui/Pagination";
import TableSkeleton from "../../components/ui/TableSkeleton";
import { useDebounce } from "../../hooks/useDebounce";

const PAGE_SIZE = 20;

export default function Students() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [page,   setPage]   = useState(1);
  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading } = useQuery({
    queryKey: ["students", status, page],
    queryFn:  () => api.get(`/students?status=${status}&page=${page}&limit=${PAGE_SIZE}`).then(r => r.data.data),
    staleTime: 30000,
    keepPreviousData: true,
  });

  const { data: searchResults=[], isFetching: searching } = useQuery({
    queryKey: ["students-search", debouncedSearch],
    queryFn:  () => api.get(`/students/search?q=${debouncedSearch}`).then(r => r.data.data),
    enabled:  debouncedSearch.length >= 2,
    staleTime: 10000,
  });

  const handleStatusChange = (s) => { setStatus(s); setPage(1); };

  const students = data?.students || [];
  const isSearching = debouncedSearch.length >= 2;
  const filtered = isSearching ? searchResults : students;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <h1 style={{fontSize:"24px",fontWeight:800,color:"#0f172a"}}>Students</h1>
          <p style={{fontSize:"13px",color:"#94a3b8",marginTop:"2px"}}>
            {debouncedSearch.length >= 2 ? `${filtered.length} results for "${debouncedSearch}"` : `${data?.total || 0} total students`}
          </p>
        </div>
        <Link to="/students/add"
          style={{display:"flex",alignItems:"center",gap:"6px",padding:"10px 18px",background:"#1a56db",color:"#fff",borderRadius:"10px",textDecoration:"none",fontSize:"13px",fontWeight:600}}>
          <Plus size={16} /> Add Student
        </Link>
      </div>

      {/* Filters */}
      <div style={{display:"flex",gap:"12px",flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:1,minWidth:"200px",maxWidth:"380px"}}>
          <Search size={16} style={{position:"absolute",left:"12px",top:"50%",transform:"translateY(-50%)",color:"#94a3b8"}} />
          <input
            placeholder="Search name or phone... (min 2 chars)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{width:"100%",paddingLeft:"38px",paddingRight:"16px",paddingTop:"10px",paddingBottom:"10px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}}
          />
          {searching && (
            <div style={{position:"absolute",right:"12px",top:"50%",transform:"translateY(-50%)",width:"14px",height:"14px",border:"2px solid #e2e8f0",borderTopColor:"#1a56db",borderRadius:"50%",animation:"spin 0.7s linear infinite"}} />
          )}
        </div>
        <select value={status} onChange={e => handleStatusChange(e.target.value)}
          style={{padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:"10px",fontSize:"13px",outline:"none"}}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="passed">Passed</option>
          <option value="dropped">Dropped</option>
        </select>
      </div>

      {/* Table */}
      {isLoading && !search ? <TableSkeleton cols={5} /> : filtered.length === 0 ? (
        <EmptyState icon={Users}
          title={search ? `No students found for "${search}"` : "No students yet"}
          description={search ? "Try a different search term" : "Add your first student to get started"}
          action={!search && <Link to="/students/add" style={{padding:"10px 20px",background:"#1a56db",color:"#fff",borderRadius:"10px",textDecoration:"none",fontSize:"13px",fontWeight:600}}>Add Student</Link>}
        />
      ) : (
        <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:"13px"}}>
            <thead>
              <tr style={{background:"#f8fafc",borderBottom:"1px solid #f1f5f9"}}>
                {["Student","Phone","Batch","Status","Joined"].map(h => (
                  <th key={h} style={{textAlign:"left",padding:"12px 16px",color:"#64748b",fontWeight:600,fontSize:"12px"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s._id} style={{borderTop:"1px solid #f8fafc",background:i%2===0?"#fff":"#fafafa",transition:"background 0.1s"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f0f7ff"}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#fff":"#fafafa"}>
                  <td style={{padding:"12px 16px"}}>
                    <Link to={`/students/${s._id}`} style={{display:"flex",alignItems:"center",gap:"10px",textDecoration:"none"}}>
                      <div style={{width:"36px",height:"36px",borderRadius:"50%",background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"#1a56db",fontSize:"14px",flexShrink:0,overflow:"hidden"}}>
                        {s.photo?<img src={s.photo} alt={s.name} style={{width:"100%",height:"100%",objectFit:"cover"}} />:s.name[0]}
                      </div>
                      <div>
                        <p style={{fontWeight:600,color:"#0f172a"}}>{s.name}</p>
                        <p style={{fontSize:"11px",color:"#94a3b8"}}>{s.admissionNumber}</p>
                      </div>
                    </Link>
                  </td>
                  <td style={{padding:"12px 16px",color:"#64748b"}}>{s.phone || "—"}</td>
                  <td style={{padding:"12px 16px",color:"#64748b"}}>{s.currentBatch?.name || "—"}</td>
                  <td style={{padding:"12px 16px"}}><Badge status={s.status} /></td>
                  <td style={{padding:"12px 16px",color:"#94a3b8",fontSize:"12px"}}>{new Date(s.admissionDate).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isSearching && (
            <Pagination page={data?.page || page} pages={data?.pages || 1} total={data?.total} onPageChange={setPage} />
          )}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
