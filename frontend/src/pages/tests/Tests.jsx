import { FileText } from "lucide-react";
export default function TestsResults() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <FileText size={28} className="text-blue-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tests & Results</h1>
          <p className="text-sm text-gray-400">Coming in next session</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <FileText size={64} className="text-gray-200 mx-auto mb-4" />
        <p className="text-gray-400">This section will be built next.</p>
      </div>
    </div>
  );
}
