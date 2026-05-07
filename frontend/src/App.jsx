import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/authStore";

import Layout from "./components/common/Layout";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/students/Students";
import AddStudent from "./pages/students/AddStudent";
import StudentDetail from "./pages/students/StudentDetail";
import Batches from "./pages/batches/Batches";
import Attendance from "./pages/attendance/Attendance";
import Fees from "./pages/fees/Fees";
import Tests from "./pages/tests/Tests";
import Staff from "./pages/staff/Staff";
import Enquiries from "./pages/enquiries/Enquiries";
import Expenses from "./pages/expenses/Expenses";
import Analytics from "./pages/analytics/Analytics";
import Settings from "./pages/Settings";

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30000 } } });

const ProtectedRoute = ({ children }) => {
  const token = useAuthStore(s => s.token);
  return token ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const token = useAuthStore(s => s.token);
  return !token ? children : <Navigate to="/" replace />;
};

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <Routes>
          <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index                  element={<Dashboard />} />
            <Route path="students"        element={<Students />} />
            <Route path="students/add"    element={<AddStudent />} />
            <Route path="students/:id"    element={<StudentDetail />} />
            <Route path="batches"         element={<Batches />} />
            <Route path="attendance"      element={<Attendance />} />
            <Route path="fees"            element={<Fees />} />
            <Route path="tests"           element={<Tests />} />
            <Route path="staff"           element={<Staff />} />
            <Route path="enquiries"       element={<Enquiries />} />
            <Route path="expenses"        element={<Expenses />} />
            <Route path="analytics"       element={<Analytics />} />
            <Route path="settings"        element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
