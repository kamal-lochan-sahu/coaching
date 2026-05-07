import { useQuery } from "@tanstack/react-query";
import { Users, BookOpen, CreditCard, AlertCircle, MessageSquare, TrendingDown, ClipboardCheck, TrendingUp, ArrowUpRight, ArrowDownRight, GraduationCap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import api from "../services/api";
import Loader from "../components/ui/Loader";
import { useAuthStore } from "../store/authStore";

const StatCard = ({ title, value, sub, icon: Icon, color, bg, trend }) => (
  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
        <Icon size={22} style={{ color }} />
      </div>
    </div>
    {trend !== undefined && (
      <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
        {trend >= 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
        {Math.abs(trend)}% vs last month
      </div>
    )}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-lg text-xs">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: ₹{p.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const user = useAuthStore(s => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/analytics/dashboard").then(r => r.data.data),
  });

  const { data: chart } = useQuery({
    queryKey: ["revenue-chart"],
    queryFn: () => api.get("/analytics/revenue").then(r => r.data.data),
  });

  if (isLoading) return <Loader text="Loading dashboard..." />;
  const d = data || {};
  const attPct = d.attendance?.today?.percentage || 0;
  const attColor = attPct >= 80 ? "#10b981" : attPct >= 60 ? "#f59e0b" : "#ef4444";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{greeting},</p>
          <h1 className="text-2xl font-bold text-gray-900">{user?.name} 👋</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString("en-IN", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
          <GraduationCap size={18} className="text-blue-600" />
          <span className="text-sm font-semibold text-blue-700">{user?.branding?.instituteName || "EduManage"}</span>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Students"    value={d.students?.total || 0}
          sub={`${d.students?.active || 0} active · ${d.students?.newThisMonth || 0} new this month`}
          icon={Users} color="#3b82f6" bg="#eff6ff" />

        <StatCard title="Today Attendance"
          value={<span style={{ color: attColor }}>{attPct}%</span>}
          sub={`${d.attendance?.today?.present || 0} present out of ${d.attendance?.today?.total || 0}`}
          icon={ClipboardCheck} color={attColor} bg={attPct >= 80 ? "#f0fdf4" : attPct >= 60 ? "#fffbeb" : "#fef2f2"} />

        <StatCard title="Fee Collected"
          value={`₹${(d.fees?.collectedToday || 0).toLocaleString()}`}
          sub={`₹${(d.fees?.collectedThisMonth || 0).toLocaleString()} this month`}
          icon={CreditCard} color="#f59e0b" bg="#fffbeb" trend={12} />

        <StatCard title="Pending Fees"
          value={`₹${(d.fees?.totalPending || 0).toLocaleString()}`}
          sub="Total outstanding amount"
          icon={AlertCircle} color="#ef4444" bg="#fef2f2" />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Active Batches"   value={d.batches?.total || 0}        icon={BookOpen}       color="#8b5cf6" bg="#f5f3ff" />
        <StatCard title="Enquiries (Week)" value={d.enquiries?.thisWeek || 0}   icon={MessageSquare}  color="#06b6d4" bg="#ecfeff" />
        <StatCard title="Expenses (Month)" value={`₹${(d.expenses?.thisMonth || 0).toLocaleString()}`} icon={TrendingDown} color="#f43f5e" bg="#fff1f2" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-5">
        {/* Revenue Chart */}
        <div className="col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-gray-900">Revenue vs Expenses</h2>
              <p className="text-xs text-gray-400 mt-0.5">Last 6 months overview</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />Revenue</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" />Expense</span>
            </div>
          </div>
          {chart?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chart} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill:"#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill:"#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[6,6,0,0]} name="Revenue" />
                <Bar dataKey="expense" fill="#f87171" radius={[6,6,0,0]} name="Expense" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center">
              <p className="text-gray-300 text-sm">No data yet — collect fees to see revenue chart</p>
            </div>
          )}
        </div>

        {/* Quick Stats Panel */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
          <div>
            <h2 className="font-bold text-gray-900">Quick Summary</h2>
            <p className="text-xs text-gray-400 mt-0.5">This month at a glance</p>
          </div>

          {[
            { label:"Net Profit",    value: `₹${((d.fees?.collectedThisMonth||0) - (d.expenses?.thisMonth||0)).toLocaleString()}`, color:"text-green-600" },
            { label:"Total Revenue", value: `₹${(d.fees?.collectedThisMonth||0).toLocaleString()}`, color:"text-blue-600" },
            { label:"Total Expense", value: `₹${(d.expenses?.thisMonth||0).toLocaleString()}`, color:"text-red-500" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <p className="text-sm text-gray-500">{label}</p>
              <p className={`font-bold text-sm ${color}`}>{value}</p>
            </div>
          ))}

          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
            <p className="text-xs text-blue-200 mb-1">Attendance Rate</p>
            <p className="text-3xl font-bold">{attPct}%</p>
            <div className="w-full bg-white/20 rounded-full h-1.5 mt-2">
              <div className="bg-white rounded-full h-1.5 transition-all" style={{ width: `${attPct}%` }} />
            </div>
            <p className="text-xs text-blue-200 mt-2">
              {attPct >= 80 ? "✅ Great attendance!" : attPct >= 60 ? "⚠️ Needs improvement" : "❌ Critical — send alerts"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
