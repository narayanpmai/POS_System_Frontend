'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios, { AxiosInstance } from 'axios';

interface User {
  id: number;
  email: string;
  name: string;
  roleId: number;
  active: boolean;
  role: {
    id: number;
    name: string;
    description?: string;
  };
  companyId: number;
}

export interface FiscalYear {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
  clearError: () => void;
  api: AxiosInstance;
  activeFiscalYear: FiscalYear | null;
  refreshFiscalYear: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFiscalYear, setActiveFiscalYear] = useState<FiscalYear | null>(null);
  const router = useRouter();

  // Unified configured Axios instance
  const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  });

  const refreshFiscalYear = async () => {
    if (!token) return;
    try {
      const res = await api.get('/fiscal-years/active');
      setActiveFiscalYear(res.data);
    } catch (err) {
      console.error('Failed to load active fiscal year');
    }
  };

  // Effect to load session on start
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = sessionStorage.getItem('smartpos_token');
      const storedUser = sessionStorage.getItem('smartpos_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // Attach bearer token to axios common header
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        
        try {
          const fyRes = await api.get('/fiscal-years/active');
          setActiveFiscalYear(fyRes.data);
        } catch (e) {
          console.error(e);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { access_token, user: loggedUser } = res.data;

      sessionStorage.setItem('smartpos_token', access_token);
      sessionStorage.setItem('smartpos_user', JSON.stringify(loggedUser));

      setToken(access_token);
      setUser(loggedUser);

      // Attach token
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

      try {
        const fyRes = await api.get('/fiscal-years/active');
        setActiveFiscalYear(fyRes.data);
      } catch (e) {}

      setLoading(false);
      router.push('/dashboard');
    } catch (err: any) {
      setLoading(false);
      const errMsg = err.response?.data?.message || 'Login failed. Please check credentials.';
      setError(Array.isArray(errMsg) ? errMsg[0] : errMsg);
      throw err;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/register', { name, email, password, role: 'Cashier' });
      const { access_token, user: registeredUser } = res.data;

      sessionStorage.setItem('smartpos_token', access_token);
      sessionStorage.setItem('smartpos_user', JSON.stringify(registeredUser));

      setToken(access_token);
      setUser(registeredUser);

      // Attach token
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

      setLoading(false);
      router.push('/dashboard');
    } catch (err: any) {
      setLoading(false);
      const errMsg = err.response?.data?.message || 'Registration failed. Try again.';
      setError(Array.isArray(errMsg) ? errMsg[0] : errMsg);
      throw err;
    }
  };

  const logout = () => {
    sessionStorage.removeItem('smartpos_token');
    sessionStorage.removeItem('smartpos_user');
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
    delete axios.defaults.headers.common['Authorization'];
    router.push('/login');
  };

  // Setup global Axios interceptor for 401 Unauthorized
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          if (error.response.data) {
            error.response.data.message = 'Session expired. Please log in again.';
          }
          // Auto-logout if token is invalid or expired
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []); // Ignore deps warning, logout doesn't change meaningfully

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token,
        login,
        register,
        logout,
        error,
        clearError,
        api,
        activeFiscalYear,
        refreshFiscalYear,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
