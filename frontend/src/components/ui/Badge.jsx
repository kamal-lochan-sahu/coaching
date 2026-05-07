const colors = {
  active:    "bg-green-100 text-green-700",
  inactive:  "bg-gray-100 text-gray-600",
  paid:      "bg-green-100 text-green-700",
  pending:   "bg-yellow-100 text-yellow-700",
  waived:    "bg-blue-100 text-blue-700",
  present:   "bg-green-100 text-green-700",
  absent:    "bg-red-100 text-red-700",
  late:      "bg-yellow-100 text-yellow-700",
  new:       "bg-blue-100 text-blue-700",
  contacted: "bg-purple-100 text-purple-700",
  converted: "bg-green-100 text-green-700",
  lost:      "bg-red-100 text-red-700",
  owner:     "bg-purple-100 text-purple-700",
  teacher:   "bg-blue-100 text-blue-700",
  admin:     "bg-orange-100 text-orange-700",
};

export default function Badge({ status, label }) {
  const cls = colors[status] || "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {label || status}
    </span>
  );
}
