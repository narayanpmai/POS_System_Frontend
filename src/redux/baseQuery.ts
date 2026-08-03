import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { Mutex } from 'async-mutex';
import { clearAuth } from './slices/authSlice';
import type { RootState } from './store';

const mutex = new Mutex();
let hasRedirectedToLogin = false;

const getBaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: getBaseUrl(),
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const token = state.auth?.token;
    if (token && token !== 'cookie-authenticated') {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const superAdminCompanyId = state.auth?.superAdminCompanyId;
    if (superAdminCompanyId) {
      headers.set('x-company-id', superAdminCompanyId.toString());
    }
    return headers;
  },
});

const refreshSession = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${getBaseUrl()}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.ok;
  } catch {
    return false;
  }
};

const redirectToLoginOnce = () => {
  if (hasRedirectedToLogin) return;
  if (typeof window === 'undefined') return;
  if (window.location.pathname === '/login' || window.location.pathname === '/register') return;

  hasRedirectedToLogin = true;
  window.location.replace('/login');
};

export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  await mutex.waitForUnlock();

  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const url =
      typeof args === 'string'
        ? args
        : typeof args?.url === 'string'
          ? args.url
          : '';
    const isAuthEndpoint = url.startsWith('/auth/') || url.includes('/auth/');

    if (isAuthEndpoint) {
      return result;
    }

    if (!mutex.isLocked()) {
      const release = await mutex.acquire();
      try {
        const refreshed = await refreshSession();

        if (refreshed) {
          hasRedirectedToLogin = false;
          result = await rawBaseQuery(args, api, extraOptions);

          if (result.error && result.error.status === 401) {
            api.dispatch(clearAuth());
            redirectToLoginOnce();
          }
        } else {
          api.dispatch(clearAuth());
          redirectToLoginOnce();
        }
      } finally {
        release();
      }
    } else {
      await mutex.waitForUnlock();
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }

  return result;
};

export const baseQuery = baseQueryWithReauth;
