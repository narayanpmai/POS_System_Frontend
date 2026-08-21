'use client';

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { authApi } from '@/redux/api/authApi';
import { setUser, clearAuth, setActiveFiscalYear } from '@/redux/slices/authSlice';

export default function AppInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<any>();

  useEffect(() => {
    const initApp = async () => {
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
          const fyRes = await dispatch(authApi.endpoints.getActiveFiscalYear.initiate()).unwrap();
          if (fyRes) {
            dispatch(setActiveFiscalYear(fyRes));
          }
        }
      } catch (err) {
        dispatch(clearAuth());
      }
    };

    initApp();
  }, [dispatch]);

  return <>{children}</>;
}
