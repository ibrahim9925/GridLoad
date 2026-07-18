// @ts-nocheck
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { databaseSeeder, SeederResult, SeederOptions } from "@/services/DatabaseSeeder";
import { useAuth } from "@/contexts/AuthContext";

export interface TestDataAvailability {
  customers: number;
  products: number;
  staff: number;
  suppliers: number;
  leads: number;
  warrantyProducts: number;
  installationProducts: number;
  salesReps: number;
}

export interface TestDataStatus {
  isLoading: boolean;
  lastSeeded: Date | null;
  availability: TestDataAvailability | null;
  isDataSufficient: boolean;
}

/**
 * Hook for managing test data infrastructure
 * Provides test data seeding, cleanup, and availability checking
 */
export const useTestDataInfrastructure = () => {
  const [status, setStatus] = useState<TestDataStatus>({
    isLoading: false,
    lastSeeded: null,
    availability: null,
    isDataSufficient: false
  });
  
  const { toast } = useToast();
  const { isAuthenticated, user, userRole } = useAuth();

  const verifyAuthForTesting = (): { success: boolean } => {
    if (!isAuthenticated || !user || userRole !== 'admin') {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please ensure you're logged in as an admin to perform this operation.",
      });
      return { success: false };
    }
    return { success: true };
  };

  /**
   * Check current test data availability
   */
  const checkDataAvailability = useCallback(async (): Promise<boolean> => {
    try {
      setStatus(prev => ({ ...prev, isLoading: true }));
      
      const result = await databaseSeeder.checkTestDataAvailability();
      
      setStatus(prev => ({
        ...prev,
        availability: result.availability,
        isDataSufficient: result.success,
        isLoading: false
      }));

      return result.success;
    } catch (error) {
      console.error("❌ TestDataInfrastructure: Failed to check data availability:", error);
      setStatus(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, []);

  /**
   * Seed basic test data
   */
  const seedBasicData = useCallback(async (options: SeederOptions = {}): Promise<SeederResult> => {
    // Verify authentication first
    const authResult = verifyAuthForTesting();
    if (!authResult.success) {
      return {
        success: false,
        message: "Authentication required for test data seeding",
        error: "User not authenticated or insufficient permissions"
      };
    }

    try {
      setStatus(prev => ({ ...prev, isLoading: true }));
      
      toast({
        title: "Seeding Test Data",
        description: "Creating basic test data for system testing...",
      });

      const result = await databaseSeeder.seedBasicTestData(options);
      
      if (result.success) {
        setStatus(prev => ({
          ...prev,
          lastSeeded: new Date(),
          isLoading: false
        }));

        toast({
          title: "Test Data Seeded Successfully",
          description: result.message,
        });

        // Refresh availability check
        await checkDataAvailability();
      } else {
        setStatus(prev => ({ ...prev, isLoading: false }));
        
        toast({
          variant: "destructive",
          title: "Test Data Seeding Failed",
          description: result.error || result.message,
        });
      }

      return result;
    } catch (error: any) {
      setStatus(prev => ({ ...prev, isLoading: false }));
      
      const errorResult = {
        success: false,
        message: "Test data seeding failed",
        error: error.message
      };

      toast({
        variant: "destructive",
        title: "Test Data Seeding Error",
        description: error.message,
      });

      return errorResult;
    }
  }, [verifyAuthForTesting, toast, checkDataAvailability]);

  /**
   * Seed comprehensive test data
   */
  const seedComprehensiveData = useCallback(async (): Promise<SeederResult> => {
    // Verify authentication first
    const authResult = verifyAuthForTesting();
    if (!authResult.success) {
      return {
        success: false,
        message: "Authentication required for comprehensive test data seeding",
        error: "User not authenticated or insufficient permissions"
      };
    }

    try {
      setStatus(prev => ({ ...prev, isLoading: true }));
      
      toast({
        title: "Seeding Comprehensive Test Data",
        description: "Creating comprehensive test data with complex scenarios...",
      });

      const result = await databaseSeeder.seedComprehensiveTestData();
      
      if (result.success) {
        setStatus(prev => ({
          ...prev,
          lastSeeded: new Date(),
          isLoading: false
        }));

        toast({
          title: "Comprehensive Test Data Seeded",
          description: result.message,
        });

        // Refresh availability check
        await checkDataAvailability();
      } else {
        setStatus(prev => ({ ...prev, isLoading: false }));
        
        toast({
          variant: "destructive",
          title: "Comprehensive Seeding Failed",
          description: result.error || result.message,
        });
      }

      return result;
    } catch (error: any) {
      setStatus(prev => ({ ...prev, isLoading: false }));
      
      const errorResult = {
        success: false,
        message: "Comprehensive test data seeding failed",
        error: error.message
      };

      toast({
        variant: "destructive",
        title: "Comprehensive Seeding Error",
        description: error.message,
      });

      return errorResult;
    }
  }, [verifyAuthForTesting, toast, checkDataAvailability]);

  /**
   * Clean up all test data
   */
  const cleanupTestData = useCallback(async (): Promise<{ success: boolean; message: string; error?: string }> => {
    // Verify authentication first
    const authResult = verifyAuthForTesting();
    if (!authResult.success) {
      return {
        success: false,
        message: "Authentication required for test data cleanup",
        error: "User not authenticated or insufficient permissions"
      };
    }

    try {
      setStatus(prev => ({ ...prev, isLoading: true }));
      
      toast({
        title: "Cleaning Up Test Data",
        description: "Removing all test data from the database...",
      });

      const result = await databaseSeeder.cleanupTestData();
      
      if (result.success) {
        setStatus(prev => ({
          ...prev,
          lastSeeded: null,
          availability: null,
          isDataSufficient: false,
          isLoading: false
        }));

        toast({
          title: "Test Data Cleaned Up",
          description: result.message,
        });

        // Refresh availability check
        await checkDataAvailability();
      } else {
        setStatus(prev => ({ ...prev, isLoading: false }));
        
        toast({
          variant: "destructive",
          title: "Cleanup Failed",
          description: result.error || result.message,
        });
      }

      return result;
    } catch (error: any) {
      setStatus(prev => ({ ...prev, isLoading: false }));
      
      const errorResult = {
        success: false,
        message: "Test data cleanup failed",
        error: error.message
      };

      toast({
        variant: "destructive",
        title: "Cleanup Error",
        description: error.message,
      });

      return errorResult;
    }
  }, [verifyAuthForTesting, toast, checkDataAvailability]);

  /**
   * Ensure test data is available before running tests
   */
  const ensureTestData = useCallback(async (options: SeederOptions = {}): Promise<boolean> => {
    console.log("🔍 TestDataInfrastructure: Ensuring test data availability...");
    
    const isAvailable = await checkDataAvailability();
    
    if (!isAvailable) {
      console.log("📊 TestDataInfrastructure: Insufficient test data, seeding basic data...");
      const seedResult = await seedBasicData({
        customerCount: 3,
        productCount: 5,
        supplierCount: 2,
        leadCount: 4,
        cleanup: false, // Don't cleanup by default to preserve existing data
        ...options
      });
      
      return seedResult.success;
    }
    
    console.log("✅ TestDataInfrastructure: Sufficient test data available");
    return true;
  }, [checkDataAvailability, seedBasicData]);

  /**
   * Get data availability summary for UI display
   */
  const getAvailabilitySummary = useCallback((): string => {
    if (!status.availability) return "Checking data availability...";
    
    const { availability } = status;
    return `Customers: ${availability.customers}, Products: ${availability.products}, Staff: ${availability.staff}, Suppliers: ${availability.suppliers}, Leads: ${availability.leads}`;
  }, [status.availability]);

  return {
    // Status
    status,
    isAuthReady: isAuthenticated && userRole === 'admin',
    
    // Actions
    checkDataAvailability,
    seedBasicData,
    seedComprehensiveData,
    cleanupTestData,
    ensureTestData,
    
    // Utilities
    getAvailabilitySummary
  };
};