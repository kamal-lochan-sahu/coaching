import Skeleton from "./Skeleton";

const cardStyle = { background:"#fff", borderRadius:"16px", border:"1px solid #f1f5f9", padding:"24px" };

export default function DetailSkeleton() {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"20px",maxWidth:"900px"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <Skeleton width="34px" height="34px" radius="10px" />
          <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
            <Skeleton width="160px" height="18px" />
            <Skeleton width="120px" height="10px" />
          </div>
        </div>
        <Skeleton width="130px" height="38px" radius="10px" />
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:"16px"}}>
        {/* Profile card */}
        <div style={cardStyle}>
          <Skeleton width="64px" height="64px" radius="50%" style={{marginBottom:"16px"}} />
          {Array.from({length:5}).map((_,i)=>(
            <div key={i} style={{marginBottom:"14px"}}>
              <Skeleton width="50%" height="9px" style={{marginBottom:"6px"}} />
              <Skeleton width="75%" height="12px" />
            </div>
          ))}
          <Skeleton width="100%" height="70px" radius="12px" style={{marginTop:"8px"}} />
        </div>

        {/* Right column */}
        <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
          {[0,1].map(i=>(
            <div key={i} style={{...cardStyle,padding:"20px"}}>
              <Skeleton width="140px" height="14px" style={{marginBottom:"14px"}} />
              {Array.from({length:3}).map((_,r)=>(
                <Skeleton key={r} width="100%" height="30px" style={{marginBottom:"8px"}} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
