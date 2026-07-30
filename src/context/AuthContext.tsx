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
  const [token, setToken] = useState<string | null>(null);
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

  // Unified configured Axios instance
  const api = axios.create({
    baseURL: API_BASE_URL,
  });

  useEffect(() => {
    if (superAdminCompanyId) {
      localStorage.setItem('smartpos_superadmin_company', superAdminCompanyId.toString());
      api.defaults.headers.common['x-company-id'] = superAdminCompanyId.toString();
      axios.defaults.headers.common['x-company-id'] = superAdminCompanyId.toString();
    } else {
      localStorage.removeItem('smartpos_superadmin_company');
      delete api.defaults.headers.common['x-company-id'];
      delete axios.defaults.headers.common['x-company-id'];
    }
  }, [superAdminCompanyId]);

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
      const storedToken = localStorage.getItem('smartpos_token');
      const storedUser = localStorage.getItem('smartpos_user');
      const storedCompanyId = localStorage.getItem('smartpos_superadmin_company');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // Attach bearer token to axios common header
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        
        if (storedCompanyId) {
          setSuperAdminCompanyId(parseInt(storedCompanyId, 10));
          api.defaults.headers.common['x-company-id'] = storedCompanyId;
          axios.defaults.headers.common['x-company-id'] = storedCompanyId;
        }
        
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

      localStorage.setItem('smartpos_token', access_token);
      localStorage.setItem('smartpos_user', JSON.stringify(loggedUser));

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

      localStorage.setItem('smartpos_token', access_token);
      localStorage.setItem('smartpos_user', JSON.stringify(registeredUser));

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
    localStorage.removeItem('smartpos_token');
    localStorage.removeItem('smartpos_user');
    localStorage.removeItem('smartpos_superadmin_company');
    delete api.defaults.headers.common['Authorization'];
    delete axios.defaults.headers.common['Authorization'];
    delete api.defaults.headers.common['x-company-id'];
    delete axios.defaults.headers.common['x-company-id'];
    setToken(null);
    setUser(null);
    setSuperAdminCompanyId(null);
    window.location.href = '/login';
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
