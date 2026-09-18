import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";

export default function AddStudent() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name:"", phone:"", email:"", gender:"male", dateOfBirth:"", address:"",
    guardianName:"", guardianPhone:"", guardianRelation:"father",
    branchId:"", batchId:"",
  });

  const { data: branches } = useQuery({ queryKey:["branches"], queryFn: () => api.get("/branches").then(r=>r.data.data) });
  const { data: batches }  = useQuery({ queryKey:["batches"],  queryFn: () => api.get("/batches").then(r=>r.data.data) });

  const mutation = useMutation({
    mutationFn: (data) => api.post("/students", data),
    onSuccess: (res) => {
      qc.invalidateQueries(["students"]);
      toast.success("Student added!");
      navigate(`/students/${res.data.data._id}`);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed"),
  });

  const f = (key) => ({ value: form[key], onChange: e => setForm({...form, [key]: e.target.value}) });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Student</h1>
        <p className="text-sm text-gray-400">Fill in student details below</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
        <h2 className="font-semibold text-gray-800 border-b pb-2">Basic Information</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label:"Full Name*", key:"name", type:"text" },
            { label:"Phone",      key:"phone", type:"tel" },
            { label:"Email",      key:"email", type:"email" },
            { label:"Date of Birth", key:"dateOfBirth", type:"date" },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input type={type} {...f(key)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select {...f("gender")} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <textarea {...f("address")} rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <h2 className="font-semibold text-gray-800 border-b pb-2 pt-2">Guardian Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Guardian Name</label>
            <input type="text" {...f("guardianName")}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Guardian Phone</label>
            <input type="tel" {...f("guardianPhone")}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Relation</label>
            <select {...f("guardianRelation")} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="father">Father</option>
              <option value="mother">Mother</option>
              <option value="guardian">Guardian</option>
            </select>
          </div>
        </div>

        <h2 className="font-semibold text-gray-800 border-b pb-2 pt-2">Academic Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch*</label>
            <select {...f("branchId")} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="">Select Branch</option>
              {branches?.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
            <select {...f("batchId")} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="">Select Batch</option>
              {batches?.map(b => (
                <option key={b._id} value={b._id}>
                  {b.name} ({b.enrolled}/{b.capacity})
                </option>
              ))}
            </select>
            {form.batchId && batches?.find(b => b._id === form.batchId)?.enrolled >= batches?.find(b => b._id === form.batchId)?.capacity && (
              <p className="text-xs text-red-500 mt-1 font-medium flex items-center gap-1">
                ⚠️ Selected batch is at or over capacity
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => navigate("/students")}
            className="px-5 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
          >Cancel</button>
          <button
            onClick={() => mutation.mutate(form)}
            disabled={!form.name || !form.branchId || mutation.isPending}
            className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-60"
          >
            {mutation.isPending ? "Saving..." : "Add Student"}
          </button>
        </div>
      </div>
    </div>
  );
}
