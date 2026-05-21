import { useState } from "react";
import { Search, Bell, LogOut, Brain } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

export function TopBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const { showToast } = useToast();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchQuery) {
      showToast(
        "Global Search Initiated",
        `Searching for: "${searchQuery}"`,
        "info",
      );
      setSearchQuery("");
    }
  };

  const handleNotificationClick = () => {
    showToast("Notifications", "You have 3 unread alerts", "info");
  };

  const handleLogout = () => {
    logout();
    showToast("Logged Out", "You have been logged out successfully", "success");
    navigate("/login");
  };

  const userInitials =
    user?.name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase() || "AC";

  return (
    <div className="sticky top-0 z-40 ml-[260px]">
    <div className="h-20 border-b border-white/10 bg-eco-dark/50 backdrop-blur-md flex items-center justify-between px-8">
      <div className="relative w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          id="global-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearch}
          placeholder="Search FairRelay..."
          className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-eco-emerald-400 transition-colors placeholder:text-gray-500"
        />
      </div>

      <div className="flex items-center space-x-4">
        <a
          href="https://fairrelay-brain-gdm1.onrender.com/demo/consolidation"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-lg shadow-lg transition-all active:scale-95"
        >
          <Brain className="w-4 h-4" />
          View Agent Brain
        </a>

        <button
          onClick={handleNotificationClick}
          className="relative p-2 text-gray-400 hover:text-white transition-colors active:scale-95"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-eco-emerald-500 rounded-full animate-pulse"></span>
        </button>

        <Link
          to="/admin"
          className="flex items-center space-x-3 pl-4 border-l border-white/10 group cursor-pointer"
        >
          <div className="text-right hidden md:block">
            <div className="text-sm font-medium text-white group-hover:text-eco-brand-orange transition-colors">
              {user?.name || "Dispatcher"}
            </div>
            <div className="text-xs text-gray-500">
              {user?.role || "DISPATCHER"}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm shadow-lg border border-white/20 group-hover:shadow-neon-orange transition-all">
            {userInitials}
          </div>
        </Link>

        <button
          onClick={handleLogout}
          className="p-2 text-gray-400 hover:text-eco-error transition-colors active:scale-95 ml-2"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
    </div>
  );
}
