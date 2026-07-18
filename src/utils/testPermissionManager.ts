// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';

/**
 * PHASE 3: Permission-aware testing - handles RLS and permission checks for tests
 */
export class TestPermissionManager {
  
  /**
   * Check if current user has specific permissions
   */
  static async checkPermissions(): Promise<{
    isAdmin: boolean;
    isWarehouse: boolean;
    isAccountant: boolean;
    isSalesRep: boolean;
    isInstaller: boolean;
    canAccessFinancialData: boolean;
    canManageContainers: boolean;
    canManageStaff: boolean;
  }> {
    try {
      const [
        { data: isAdmin, error: adminError },
        { data: isWarehouse, error: warehouseError },
        { data: isAccountant, error: accountantError },
        { data: isSalesRep, error: salesRepError },
        { data: isInstaller, error: installerError },
        { data: canAccessFinancialData, error: financialError }
      ] = await Promise.all([
        supabase.rpc('is_admin'),
        supabase.rpc('is_warehouse'),
        supabase.rpc('is_accountant'),
        supabase.rpc('is_sales_rep'),
        supabase.rpc('is_installer'),
        supabase.rpc('can_access_financial_data')
      ]);

      // Handle any RPC errors gracefully
      if (adminError || warehouseError || accountantError || salesRepError || installerError || financialError) {
        console.warn('Permission check errors:', {
          adminError, warehouseError, accountantError, salesRepError, installerError, financialError
        });
      }

      const permissions = {
        isAdmin: isAdmin || false,
        isWarehouse: isWarehouse || false,
        isAccountant: isAccountant || false,
        isSalesRep: isSalesRep || false,
        isInstaller: isInstaller || false,
        canAccessFinancialData: canAccessFinancialData || false,
        canManageContainers: (isAdmin || isWarehouse) || false,
        canManageStaff: isAdmin || false
      };

      return permissions;
    } catch (error) {
      console.error('Failed to check permissions:', error);
      
      // Return safe defaults
      return {
        isAdmin: false,
        isWarehouse: false,
        isAccountant: false,
        isSalesRep: false,
        isInstaller: false,
        canAccessFinancialData: false,
        canManageContainers: false,
        canManageStaff: false
      };
    }
  }

  /**
   * Check if a specific test should be skipped due to permissions
   */
  static async shouldSkipTest(testName: string, category: string): Promise<{
    shouldSkip: boolean;
    reason?: string;
  }> {
    const permissions = await this.checkPermissions();

    // Define permission requirements for different test categories
    const permissionRequirements: Record<string, (p: typeof permissions) => boolean> = {
      'Container Management': (p) => p.canManageContainers,
      'Financial Management': (p) => p.canAccessFinancialData,
      'Staff Management': (p) => p.canManageStaff,
      'Payment Processing': (p) => p.canAccessFinancialData,
      'Commission Management': (p) => p.canAccessFinancialData,
      'Bank Operations': (p) => p.canAccessFinancialData
    };

    // Specific test requirements
    const specificTestRequirements: Record<string, (p: typeof permissions) => boolean> = {
      'Enhanced Container Workflow Integration': (p) => p.canManageContainers,
      'Financial Operations Integration': (p) => p.canAccessFinancialData,
      'Complete Sales Transaction Validation': (p) => p.isSalesRep || p.isAdmin,
      'Commission Calculation Test': (p) => p.canAccessFinancialData,
      'Payment Recording Test': (p) => p.canAccessFinancialData
    };

    // Check specific test requirements first
    if (specificTestRequirements[testName]) {
      const hasPermission = specificTestRequirements[testName](permissions);
      if (!hasPermission) {
        return {
          shouldSkip: true,
          reason: `Insufficient permissions for test: ${testName}`
        };
      }
    }

    // Check category-level requirements
    if (permissionRequirements[category]) {
      const hasPermission = permissionRequirements[category](permissions);
      if (!hasPermission) {
        return {
          shouldSkip: true,
          reason: `Insufficient permissions for category: ${category}`
        };
      }
    }

    return { shouldSkip: false };
  }

  /**
   * Get permission-aware test configuration
   */
  static async getTestConfiguration(): Promise<{
    skipCategories: string[];
    skipTests: string[];
    permissionSummary: string;
  }> {
    const permissions = await this.checkPermissions();
    
    const skipCategories: string[] = [];
    const skipTests: string[] = [];

    if (!permissions.canManageContainers) {
      skipCategories.push('Container Management');
    }

    if (!permissions.canAccessFinancialData) {
      skipCategories.push('Financial Management', 'Payment Processing', 'Commission Management');
    }

    if (!permissions.canManageStaff) {
      skipCategories.push('Staff Management');
    }

    const activeRoles = [];
    if (permissions.isAdmin) activeRoles.push('Admin');
    if (permissions.isSalesRep) activeRoles.push('Sales Rep');
    if (permissions.isWarehouse) activeRoles.push('Warehouse');
    if (permissions.isAccountant) activeRoles.push('Accountant');
    if (permissions.isInstaller) activeRoles.push('Installer');

    const permissionSummary = activeRoles.length > 0 
      ? `Active roles: ${activeRoles.join(', ')}` 
      : 'No active roles detected';

    return {
      skipCategories,
      skipTests,
      permissionSummary
    };
  }
}