import {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";
import type { ReactNode } from "react";

export const DEMO_TOKEN = "fairrelay-demo-dispatcher";

interface User {
  id: string;
  name: string;
  phone: string;
  role: "DRIVER" | "SHIPPER" | "DISPATCHER";
  status: string;
  rating: number;
  deliveriesCount: number;
  totalEarnings: number;
  weeklyEarnings: number;
  trucks: any[];
  courierCompanyId?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isDemo: boolean;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("authToken");
    const savedUser = localStorage.getItem("user");
    const savedIsDemo = localStorage.getItem("isDemo") === "true";

    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(userData);
        setIsDemo(savedIsDemo);
      } catch {
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        localStorage.removeItem("isDemo");
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    const demo = newToken === DEMO_TOKEN;
    setToken(newToken);
    setUser(newUser);
    setIsDemo(demo);
    localStorage.setItem("authToken", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    localStorage.setItem("isDemo", String(demo));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setIsDemo(false);
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("isDemo");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isDemo,
        loading,
        login,
        logout,
        setLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
