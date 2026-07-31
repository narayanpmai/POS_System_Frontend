import { baseApi } from './baseApi';
import { PaginatedResponse } from './productsApi';

export const categoriesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query<
      PaginatedResponse<any> | any[],
      { page?: number; limit?: number; search?: string } | void
    >({
      query: (params) => {
        if (!params) return '/categories';
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.set('page', String(params.page));
        if (params.limit) queryParams.set('limit', String(params.limit));
        if (params.search) queryParams.set('search', params.search);
        return `/categories?${queryParams.toString()}`;
      },
      providesTags: ['Categories'],
    }),
    getCategoryTree: builder.query<any[], void>({
      query: () => '/categories/tree',
      providesTags: ['Categories'],
    }),
    createCategory: builder.mutation<any, FormData | object>({
      query: (body) => ({
        url: '/categories',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Categories'],
    }),
    updateCategory: builder.mutation<any, { id: number; data: FormData | object }>({
      query: ({ id, data }) => ({
        url: `/categories/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Categories'],
    }),
    deleteCategory: builder.mutation<any, number>({
      query: (id) => ({
        url: `/categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Categories'],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useGetCategoryTreeQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoriesApi;
