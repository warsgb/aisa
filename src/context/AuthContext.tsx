import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { apiService } from '../services/api.service';
import type { User, Team, LoginDto, RegisterDto } from '../types';

interface AuthContextType {
  user: User | null;
  team: Team | null;
  isLoading: boolean;
  login: (data: LoginDto) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => void;
  setTeam: (team: Team | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user has valid tokens and load their data
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const me = await apiService.getMe();
        setUser(me.user);
        if (me.team) {
          setTeam(me.team);
        }
      } catch {
        // Not authenticated - clear tokens
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (data: LoginDto) => {
    console.log('🔐 [Auth Context] Login attempt...', { email: data.email });
    const response = await apiService.login(data);
    console.log('✅ [Auth Context] Login successful!');
    console.log('📊 User data:', response.user);
    console.log('💾 Storing access_token:', response.access_token ? 'Yes' : 'No');
    setUser(response.user);
    // Convert TeamBasic to Team if needed
    if (response.team) {
      const fullTeam = await apiService.getTeam(response.team.id);
      setTeam(fullTeam);
    } else {
      setTeam(null);
    }
  };

  const register = async (data: RegisterDto) => {
    const response = await apiService.register(data);
    setUser(response.user);
    if (response.team) {
      const fullTeam = await apiService.getTeam(response.team.id);
      setTeam(fullTeam);
    } else {
      setTeam(null);
    }
  };

  const logout = () => {
    apiService.logout();
    setUser(null);
    setTeam(null);
  };

  return (
    <AuthContext.Provider value={{ user, team, isLoading, login, register, logout, setTeam }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
