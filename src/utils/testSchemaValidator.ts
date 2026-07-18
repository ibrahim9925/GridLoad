// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';

/**
 * Schema validator to ensure test data matches database constraints
 */
export class TestSchemaValidator {
  // CRITICAL: Valid enum values exactly matching database schema - PHASE 2 FIX
  static VALID_ENUMS = {
    containerType: ['20ft', '40ft'],
    containerStatus: ['ordered', 'confirmed', 'shipped', 'in_transit', 'port_arrival', 'customs_processing', 'customs_cleared', 'local_transit', 'out_for_delivery', 'delivered', 'completed'], // PHASE 2 FIX: Complete enum values
    fulfillmentStatus: ['pending', 'packed', 'shipped', 'delivered', 'cancelled'], // FIXED: Removed invalid values
    paymentMethod: ['cash', 'check', 'bank_transfer', 'credit_card', 'other'],
    transactionType: ['IN', 'OUT', 'TRANSFER'],
    claimType: ['repair', 'replacement', 'refund'],
    userRole: ['admin', 'sales_rep', 'warehouse', 'installer', 'accountant'],
    leadStatus: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'], // FIXED: Match database
    paymentStatus: ['pending', 'partial_paid', 'paid', 'overdue', 'cancelled'], // FIXED: Match database
    leadType: ['general', 'supplier', 'solar_calculator'], // ADDED: Missing enum
    installationStatus: ['scheduled', 'in_progress', 'completed', 'cancelled'] // ADDED: Missing enum
  };

  /**
   * Validates that a value is in the allowed enum set
   */
  static validateEnum<T extends keyof typeof TestSchemaValidator.VALID_ENUMS>(
    enumType: T, 
    value: string
  ): boolean {
    return (TestSchemaValidator.VALID_ENUMS[enumType] as readonly string[]).includes(value);
  }

  /**
   * Gets a random valid enum value
   */
  static getRandomEnum<T extends keyof typeof TestSchemaValidator.VALID_ENUMS>(
    enumType: T
  ): typeof TestSchemaValidator.VALID_ENUMS[T][number] {
    const values = TestSchemaValidator.VALID_ENUMS[enumType];
    return values[Math.floor(Math.random() * values.length)];
  }

  /**
   * Validates container data before insertion
   */
  static validateContainerData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.container_type && !this.validateEnum('containerType', data.container_type)) {
      errors.push(`Invalid container_type: ${data.container_type}. Must be one of: ${this.VALID_ENUMS.containerType.join(', ')}`);
    }

    if (data.status && !this.validateEnum('containerStatus', data.status)) {
      errors.push(`Invalid status: ${data.status}. Must be one of: ${this.VALID_ENUMS.containerStatus.join(', ')}`);
    }

    if (!data.container_number) {
      errors.push('container_number is required');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validates payment data before insertion
   */
  static validatePaymentData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.payment_method && !this.validateEnum('paymentMethod', data.payment_method)) {
      errors.push(`Invalid payment_method: ${data.payment_method}. Must be one of: ${this.VALID_ENUMS.paymentMethod.join(', ')}`);
    }

    if (!data.sale_id) {
      errors.push('sale_id is required');
    }

    if (!data.amount || data.amount <= 0) {
      errors.push('amount must be greater than 0');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validates bank ledger data before insertion
   */
  static validateBankLedgerData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.transaction_type && !this.validateEnum('transactionType', data.transaction_type)) {
      errors.push(`Invalid transaction_type: ${data.transaction_type}. Must be one of: ${this.VALID_ENUMS.transactionType.join(', ')}`);
    }

    if (!data.bank_account_id) {
      errors.push('bank_account_id is required');
    }

    if (!data.amount || data.amount === 0) {
      errors.push('amount cannot be zero');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validates warranty claim data before insertion
   */
  static validateWarrantyClaimData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.claim_type && !this.validateEnum('claimType', data.claim_type)) {
      errors.push(`Invalid claim_type: ${data.claim_type}. Must be one of: ${this.VALID_ENUMS.claimType.join(', ')}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validates that all required foreign key references exist
   */
  static async validateForeignKeys(data: any, tableName: string): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Validate common foreign key relationships
      if (data.customer_id) {
        const { data: customer, error } = await supabase
          .from('customers')
          .select('id')
          .eq('id', data.customer_id)
          .single();

        if (error || !customer) {
          errors.push(`Customer with id ${data.customer_id} does not exist`);
        }
      }

      if (data.product_id) {
        const { data: product, error } = await supabase
          .from('products')
          .select('id')
          .eq('id', data.product_id)
          .single();

        if (error || !product) {
          errors.push(`Product with id ${data.product_id} does not exist`);
        }
      }

      if (data.supplier_id) {
        const { data: supplier, error } = await supabase
          .from('suppliers')
          .select('id')
          .eq('id', data.supplier_id)
          .single();

        if (error || !supplier) {
          errors.push(`Supplier with id ${data.supplier_id} does not exist`);
        }
      }

      if (data.sales_rep_id || data.assigned_to || data.created_by) {
        const staffId = data.sales_rep_id || data.assigned_to || data.created_by;
        const { data: staff, error } = await supabase
          .from('staff')
          .select('id')
          .eq('id', staffId)
          .single();

        if (error || !staff) {
          errors.push(`Staff member with id ${staffId} does not exist`);
        }
      }

    } catch (error) {
      errors.push(`Foreign key validation failed: ${error}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Comprehensive validation for any table data
   */
  static async validateTableData(tableName: string, data: any): Promise<{ isValid: boolean; errors: string[] }> {
    let validationResult = { isValid: true, errors: [] as string[] };

    // Table-specific validations
    switch (tableName) {
      case 'containers':
        validationResult = this.validateContainerData(data);
        break;
      case 'payments':
        validationResult = this.validatePaymentData(data);
        break;
      case 'bank_ledger':
        validationResult = this.validateBankLedgerData(data);
        break;
      case 'warranty_claims':
        validationResult = this.validateWarrantyClaimData(data);
        break;
    }

    // Foreign key validation
    if (validationResult.isValid) {
      const fkValidation = await this.validateForeignKeys(data, tableName);
      validationResult.isValid = fkValidation.isValid;
      validationResult.errors = [...validationResult.errors, ...fkValidation.errors];
    }

    return validationResult;
  }
}