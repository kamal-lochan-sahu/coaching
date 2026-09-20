import Skeleton from "./Skeleton";

const cardStyle = { background:"#fff", borderRadius:"16px", padding:"18px", border:"1px solid #f1f5f9" };

export default function DashboardSkeleton() {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
          <Skeleton width="90px" height="10px" />
          <Skeleton width="160px" height="22px" />
          <Skeleton width="140px" height="10px" />
        </div>
        <Skeleton width="140px" height="48px" radius="12px" />
      </div>

      {/* Primary KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px"}}>
        {Array.from({length:4}).map((_,i)=>(
          <div key={i} style={cardStyle}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"10px"}}>
              <Skeleton width="60%" height="9px" />
              <Skeleton width="34px" height="34px" radius="10px" />
            </div>
            <Skeleton width="50%" height="22px" />
          </div>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px"}}>
        {Array.from({length:3}).map((_,i)=>(
          <div key={i} style={cardStyle}>
            <Skeleton width="50%" height="9px" style={{marginBottom:"10px"}} />
            <Skeleton width="40%" height="20px" />
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{...cardStyle,padding:"20px"}}>
        <Skeleton width="180px" height="15px" style={{marginBottom:"6px"}} />
        <Skeleton width="100px" height="10px" style={{marginBottom:"16px"}} />
        <Skeleton width="100%" height="200px" radius="10px" />
      </div>

      {/* Attendance meter */}
      <div style={{...cardStyle,padding:"18px"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"10px"}}>
          <Skeleton width="180px" height="12px" />
          <Skeleton width="40px" height="16px" />
        </div>
        <Skeleton width="100%" height="8px" radius="99px" />
      </div>
    </div>
  );
}
