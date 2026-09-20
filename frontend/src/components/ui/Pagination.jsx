export default function Pagination({ page, pages, total, onPageChange }) {
  if (!pages || pages <= 1) return null;

  const pageNumbers = [];
  const start = Math.max(1, page - 2);
  const end   = Math.min(pages, start + 4);
  for (let i = start; i <= end; i++) pageNumbers.push(i);

  const btnStyle = (active) => ({
    minWidth: "32px", height: "32px", padding: "0 8px",
    borderRadius: "8px", border: "1.5px solid #e2e8f0",
    background: active ? "#1a56db" : "#fff",
    color: active ? "#fff" : "#64748b",
    fontSize: "12px", fontWeight: 600, cursor: "pointer",
  });

  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderTop:"1px solid #f8fafc",flexWrap:"wrap",gap:"10px"}}>
      <p style={{fontSize:"12px",color:"#94a3b8"}}>
        Page {page} of {pages} {total != null && `· ${total} total`}
      </p>
      <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
        <button onClick={()=>onPageChange(page-1)} disabled={page<=1} style={{...btnStyle(false),opacity:page<=1?0.4:1,cursor:page<=1?"not-allowed":"pointer"}}>
          ‹ Prev
        </button>
        {start>1 && <span style={{color:"#cbd5e1",fontSize:"12px"}}>…</span>}
        {pageNumbers.map(p=>(
          <button key={p} onClick={()=>onPageChange(p)} style={btnStyle(p===page)}>{p}</button>
        ))}
        {end<pages && <span style={{color:"#cbd5e1",fontSize:"12px"}}>…</span>}
        <button onClick={()=>onPageChange(page+1)} disabled={page>=pages} style={{...btnStyle(false),opacity:page>=pages?0.4:1,cursor:page>=pages?"not-allowed":"pointer"}}>
          Next ›
        </button>
      </div>
    </div>
  );
}
