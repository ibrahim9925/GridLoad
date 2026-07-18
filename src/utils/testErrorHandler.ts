// @ts-nocheck
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

/**
 * Enhanced error handler for test operations with specific constraint violation handling
 */
export class TestErrorHandler {
  
  /**
   * Enhanced error analysis with comprehensive database constraint detection
   */
  static analyzeError(error: any): { 
    type: string; 
    message: string; 
    suggestion: string; 
    severity: 'low' | 'medium' | 'high' | 'critical';
    fixActions?: string[];
  } {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    
    // Check constraint violations with specific enum guidance
    if (errorMessage.includes('violates check constraint')) {
      if (errorMessage.includes('container_type_check')) {
        return {
          type: 'CHECK_CONSTRAINT_VIOLATION',
          message: 'Invalid container type',
          suggestion: 'Use only valid container types: 20ft, 40ft',
          severity: 'high',
          fixActions: ['Update container_type to "20ft" or "40ft"', 'Use TestDatabaseUtils.getRandomEnum("containerType")']
        };
      }
      
      if (errorMessage.includes('transaction_type_check')) {
        return {
          type: 'CHECK_CONSTRAINT_VIOLATION', 
          message: 'Invalid bank transaction type',
          suggestion: 'Use only valid transaction types: IN, OUT, TRANSFER',
          severity: 'high',
          fixActions: ['Update transaction_type to "IN", "OUT", or "TRANSFER"', 'Use TestDatabaseUtils.getRandomEnum("transactionType")']
        };
      }
      
      if (errorMessage.includes('payment_method_check')) {
        return {
          type: 'CHECK_CONSTRAINT_VIOLATION',
          message: 'Invalid payment method',
          suggestion: 'Use only valid payment methods: cash, check, bank_transfer, credit_card, other',
          severity: 'high',
          fixActions: ['Update payment_method enum value', 'Use TestDatabaseUtils.getRandomEnum("paymentMethod")']
        };
      }
      
      if (errorMessage.includes('claim_type_check')) {
        return {
          type: 'CHECK_CONSTRAINT_VIOLATION',
          message: 'Invalid warranty claim type',
          suggestion: 'Use only valid claim types: repair, replacement, refund',
          severity: 'high',
          fixActions: ['Update claim_type enum value', 'Use TestDatabaseUtils.getRandomEnum("claimType")']
        };
      }

      if (errorMessage.includes('user_role_check')) {
        return {
          type: 'CHECK_CONSTRAINT_VIOLATION',
          message: 'Invalid user role',
          suggestion: 'Use only valid roles: admin, sales_rep, accountant, warehouse, installer',
          severity: 'high',
          fixActions: ['Update role enum value', 'Use TestDatabaseUtils.getRandomEnum("userRole")']
        };
      }
    }
    
    // Enhanced unique constraint handling
    if (errorMessage.includes('duplicate key value violates unique constraint')) {
      if (errorMessage.includes('products_sku_key') || errorMessage.includes('sku')) {
        return {
          type: 'UNIQUE_CONSTRAINT_VIOLATION',
          message: 'Duplicate product SKU detected',
          suggestion: 'Generate collision-resistant unique SKU',
          severity: 'medium',
          fixActions: [
            'Use TestDatabaseUtils.generateUniqueSKU() for unique SKUs',
            'Add timestamp and entropy to SKU generation',
            'Check for existing SKU before insertion'
          ]
        };
      }
      
      if (errorMessage.includes('staff_email_key') || errorMessage.includes('email')) {
        return {
          type: 'UNIQUE_CONSTRAINT_VIOLATION',
          message: 'Duplicate email address',
          suggestion: 'Generate unique email with timestamp',
          severity: 'medium',
          fixActions: [
            'Add timestamp to email: user-${Date.now()}@test.com',
            'Use TestDatabaseUtils.generateUniqueId() for email prefixes'
          ]
        };
      }
      
      return {
        type: 'UNIQUE_CONSTRAINT_VIOLATION',
        message: 'Duplicate record detected',
        suggestion: 'Use enhanced unique ID generation with collision prevention',
        severity: 'medium',
        fixActions: [
          'Use TestDatabaseUtils.generateUniqueId() for unique identifiers',
          'Add entropy and counters to prevent collisions'
        ]
      };
    }
    
    // Enhanced foreign key violation handling
    if (errorMessage.includes('violates foreign key constraint')) {
      const fkConstraints = {
        'customer_id': 'Create valid customer record first using TestDatabaseUtils.createTestPrerequisites()',
        'product_id': 'Create valid product record first using TestDatabaseUtils.createTestPrerequisites()',
        'staff_id': 'Create valid staff record first with proper role and commission rate',
        'supplier_id': 'Create valid supplier record first',
        'sale_id': 'Create valid sale record first before adding items/payments'
      };
      
      const constraint = Object.keys(fkConstraints).find(key => errorMessage.includes(key));
      const suggestion = constraint ? fkConstraints[constraint] : 'Ensure referenced records exist before insertion';
      
      return {
        type: 'FOREIGN_KEY_VIOLATION',
        message: `Referenced record does not exist${constraint ? ` (${constraint})` : ''}`,
        suggestion,
        severity: 'high',
        fixActions: [
          'Use TestDatabaseUtils.createTestPrerequisites() to create all required records',
          'Verify foreign key relationships before insertion',
          'Use validatePrerequisites() before running tests'
        ]
      };
    }
    
    // Enhanced NOT NULL handling
    if (errorMessage.includes('violates not-null constraint')) {
      const column = errorMessage.match(/column "([^"]+)"/)?.[1];
      return {
        type: 'NOT_NULL_VIOLATION',
        message: `Required field is missing${column ? ` (${column})` : ''}`,
        suggestion: 'Ensure all required fields are provided in the insert operation',
        severity: 'high',
        fixActions: [
          `Provide value for required field${column ? `: ${column}` : ''}`,
          'Check database schema for NOT NULL constraints',
          'Use TestDataFactory to generate complete test records'
        ]
      };
    }
    
    // Enhanced enum handling
    if (errorMessage.includes('invalid input value for enum')) {
      const enumMatch = errorMessage.match(/enum (\w+)/)?.[1];
      return {
        type: 'ENUM_VIOLATION',
        message: `Invalid enum value${enumMatch ? ` for ${enumMatch}` : ''}`,
        suggestion: 'Use only valid enum values as defined in the database schema',
        severity: 'high',
        fixActions: [
          'Check TestDatabaseUtils.VALID_ENUMS for allowed values',
          'Use TestDatabaseUtils.getRandomEnum() for valid enum selection',
          'Verify enum spelling and case sensitivity'
        ]
      };
    }

    // Connection and timeout errors
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return {
        type: 'CONNECTION_ERROR',
        message: 'Database connection issue',
        suggestion: 'Check database connectivity and retry',
        severity: 'critical',
        fixActions: [
          'Verify database connection',
          'Implement retry logic for transient failures',
          'Check network connectivity'
        ]
      };
    }

    // Permission errors
    if (errorMessage.includes('permission denied') || errorMessage.includes('policy')) {
      return {
        type: 'PERMISSION_ERROR',
        message: 'Row Level Security policy violation',
        suggestion: 'Ensure user has proper permissions for this operation',
        severity: 'high',
        fixActions: [
          'Check RLS policies for the table',
          'Ensure user is authenticated with correct role',
          'Verify user_id fields are properly set'
        ]
      };
    }
    
    // Generic error with better analysis
    return {
      type: 'UNKNOWN_ERROR',
      message: errorMessage.substring(0, 150),
      suggestion: 'Review database schema, test data, and error logs for compliance',
      severity: 'medium',
      fixActions: [
        'Check console logs for detailed error information',
        'Verify database schema matches test expectations',
        'Use TestErrorHandler.validateTestPrerequisites() before tests'
      ]
    };
  }
  
  /**
   * Handles test errors with appropriate user feedback
   */
  static handleTestError(error: any, testName: string): void {
    const analysis = this.analyzeError(error);
    
    const errorTitle = `Test Failed: ${testName}`;
    const errorDescription = `${analysis.message}. ${analysis.suggestion}`;
    
    // Show toast based on severity
    switch (analysis.severity) {
      case 'critical':
        toast.error(errorTitle, { 
          description: errorDescription,
          duration: 10000 
        });
        break;
      case 'high':
        toast.error(errorTitle, { 
          description: errorDescription,
          duration: 8000 
        });
        break;
      case 'medium':
        toast.warning(errorTitle, { 
          description: errorDescription,
          duration: 6000 
        });
        break;
      default:
        toast.info(errorTitle, { 
          description: errorDescription,
          duration: 4000 
        });
    }
    
    // Log detailed error information
    console.error(`Test Error Analysis:`, {
      test: testName,
      type: analysis.type,
      severity: analysis.severity,
      originalError: error,
      suggestion: analysis.suggestion
    });
  }
  
  /**
   * Creates a standardized test result for errors
   */
  static createErrorResult(error: any, testName: string): any {
    const analysis = this.analyzeError(error);
    
    return {
      name: testName,
      success: false,
      error: `${analysis.type}: ${analysis.message}`,
      suggestion: analysis.suggestion,
      severity: analysis.severity,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Validates prerequisites before running tests
   */
  static async validateTestPrerequisites(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // Check if we can connect to database
      const { error: connectionError } = await supabase
        .from('staff')
        .select('count')
        .limit(1);
      
      if (connectionError) {
        errors.push('Database connection failed');
      }
      
      // Add more prerequisite checks as needed
      
    } catch (error) {
      errors.push(`Prerequisite validation failed: ${error}`);
    }
    
    return { 
      valid: errors.length === 0, 
      errors 
    };
  }
}