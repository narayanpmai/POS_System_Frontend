import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '../baseQuery';

export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery,
  tagTypes: [
    'Products',
    'Categories',
    'Customers',
    'Sales',
    'Purchases',
    'Suppliers',
    'Brands',
    'Expenses',
    'Incomes',
    'Users',
    'Companies',
    'Settings',
  ],
  endpoints: () => ({}),
});
