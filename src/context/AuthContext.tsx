'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios, { AxiosInstance } from 'axios';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/redux/store';
import {
  setUser,
  setActiveFiscalYear,
  setSuperAdminCompanyId as setSuperAdminCompanyIdAction,
  clearAuth,
  User,
  FiscalYear,
} from '@/redux/slices/authSlice';
import {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useLazyGetActiveFiscalYearQuery,
  authApi,
} from '@/redux/api/authApi';

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
  const dispatch = useDispatch();
  const router = useRouter();
  const { user, activeFiscalYear, superAdminCompanyId, loading, error } = useSelector(
    (state: RootState) => state.auth
  );

  const [loginMutation] = useLoginMutation();
  const [registerMutation] = useRegisterMutation();
  const [logoutMutation] = useLogoutMutation();
  const [triggerFiscalYear] = useLazyGetActiveFiscalYearQuery();

  const getBaseURL = () => {
    let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
    return url.endsWith('/') ? url.slice(0, -1) : url;
  };
  const API_BASE_URL = getBaseURL();
  axios.defaults.baseURL = API_BASE_URL;
  axios.defaults.withCredentials = true;

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
      const fy = await triggerFiscalYear().unwrap();
      dispatch(setActiveFiscalYear(fy));
    } catch (err) {
      console.error('Failed to load active fiscal year');
    }
  };

  // Initial Auth Check via RTK Query getMe
  useEffect(() => {
    const initAuth = async () => {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path === '/login' || path === '/register') {
          dispatch(setUser({ user: null }));
          return;
        }
      }

      try {
        const res = await dispatch(authApi.endpoints.getMe.initiate()).unwrap();
        if (res?.user) {
          dispatch(setUser({ user: res.user }));
          refreshFiscalYear();
        }
      } catch (err) {
        dispatch(clearAuth());
      }
    };
    initAuth();
  }, [dispatch]);

  const login = async (email: string, password: string) => {
    try {
      const res = await loginMutation({ email, password }).unwrap();
      dispatch(setUser({ user: res.user, token: res.access_token }));
      refreshFiscalYear();
      router.push('/dashboard');
    } catch (err: any) {
      throw err;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const res = await registerMutation({ name, email, password }).unwrap();
      dispatch(setUser({ user: res.user, token: res.access_token }));
      router.push('/dashboard');
    } catch (err: any) {
      throw err;
    }
  };

  const logout = async () => {
    try {
      await logoutMutation().unwrap();
    } catch (e) {
    } finally {
      dispatch(clearAuth());
      window.location.href = '/login';
    }
  };

  const setSuperAdminCompanyId = (id: number | null) => {
    dispatch(setSuperAdminCompanyIdAction(id));
  };

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
        clearError: () => {},
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
