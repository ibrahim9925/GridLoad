// @ts-nocheck

import { z } from "zod";

// Common validation patterns
const emailSchema = z.string().email("Please enter a valid email address");
const phoneSchema = z.string().regex(/^[\+]?[\d\s\-\(\)]+$/, "Please enter a valid phone number").optional().or(z.literal(""));
const positiveNumberSchema = z.number().min(0, "Value must be positive");
const requiredStringSchema = z.string().min(1, "This field is required");

// Customer validation schema
export const customerSchema = z.object({
  company_name: z.string().optional(),
  contact_person: requiredStringSchema,
  email: emailSchema.optional().or(z.literal("")),
  phone: phoneSchema,
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  notes: z.string().optional(),
  default_discount_percentage: z.number().min(0).max(100).optional(),
});

// Product validation schema
export const productSchema = z.object({
  name: requiredStringSchema,
  sku: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  cost_price: positiveNumberSchema.optional(),
  current_stock: z.number().int().min(0, "Stock cannot be negative"),
  low_stock_threshold: z.number().int().min(0, "Threshold must be positive"),
  max_stock_level: z.number().int().min(1, "Max stock must be at least 1"),
  reorder_point: z.number().int().min(0, "Reorder point must be positive"),
  reorder_quantity: z.number().int().min(1, "Reorder quantity must be at least 1"),
  moq: z.number().int().min(1, "MOQ must be at least 1").optional(),
  unit: z.string().default("pcs"),
  supplier: z.string().optional(),
  warranty_terms: z.string().optional(),
  default_warranty_months: z.number().int().min(1, "Warranty must be at least 1 month").default(12),
  is_active: z.boolean().default(true),
});

// Sales validation schema
export const salesSchema = z.object({
  customer_id: requiredStringSchema,
  sales_rep_id: requiredStringSchema,
  product_name: requiredStringSchema,
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unit_price: positiveNumberSchema,
  discount_type: z.enum(["percentage", "fixed"]).default("percentage"),
  discount_percentage: z.number().min(0).max(100).default(0),
  discount_amount: positiveNumberSchema.default(0),
  tax_amount: positiveNumberSchema.default(0),
  is_installment: z.boolean().default(false),
  installment_plan_type: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => {
  // Ensure discount percentage and amount are mutually exclusive
  if (data.discount_type === "percentage") {
    return data.discount_amount === 0;
  } else {
    return data.discount_percentage === 0;
  }
}, {
  message: "Cannot have both percentage and fixed discount",
  path: ["discount_amount"],
});

// Payment validation schema
export const paymentSchema = z.object({
  sale_id: requiredStringSchema,
  amount: z.number().min(0.01, "Payment amount must be greater than 0"),
  payment_method: z.enum(["cash", "card", "bank_transfer", "check", "other"]).default("cash"),
  payment_date: z.date().max(new Date(), "Payment date cannot be in the future"),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

// Lead validation schema
export const leadSchema = z.object({
  customer_id: requiredStringSchema,
  assigned_to: z.string().optional(),
  source: z.string().optional(),
  estimated_value: positiveNumberSchema.optional(),
  next_follow_up: z.date().min(new Date(), "Follow-up date must be in the future").optional(),
  notes: z.string().optional(),
});

// Installation validation schema
export const installationSchema = z.object({
  customer_id: requiredStringSchema,
  sale_id: z.string().optional(),
  assigned_engineer: z.string().optional(),
  scheduled_date: z.date().min(new Date(), "Installation date must be in the future"),
  site_address: requiredStringSchema,
  installation_notes: z.string().optional(),
});

// Expense validation schema
export const expenseSchema = z.object({
  category: z.enum(["fuel", "materials", "equipment", "travel", "meals", "other"]),
  description: requiredStringSchema,
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  expense_date: z.date().max(new Date(), "Expense date cannot be in the future"),
  assigned_to: z.string().optional(),
  installation_id: z.string().optional(),
  receipt_url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  notes: z.string().optional(),
});

// Warranty validation schema
export const warrantySchema = z.object({
  sale_id: z.string().optional(),
  product_id: requiredStringSchema,
  customer_id: requiredStringSchema,
  serial_number: requiredStringSchema,
  warranty_period_months: z.number().int().min(1, "Warranty period must be at least 1 month").default(12),
  warranty_type: z.enum(["manufacturer", "extended", "service"]).default("manufacturer"),
  warranty_start_date: z.date().max(new Date(), "Start date cannot be in the future"),
  notes: z.string().optional(),
});

// Authentication validation schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  confirmPassword: z.string(),
  full_name: requiredStringSchema,
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Validation helper functions
export const validateSchema = <T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: string[] } => {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ["Validation failed"] };
  }
};

export const getFieldError = (errors: z.ZodError, fieldName: string): string | undefined => {
  const fieldError = errors.errors.find(error => 
    error.path.length > 0 && error.path[0] === fieldName
  );
  return fieldError?.message;
};
