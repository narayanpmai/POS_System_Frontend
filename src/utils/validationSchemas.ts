import * as yup from 'yup';

export const customerValidationSchema = yup.object({
  name: yup.string().required('Customer name is required').min(2, 'Name must be at least 2 characters'),
  email: yup
    .string()
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .email('Must be a valid email address')
    .optional(),
  phone: yup.string().nullable().optional(),
  address: yup.string().nullable().optional(),
});

export const brandValidationSchema = yup.object({
  name: yup.string().required('Brand name is required').min(2, 'Brand name must be at least 2 characters'),
  status: yup.string().oneOf(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const supplierValidationSchema = yup.object({
  name: yup.string().required('Supplier name is required').min(2, 'Supplier name must be at least 2 characters'),
  email: yup
    .string()
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .email('Must be a valid email address')
    .optional(),
  phone: yup.string().nullable().optional(),
  address: yup.string().nullable().optional(),
});

export const expenseValidationSchema = yup.object({
  referenceNo: yup.string().required('Reference number is required'),
  amount: yup
    .number()
    .typeError('Amount must be a number')
    .required('Amount is required')
    .positive('Amount must be greater than 0'),
  category: yup.string().required('Category is required'),
  description: yup.string().nullable().optional(),
  date: yup.string().optional(),
});

export const incomeValidationSchema = yup.object({
  referenceNo: yup.string().required('Reference number is required'),
  amount: yup
    .number()
    .typeError('Amount must be a number')
    .required('Amount is required')
    .positive('Amount must be greater than 0'),
  category: yup.string().required('Category is required'),
  description: yup.string().nullable().optional(),
  date: yup.string().optional(),
});

export const productValidationSchema = yup.object({
  name: yup.string().required('Product name is required').min(2, 'Product name must be at least 2 characters'),
  sku: yup.string().nullable().optional(),
  categoryId: yup.number().typeError('Please select a valid category').required('Category is required'),
  sellingPrice: yup
    .number()
    .typeError('Selling price must be a number')
    .required('Selling price is required')
    .min(0, 'Price cannot be negative'),
  purchasePrice: yup
    .number()
    .typeError('Cost price must be a number')
    .nullable()
    .optional()
    .min(0, 'Cost price cannot be negative'),
  stockQty: yup
    .number()
    .typeError('Stock quantity must be a number')
    .min(0, 'Stock cannot be negative')
    .default(0),
  alertQty: yup.number().typeError('Alert quantity must be a number').min(0).default(5),
  unit: yup.string().default('pcs'),
  description: yup.string().nullable().optional(),
});
