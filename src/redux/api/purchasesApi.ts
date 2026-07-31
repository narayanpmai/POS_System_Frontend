import { baseApi } from './baseApi';
import { PaginatedResponse } from './productsApi';

export const purchasesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPurchases: builder.query<
      PaginatedResponse<any>,
      { page?: number; limit?: number; search?: string }
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.set('page', String(params.page));
        if (params?.limit) queryParams.set('limit', String(params.limit));
        if (params?.search) queryParams.set('search', params.search);
        return `/purchases?${queryParams.toString()}`;
      },
      providesTags: ['Purchases'],
    }),
    createPurchase: builder.mutation<any, object>({
      query: (body) => ({
        url: '/purchases',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Purchases', 'Products', 'Suppliers'],
    }),
    updatePurchase: builder.mutation<any, { id: number; data: object }>({
      query: ({ id, data }) => ({
        url: `/purchases/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Purchases', 'Products'],
    }),
  }),
});

export const {
  useGetPurchasesQuery,
  useCreatePurchaseMutation,
  useUpdatePurchaseMutation,
} = purchasesApi;
