import Skeleton from "./Skeleton";

export default function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div style={{background:"#fff",borderRadius:"16px",border:"1px solid #f1f5f9",overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead>
          <tr style={{background:"#f8fafc",borderBottom:"1px solid #f1f5f9"}}>
            {Array.from({length:cols}).map((_,i)=>(
              <th key={i} style={{padding:"12px 16px"}}><Skeleton width="60%" height="10px" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({length:rows}).map((_,r)=>(
            <tr key={r} style={{borderTop:"1px solid #f8fafc"}}>
              {Array.from({length:cols}).map((_,c)=>(
                <td key={c} style={{padding:"14px 16px"}}>
                  {c===0?(
                    <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                      <Skeleton width="36px" height="36px" radius="50%" style={{flexShrink:0}} />
                      <div style={{display:"flex",flexDirection:"column",gap:"6px",flex:1}}>
                        <Skeleton width="70%" height="12px" />
                        <Skeleton width="40%" height="9px" />
                      </div>
                    </div>
                  ):(
                    <Skeleton width={`${50+Math.random()*30}%`} height="11px" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
