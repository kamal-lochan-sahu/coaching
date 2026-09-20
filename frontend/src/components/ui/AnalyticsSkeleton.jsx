import Skeleton from "./Skeleton";

const cardStyle = { background:"#fff", borderRadius:"16px", border:"1px solid #f1f5f9", padding:"24px" };

export default function AnalyticsSkeleton() {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"24px"}}>
      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
        <Skeleton width="220px" height="22px" />
        <Skeleton width="260px" height="12px" />
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"16px"}}>
        {Array.from({length:4}).map((_,i)=>(
          <div key={i} style={{...cardStyle,padding:"20px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"10px"}}>
              <Skeleton width="60%" height="9px" />
              <Skeleton width="36px" height="36px" radius="10px" />
            </div>
            <Skeleton width="50%" height="22px" />
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:"20px"}}>
        <div style={cardStyle}>
          <Skeleton width="160px" height="15px" style={{marginBottom:"6px"}} />
          <Skeleton width="100px" height="10px" style={{marginBottom:"20px"}} />
          <Skeleton width="100%" height="220px" radius="10px" />
        </div>
        <div style={cardStyle}>
          <Skeleton width="120px" height="15px" style={{marginBottom:"6px"}} />
          <Skeleton width="140px" height="10px" style={{marginBottom:"16px"}} />
          <Skeleton width="160px" height="160px" radius="50%" style={{margin:"0 auto"}} />
        </div>
      </div>

      <div style={cardStyle}>
        <Skeleton width="200px" height="15px" style={{marginBottom:"6px"}} />
        <Skeleton width="220px" height="10px" style={{marginBottom:"20px"}} />
        <Skeleton width="100%" height="200px" radius="10px" />
      </div>
    </div>
  );
}
