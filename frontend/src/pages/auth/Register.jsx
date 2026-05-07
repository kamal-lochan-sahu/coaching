import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { GraduationCap } from "lucide-react";
import toast from "react-hot-toast";

export default function Register() {
  const [form, setForm] = useState({ name:"", email:"", phone:"", password:"", instituteName:"" });
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success("Account created!");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const f = (key) => ({ value: form[key], onChange: e => setForm({...form, [key]: e.target.value}) });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
            <GraduationCap size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">EduManage</h1>
            <p className="text-sm text-gray-400">Create your account</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label:"Institute Name", key:"instituteName", type:"text", placeholder:"Kamal Coaching Center" },
            { label:"Your Name",      key:"name",          type:"text", placeholder:"Kamal" },
            { label:"Email",          key:"email",         type:"email",placeholder:"you@example.com" },
            { label:"Phone",          key:"phone",         type:"tel", placeholder:"9876543210" },
            { label:"Password",       key:"password",      type:"password", placeholder:"Min 8 characters" },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type={type} required {...f(key)} placeholder={placeholder}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          ))}
          <button
            type="submit" disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-500 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
