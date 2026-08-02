import { baseApi } from './baseApi';
import { User, FiscalYear } from '../slices/authSlice';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query<{ user: User }, void>({
      query: () => '/auth/me',
    }),
    login: builder.mutation<{ user: User; access_token?: string }, { email: string; password: string }>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation<{ user: User; access_token?: string }, { name: string; email: string; password: string; role?: string }>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: { ...userData, role: userData.role || 'Cashier' },
      }),
    }),
    logout: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),
    getActiveFiscalYear: builder.query<FiscalYear, void>({
      query: () => '/fiscal-years/active',
    }),
  }),
});

export const {
  useGetMeQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetActiveFiscalYearQuery,
  useLazyGetActiveFiscalYearQuery,
} = authApi;
