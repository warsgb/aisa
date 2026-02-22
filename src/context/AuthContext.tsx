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
  setCurrentTeam: (team: Team) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user has valid tokens and load their data
    const checkAuth = async () => {
      console.log('[AuthContext] Checking auth...');
      const token = localStorage.getItem('access_token');
      console.log('[AuthContext] Token found:', !!token);
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        console.log('[AuthContext] Calling getMe...');
        const me = await apiService.getMe();
        console.log('[AuthContext] getMe succeeded:', me.user);
        setUser(me.user);
        if (me.team) {
          setTeam(me.team);
        }
      } catch (error) {
        console.error('[AuthContext] getMe failed:', error);
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
    try {
      const response = await apiService.login(data);
      console.log('✅ [Auth Context] Login successful!');
      console.log('📊 User data:', response.user);
      console.log('💾 Storing access_token:', response.access_token ? 'Yes' : 'No');

      // Set user first
      setUser(response.user);

      // Try to load team data if user has a team
      if (response.team) {
        try {
          const fullTeam = await apiService.getTeam(response.team.id);
          setTeam(fullTeam);
        } catch (teamError) {
          console.warn('Failed to load team data:', teamError);
          setTeam(null);
        }
      } else {
        setTeam(null);
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
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

  const setCurrentTeam = async (newTeam: Team) => {
    // Update team in auth context
    setTeam(newTeam);

    // Update token with new team_id
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        // Refresh token with new team_id
        const response = await apiService.login({ email: user!.email, password: '' });
        if (response.team && response.team.id === newTeam.id) {
          // Successfully got token for new team
          localStorage.setItem('access_token', response.access_token);
          localStorage.setItem('refresh_token', response.refresh_token);
        }
      } catch (error) {
        console.error('Failed to refresh token for new team:', error);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, team, isLoading, login, register, logout, setTeam, setCurrentTeam }}>
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
