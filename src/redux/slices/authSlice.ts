import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
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

interface AuthState {
  user: User | null;
  activeFiscalYear: FiscalYear | null;
  superAdminCompanyId: number | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  activeFiscalYear: null,
  superAdminCompanyId: null,
  loading: true,
  error: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.loading = false;
    },
    setActiveFiscalYear: (state, action: PayloadAction<FiscalYear | null>) => {
      state.activeFiscalYear = action.payload;
    },
    setSuperAdminCompanyId: (state, action: PayloadAction<number | null>) => {
      state.superAdminCompanyId = action.payload;
    },
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setAuthError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearAuth: (state) => {
      state.user = null;
      state.activeFiscalYear = null;
      state.superAdminCompanyId = null;
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  setUser,
  setActiveFiscalYear,
  setSuperAdminCompanyId,
  setAuthLoading,
  setAuthError,
  clearAuth,
} = authSlice.actions;

export default authSlice.reducer;
