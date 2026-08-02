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
  superAdminCompanyId: number | null;
  setSuperAdminCompanyId: (id: number | null) => void;
  refreshFiscalYear: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFiscalYear, setActiveFiscalYear] = useState<FiscalYear | null>(null);
  const [superAdminCompanyId, setSuperAdminCompanyId] = useState<number | null>(null);
  const router = useRouter();

  const getBaseURL = () => {
    let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
    return url.endsWith('/') ? url.slice(0, -1) : url;
  };
  const API_BASE_URL = getBaseURL();
  axios.defaults.baseURL = API_BASE_URL;
  axios.defaults.withCredentials = true;

  // Configured Axios instance with automatic credentials
  const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
  });

  useEffect(() => {
    if (superAdminCompanyId) {
      api.defaults.headers.common['x-company-id'] = superAdminCompanyId.toString();
      axios.defaults.headers.common['x-company-id'] = superAdminCompanyId.toString();
    } else {
      delete api.defaults.headers.common['x-company-id'];
      delete axios.defaults.headers.common['x-company-id'];
    }
  }, [superAdminCompanyId]);

  const refreshFiscalYear = async () => {
    if (!user) return;
    try {
      const res = await api.get('/fiscal-years/active');
      setActiveFiscalYear(res.data);
    } catch (err) {
      console.error('Failed to load active fiscal year');
    }
  };

  // Effect to load session on start via HttpOnly Cookie
  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await api.get('/auth/me');
        if (res.data?.user) {
          setUser(res.data.user);
          api.get('/fiscal-years/active', { timeout: 3000 })
            .then((fyRes) => setActiveFiscalYear(fyRes.data))
            .catch(() => {});
        }
      } catch (err) {
        // Try refreshing via HttpOnly refresh_token cookie
        try {
          const refreshRes = await api.post('/auth/refresh');
          if (refreshRes.data) {
            const profileRes = await api.get('/auth/me');
            if (profileRes.data?.user) {
              setUser(profileRes.data.user);
              api.get('/fiscal-years/active', { timeout: 3000 })
                .then((fyRes) => setActiveFiscalYear(fyRes.data))
                .catch(() => {});
            }
          }
        } catch (refreshErr) {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      const loggedUser = res.data.user;

      setUser(loggedUser);

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
      const registeredUser = res.data.user;

      setUser(registeredUser);

      setLoading(false);
      router.push('/dashboard');
    } catch (err: any) {
      setLoading(false);
      const errMsg = err.response?.data?.message || 'Registration failed. Try again.';
      setError(Array.isArray(errMsg) ? errMsg[0] : errMsg);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore API errors on logout
    } finally {
      delete api.defaults.headers.common['x-company-id'];
      delete axios.defaults.headers.common['x-company-id'];
      setUser(null);
      setSuperAdminCompanyId(null);
      window.location.href = '/login';
    }
  };

  // Global Axios response interceptor for automatic HttpOnly token rotation
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/')) {
          originalRequest._retry = true;
          try {
            await api.post('/auth/refresh');
            return api(originalRequest);
          } catch (refreshErr) {
            logout();
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token: user ? 'cookie-authenticated' : null,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        error,
        clearError,
        api,
        activeFiscalYear,
        superAdminCompanyId,
        setSuperAdminCompanyId,
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
