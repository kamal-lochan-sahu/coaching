import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { GraduationCap, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success("Welcome back!");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
              <GraduationCap size={22} className="text-white" />
            </div>
            <span className="text-white font-bold text-xl">EduManage</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Manage your institute<br />smarter, not harder.
            </h1>
            <p className="text-blue-200 mt-4 text-lg leading-relaxed">
              Attendance, fees, results, and communication — all in one place.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { num: "12+", label: "Features" },
              { num: "0₹", label: "Setup Cost" },
              { num: "100%", label: "Cloud Based" },
              { num: "5min", label: "Onboarding" },
            ].map(({ num, label }) => (
              <div key={label} className="bg-white/10 backdrop-blur rounded-xl p-4">
                <p className="text-2xl font-bold text-white">{num}</p>
                <p className="text-blue-200 text-sm">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-blue-300 text-sm relative z-10">© 2026 EduManage. White Label Ready.</p>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <GraduationCap size={22} className="text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">EduManage</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Welcome back 👋</h2>
            <p className="text-gray-500 mt-2">Sign in to your institute dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email" required
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-sm"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPass ? "text" : "password"} required
                  value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  className="w-full pl-11 pr-12 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-sm"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <> Sign In <ArrowRight size={17} /> </>
              )}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 mb-1">Demo Credentials</p>
            <p className="text-xs text-blue-600">Email: kamal@test.com</p>
            <p className="text-xs text-blue-600">Password: test1234</p>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            No account?{" "}
            <Link to="/register" className="text-blue-600 font-semibold hover:underline">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
