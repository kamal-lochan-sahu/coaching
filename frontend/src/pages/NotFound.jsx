import { Link } from "react-router-dom";
import { GraduationCap, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-6">
          <GraduationCap size={28} className="text-white" />
        </div>
        <p className="text-6xl font-extrabold text-blue-500 mb-2">404</p>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Page not found</h1>
        <p className="text-sm text-gray-400 mb-8">
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
        >
          <Home size={16} /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
