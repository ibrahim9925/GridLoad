// @ts-nocheck

import React from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  custom?: (value: any) => string | null;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationErrors {
  [key: string]: string;
}

export const validateField = (value: any, rules: ValidationRule): string | null => {
  // Required check
  if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return 'This field is required';
  }

  // Skip other validations if field is empty and not required
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return null;
  }

  // String validations
  if (typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      return `Must be at least ${rules.minLength} characters`;
    }
    
    if (rules.maxLength && value.length > rules.maxLength) {
      return `Must be no more than ${rules.maxLength} characters`;
    }
    
    if (rules.pattern && !rules.pattern.test(value)) {
      return 'Invalid format';
    }
  }

  // Number validations
  if (typeof value === 'number' || !isNaN(Number(value))) {
    const numValue = Number(value);
    
    if (rules.min !== undefined && numValue < rules.min) {
      return `Must be at least ${rules.min}`;
    }
    
    if (rules.max !== undefined && numValue > rules.max) {
      return `Must be no more than ${rules.max}`;
    }
  }

  // Custom validation
  if (rules.custom) {
    return rules.custom(value);
  }

  return null;
};

export const validateForm = (data: Record<string, any>, schema: ValidationSchema): ValidationErrors => {
  const errors: ValidationErrors = {};
  
  Object.keys(schema).forEach(field => {
    const error = validateField(data[field], schema[field]);
    if (error) {
      errors[field] = error;
    }
  });
  
  return errors;
};

// Pre-defined validation patterns
export const validationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  postalCode: /^[A-Z0-9\s\-]{3,10}$/i,
  currency: /^\d+(\.\d{1,2})?$/,
  percentage: /^(100|[1-9]?\d)(\.\d{1,2})?$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  lettersOnly: /^[a-zA-Z\s]+$/,
  numbersOnly: /^\d+$/,
};

// Common validation schemas
export const customerValidationSchema: ValidationSchema = {
  contact_person: {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: validationPatterns.lettersOnly,
  },
  email: {
    pattern: validationPatterns.email,
    maxLength: 255,
  },
  phone: {
    pattern: validationPatterns.phone,
    maxLength: 20,
  },
  company_name: {
    maxLength: 100,
  },
  address: {
    maxLength: 255,
  },
  city: {
    maxLength: 50,
    pattern: validationPatterns.lettersOnly,
  },
  state: {
    maxLength: 50,
    pattern: validationPatterns.lettersOnly,
  },
  postal_code: {
    pattern: validationPatterns.postalCode,
    maxLength: 10,
  },
  default_discount_percentage: {
    min: 0,
    max: 100,
    custom: (value) => {
      if (value && !validationPatterns.percentage.test(value.toString())) {
        return 'Invalid percentage format';
      }
      return null;
    },
  },
};

export const productValidationSchema: ValidationSchema = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  sku: {
    maxLength: 50,
    pattern: validationPatterns.alphanumeric,
  },
  category: {
    maxLength: 50,
  },
  supplier: {
    maxLength: 100,
  },
  cost_price: {
    min: 0,
    custom: (value) => {
      if (value && !validationPatterns.currency.test(value.toString())) {
        return 'Invalid currency format';
      }
      return null;
    },
  },
  current_stock: {
    min: 0,
    custom: (value) => {
      if (value && !Number.isInteger(Number(value))) {
        return 'Stock must be a whole number';
      }
      return null;
    },
  },
  low_stock_threshold: {
    min: 0,
    custom: (value) => {
      if (value && !Number.isInteger(Number(value))) {
        return 'Threshold must be a whole number';
      }
      return null;
    },
  },
  moq: {
    min: 1,
    custom: (value) => {
      if (value && !Number.isInteger(Number(value))) {
        return 'MOQ must be a whole number';
      }
      return null;
    },
  },
};

export const saleValidationSchema: ValidationSchema = {
  customer_id: {
    required: true,
  },
  sale_date: {
    required: true,
  },
  payment_status: {
    required: true,
  },
  quantity: {
    required: true,
    min: 1,
    custom: (value) => {
      if (!Number.isInteger(Number(value))) {
        return 'Quantity must be a whole number';
      }
      return null;
    },
  },
  unit_price: {
    required: true,
    min: 0,
    custom: (value) => {
      if (!validationPatterns.currency.test(value.toString())) {
        return 'Invalid price format';
      }
      return null;
    },
  },
  discount_percentage: {
    min: 0,
    max: 100,
  },
  discount_amount: {
    min: 0,
  },
};

export const paymentValidationSchema: ValidationSchema = {
  amount: {
    required: true,
    min: 0.01,
    custom: (value) => {
      if (!validationPatterns.currency.test(value.toString())) {
        return 'Invalid amount format';
      }
      return null;
    },
  },
  payment_date: {
    required: true,
  },
  payment_method: {
    required: true,
  },
  reference_number: {
    maxLength: 100,
  },
};

export const expenseValidationSchema: ValidationSchema = {
  description: {
    required: true,
    minLength: 3,
    maxLength: 255,
  },
  amount: {
    required: true,
    min: 0.01,
    custom: (value) => {
      if (!validationPatterns.currency.test(value.toString())) {
        return 'Invalid amount format';
      }
      return null;
    },
  },
  category: {
    required: true,
  },
  expense_date: {
    required: true,
  },
};

// Hook for form validation
export const useFormValidation = (schema: ValidationSchema) => {
  const [errors, setErrors] = React.useState<ValidationErrors>({});
  
  const validateFormData = (data: Record<string, any>) => {
    const newErrors = validateForm(data, schema);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const validateSingleField = (field: string, value: any) => {
    if (schema[field]) {
      const error = validateField(value, schema[field]);
      setErrors(prev => ({
        ...prev,
        [field]: error || ''
      }));
      return !error;
    }
    return true;
  };
  
  const clearErrors = () => {
    setErrors({});
  };
  
  const clearFieldError = (field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };
  
  return {
    errors,
    validateFormData,
    validateSingleField,
    clearErrors,
    clearFieldError,
    hasErrors: Object.keys(errors).length > 0,
  };
};
