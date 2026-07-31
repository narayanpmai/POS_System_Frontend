import { baseApi } from './baseApi';
import { PaginatedResponse } from './productsApi';

export interface SalesPaginatedResponse extends PaginatedResponse<any> {
  totalSalesAmount: number;
}

export const salesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSales: builder.query<
      SalesPaginatedResponse,
      { page?: number; limit?: number; search?: string; startDate?: string; endDate?: string; categoryId?: string }
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.set('page', String(params.page));
        if (params?.limit) queryParams.set('limit', String(params.limit));
        if (params?.search) queryParams.set('search', params.search);
        if (params?.startDate) queryParams.set('startDate', params.startDate);
        if (params?.endDate) queryParams.set('endDate', params.endDate);
        if (params?.categoryId) queryParams.set('categoryId', params.categoryId);
        return `/sales?${queryParams.toString()}`;
      },
      providesTags: ['Sales'],
    }),
    getSaleById: builder.query<any, number>({
      query: (id) => `/sales/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Sales', id }],
    }),
    createSale: builder.mutation<any, object>({
      query: (body) => ({
        url: '/sales',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Sales', 'Products', 'Customers'],
    }),
  }),
});

export const {
  useGetSalesQuery,
  useGetSaleByIdQuery,
  useCreateSaleMutation,
} = salesApi;
