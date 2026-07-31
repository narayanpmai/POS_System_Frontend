import { baseApi } from './baseApi';
import { PaginatedResponse } from './productsApi';

export const brandsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBrands: builder.query<
      PaginatedResponse<any>,
      { page?: number; limit?: number; search?: string }
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.set('page', String(params.page));
        if (params?.limit) queryParams.set('limit', String(params.limit));
        if (params?.search) queryParams.set('search', params.search);
        return `/brands?${queryParams.toString()}`;
      },
      providesTags: ['Brands'],
    }),
    createBrand: builder.mutation<any, object>({
      query: (body) => ({
        url: '/brands',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Brands'],
    }),
    updateBrand: builder.mutation<any, { id: number; data: object }>({
      query: ({ id, data }) => ({
        url: `/brands/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Brands'],
    }),
    deleteBrand: builder.mutation<any, number>({
      query: (id) => ({
        url: `/brands/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Brands'],
    }),
  }),
});

export const {
  useGetBrandsQuery,
  useCreateBrandMutation,
  useUpdateBrandMutation,
  useDeleteBrandMutation,
} = brandsApi;
