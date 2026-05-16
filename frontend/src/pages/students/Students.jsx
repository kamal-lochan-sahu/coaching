import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Search, Users } from "lucide-react";
import { useState } from "react";
import api from "../../services/api";
import Badge from "../../components/ui/Badge";
import Loader from "../../components/ui/Loader";
import EmptyState from "../../components/ui/EmptyState";

export default function Students() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");

  const { data, isLoading } = useQuery({
    queryKey: ["students", status],
    queryFn: () => api.get(`/students?status=${status}&limit=100`).then(r => r.data.data),
  });

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ["students-search", search],
    queryFn: () => api.get(`/students/search?q=${search}`).then(r => r.data.data),
    enabled: search.length >= 2,
  });

  const students = data?.students || [];
  const filtered = search.length >= 2 ? (searchResults || []) : students;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-400">{data?.total || 0} total students</p>
        </div>
        <Link to="/students/add"
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Add Student
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="passed">Passed</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? <Loader /> : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No students found"
          description="Add your first student to get started"
          action={<Link to="/students/add" className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm">Add Student</Link>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Student</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Phone</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Batch</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(s => (
                <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/students/${s._id}`} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                        {s.name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 hover:text-blue-600">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.admissionNumber}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.phone || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{s.currentBatch?.name || "—"}</td>
                  <td className="px-4 py-3"><Badge status={s.status} /></td>
                  <td className="px-4 py-3 text-gray-400">{new Date(s.admissionDate).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
