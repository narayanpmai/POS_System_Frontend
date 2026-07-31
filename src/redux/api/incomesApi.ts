import { baseApi } from './baseApi';
import { PaginatedResponse } from './productsApi';

export const incomesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getIncomes: builder.query<
      PaginatedResponse<any>,
      { page?: number; limit?: number; search?: string; category?: string }
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.set('page', String(params.page));
        if (params?.limit) queryParams.set('limit', String(params.limit));
        if (params?.search) queryParams.set('search', params.search);
        if (params?.category) queryParams.set('category', params.category);
        return `/incomes?${queryParams.toString()}`;
      },
      providesTags: ['Incomes'],
    }),
    createIncome: builder.mutation<any, object>({
      query: (body) => ({
        url: '/incomes',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Incomes'],
    }),
    updateIncome: builder.mutation<any, { id: number; data: object }>({
      query: ({ id, data }) => ({
        url: `/incomes/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Incomes'],
    }),
    deleteIncome: builder.mutation<any, number>({
      query: (id) => ({
        url: `/incomes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Incomes'],
    }),
  }),
});

export const {
  useGetIncomesQuery,
  useCreateIncomeMutation,
  useUpdateIncomeMutation,
  useDeleteIncomeMutation,
} = incomesApi;
