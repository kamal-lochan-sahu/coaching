import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import api from "../../services/api";
import Badge from "../../components/ui/Badge";
import Loader from "../../components/ui/Loader";

export default function StudentDetail() {
  const { id } = useParams();
  const { data: history, isLoading } = useQuery({
    queryKey: ["student-history", id],
    queryFn: () => api.get(`/students/${id}/history`).then(r => r.data.data),
  });

  if (isLoading) return <Loader />;
  const { student, attendance, fees, results } = history || {};

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link to="/students" className="p-1.5 rounded-lg hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{student?.name}</h1>
        <Badge status={student?.status} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Info */}
        <div className="col-span-1 bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
            {student?.name?.[0]}
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-gray-500">Phone: <span className="text-gray-900">{student?.phone || "—"}</span></p>
            <p className="text-gray-500">Batch: <span className="text-gray-900">{student?.currentBatch?.name || "—"}</span></p>
            <p className="text-gray-500">Adm No: <span className="text-gray-900">{student?.admissionNumber}</span></p>
            <p className="text-gray-500">Guardian: <span className="text-gray-900">{student?.guardianName || "—"}</span></p>
            <p className="text-gray-500">G.Phone: <span className="text-gray-900">{student?.guardianPhone || "—"}</span></p>
          </div>
        </div>

        {/* Recent Results */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Recent Test Results</h2>
          {results?.length === 0 ? <p className="text-sm text-gray-400">No results yet</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-gray-400 text-xs">
                <th className="text-left pb-2">Test</th>
                <th className="text-left pb-2">Marks</th>
                <th className="text-left pb-2">%</th>
                <th className="text-left pb-2">Grade</th>
                <th className="text-left pb-2">Rank</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {results?.map(r => (
                  <tr key={r._id}>
                    <td className="py-2">{r.testId?.name}</td>
                    <td className="py-2">{r.marksObtained}/{r.testId?.totalMarks}</td>
                    <td className="py-2">{r.percentage}%</td>
                    <td className="py-2"><Badge status={r.grade} label={r.grade} /></td>
                    <td className="py-2">#{r.rank}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Fees */}
        <div className="col-span-3 bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Fee History</h2>
          {fees?.length === 0 ? <p className="text-sm text-gray-400">No fee records</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-gray-400 text-xs">
                <th className="text-left pb-2">Month</th>
                <th className="text-left pb-2">Amount</th>
                <th className="text-left pb-2">Mode</th>
                <th className="text-left pb-2">Receipt</th>
                <th className="text-left pb-2">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {fees?.map(f => (
                  <tr key={f._id}>
                    <td className="py-2">{f.month}</td>
                    <td className="py-2">₹{f.finalAmount.toLocaleString()}</td>
                    <td className="py-2 capitalize">{f.paymentMode || "—"}</td>
                    <td className="py-2 text-xs text-gray-400">{f.receiptNumber || "—"}</td>
                    <td className="py-2"><Badge status={f.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
