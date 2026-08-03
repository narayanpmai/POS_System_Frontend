import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { RootState } from '@/redux/store';
import {
  setUser,
  setActiveFiscalYear,
  setSuperAdminCompanyId as setSuperAdminCompanyIdAction,
  clearAuth,
  setAuthError,
} from '@/redux/slices/authSlice';
import {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useLazyGetActiveFiscalYearQuery,
} from '@/redux/api/authApi';
import { api } from '@/utils/api';

export function useAuth() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { user, activeFiscalYear, superAdminCompanyId, loading, error } = useSelector(
    (state: RootState) => state.auth
  );

  const [loginMutation] = useLoginMutation();
  const [registerMutation] = useRegisterMutation();
  const [logoutMutation] = useLogoutMutation();
  const [triggerFiscalYear] = useLazyGetActiveFiscalYearQuery();

  const refreshFiscalYear = async () => {
    try {
      const fy = await triggerFiscalYear().unwrap();
      dispatch(setActiveFiscalYear(fy));
    } catch (err) {}
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await loginMutation({ email, password }).unwrap();
      if (typeof window !== 'undefined' && res.access_token) {
        localStorage.setItem('token', res.access_token);
      }
      dispatch(setUser({ user: res.user, token: res.access_token }));
      refreshFiscalYear();
      router.push('/dashboard');
    } catch (err: any) {
      const errMsg = err?.data?.message || 'Login failed. Please check credentials.';
      dispatch(setAuthError(Array.isArray(errMsg) ? errMsg[0] : errMsg));
      throw err;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const res = await registerMutation({ name, email, password }).unwrap();
      if (typeof window !== 'undefined' && res.access_token) {
        localStorage.setItem('token', res.access_token);
      }
      dispatch(setUser({ user: res.user, token: res.access_token }));
      router.push('/dashboard');
    } catch (err: any) {
      const errMsg = err?.data?.message || 'Registration failed. Try again.';
      dispatch(setAuthError(Array.isArray(errMsg) ? errMsg[0] : errMsg));
      throw err;
    }
  };

  const logout = async () => {
    try {
      await logoutMutation().unwrap();
    } catch (e) {
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
      dispatch(clearAuth());
      window.location.href = '/login';
    }
  };

  const setSuperAdminCompanyId = (id: number | null) => {
    dispatch(setSuperAdminCompanyIdAction(id));
  };

  return {
    user,
    token: user ? 'cookie-authenticated' : null,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    error,
    clearError: () => dispatch(setAuthError(null)),
    api,
    activeFiscalYear,
    superAdminCompanyId,
    setSuperAdminCompanyId,
    refreshFiscalYear,
  };
}

export default useAuth;
