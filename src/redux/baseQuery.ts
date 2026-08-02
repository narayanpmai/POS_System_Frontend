import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from './store';

export const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1',
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const token = state.auth?.token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const superAdminCompanyId = state.auth?.superAdminCompanyId;
    if (superAdminCompanyId) {
      headers.set('x-company-id', superAdminCompanyId.toString());
    }
    return headers;
  },
});
