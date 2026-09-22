import Modal from "./Modal";
import { useAuthStore } from "../../store/authStore";

export default function ReceiptPrintModal({ fee, onClose }) {
  const user = useAuthStore(s => s.user);
  const instituteName = user?.branding?.instituteName || "EduManage";
  const primaryColor  = user?.branding?.primaryColor  || "#1a56db";

  if (!fee) return null;

  const handlePrint = () => window.print();

  return (
    <Modal open={!!fee} onClose={onClose} title="Fee Receipt" size="sm">
      <div id="receipt-print-area">
        <div style={{textAlign:"center",marginBottom:"20px",paddingBottom:"16px",borderBottom:`2px solid ${primaryColor}`}}>
          <p style={{fontSize:"18px",fontWeight:800,color:primaryColor}}>{instituteName}</p>
          <p style={{fontSize:"11px",color:"#94a3b8",marginTop:"2px"}}>Fee Payment Receipt</p>
        </div>

        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"16px"}}>
          <div>
            <p style={{fontSize:"10px",color:"#94a3b8",fontWeight:600}}>RECEIPT NO.</p>
            <p style={{fontSize:"13px",fontWeight:700,color:"#0f172a"}}>{fee.receiptNumber || "—"}</p>
          </div>
          <div style={{textAlign:"right"}}>
            <p style={{fontSize:"10px",color:"#94a3b8",fontWeight:600}}>DATE</p>
            <p style={{fontSize:"13px",fontWeight:700,color:"#0f172a"}}>
              {fee.paidDate ? new Date(fee.paidDate).toLocaleDateString("en-IN") : "—"}
            </p>
          </div>
        </div>

        <div style={{background:"#f8fafc",borderRadius:"10px",padding:"14px",marginBottom:"16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
            <span style={{fontSize:"11px",color:"#64748b"}}>Student</span>
            <span style={{fontSize:"12px",fontWeight:600,color:"#0f172a"}}>{fee.studentId?.name || "—"}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
            <span style={{fontSize:"11px",color:"#64748b"}}>Batch</span>
            <span style={{fontSize:"12px",fontWeight:600,color:"#0f172a"}}>{fee.batchId?.name || "—"}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:"11px",color:"#64748b"}}>Fee Month</span>
            <span style={{fontSize:"12px",fontWeight:600,color:"#0f172a"}}>{fee.month || "—"}</span>
          </div>
        </div>

        <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"16px"}}>
          <tbody>
            <tr><td style={{padding:"6px 0",fontSize:"12px",color:"#64748b"}}>Amount</td>
              <td style={{padding:"6px 0",fontSize:"12px",textAlign:"right",fontWeight:600}}>₹{(fee.amount||0).toLocaleString()}</td></tr>
            {fee.discount > 0 && (
              <tr><td style={{padding:"6px 0",fontSize:"12px",color:"#64748b"}}>Discount</td>
                <td style={{padding:"6px 0",fontSize:"12px",textAlign:"right",fontWeight:600,color:"#16a34a"}}>−₹{fee.discount.toLocaleString()}</td></tr>
            )}
            <tr><td style={{padding:"6px 0",fontSize:"12px",color:"#64748b"}}>Payment Mode</td>
              <td style={{padding:"6px 0",fontSize:"12px",textAlign:"right",fontWeight:600,textTransform:"capitalize"}}>{fee.paymentMode || "—"}</td></tr>
          </tbody>
        </table>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px",background:`${primaryColor}12`,borderRadius:"10px",marginBottom:"20px"}}>
          <span style={{fontSize:"13px",fontWeight:700,color:"#0f172a"}}>Total Paid</span>
          <span style={{fontSize:"20px",fontWeight:800,color:primaryColor}}>₹{(fee.finalAmount||0).toLocaleString()}</span>
        </div>

        <p style={{textAlign:"center",fontSize:"10px",color:"#cbd5e1"}}>This is a computer-generated receipt.</p>
      </div>

      <div style={{display:"flex",gap:"10px",marginTop:"20px"}}>
        <button onClick={onClose} style={{flex:1,padding:"10px",border:"1.5px solid #e2e8f0",borderRadius:"10px",background:"#fff",color:"#64748b",fontWeight:600,cursor:"pointer",fontSize:"13px"}}>
          Close
        </button>
        <button onClick={handlePrint} style={{flex:1,padding:"10px",background:"#1a56db",color:"#fff",border:"none",borderRadius:"10px",fontWeight:700,cursor:"pointer",fontSize:"13px"}}>
          🖨️ Print
        </button>
      </div>
    </Modal>
  );
}
