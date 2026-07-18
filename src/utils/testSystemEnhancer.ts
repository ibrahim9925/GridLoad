// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { TestDatabaseUtils } from './testDatabaseUtils';
import { TestDataEnhancer } from './testDataEnhancer';

/**
 * PHASE 5: System-wide test enhancement utilities
 * Provides comprehensive test system improvements and monitoring
 */
export class TestSystemEnhancer {
  
  /**
   * Run comprehensive system health check before tests
   */
  static async runSystemHealthCheck(): Promise<{
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
    systemInfo: any;
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    const systemInfo: any = {};

    try {
      // Check database connectivity
      const { data: connectivityTest, error: connectivityError } = await supabase
        .from('customers')
        .select('id')
        .limit(1);

      if (connectivityError) {
        issues.push('Database connectivity failed');
        recommendations.push('Check database connection and authentication');
      } else {
        systemInfo.databaseConnected = true;
      }

      // Check prerequisite data availability
      const prerequisites = await TestDatabaseUtils.validatePrerequisites();
      systemInfo.prerequisites = prerequisites;

      if (!prerequisites.hasActiveStaff) {
        issues.push('No active staff members found');
        recommendations.push('Create staff members with proper roles and permissions');
      }

      if (!prerequisites.hasCustomers) {
        issues.push('No customers found');
        recommendations.push('Create test customers for sales workflow testing');
      }

      if (!prerequisites.hasProducts) {
        issues.push('No active products found');
        recommendations.push('Create test products with proper pricing and stock levels');
      }

      // Check role-based functions availability
      const roleChecks = await Promise.allSettled([
        supabase.rpc('is_admin'),
        supabase.rpc('is_sales_rep'), 
        supabase.rpc('is_warehouse'),
        supabase.rpc('is_accountant'),
        supabase.rpc('can_access_financial_data')
      ]);

      const failedRoleChecks = roleChecks.filter(check => check.status === 'rejected').length;
      if (failedRoleChecks > 0) {
        issues.push(`${failedRoleChecks} role check functions failed`);
        recommendations.push('Verify database functions and RLS policies are properly configured');
      }

      systemInfo.roleChecksWorking = failedRoleChecks === 0;

      // Performance baseline check
      const performanceStart = Date.now();
      await supabase.from('products').select('id, name').limit(10);
      const performanceEnd = Date.now();
      const queryTime = performanceEnd - performanceStart;

      systemInfo.queryPerformance = queryTime;
      if (queryTime > 2000) {
        issues.push('Database queries are slow (>2s)');
        recommendations.push('Check database performance and optimize queries');
      }

      const isHealthy = issues.length === 0;

      return {
        isHealthy,
        issues,
        recommendations,
        systemInfo
      };

    } catch (error) {
      issues.push(`System health check failed: ${error}`);
      recommendations.push('Review system configuration and error logs');
      
      return {
        isHealthy: false,
        issues,
        recommendations,
        systemInfo: { error: error?.toString() }
      };
    }
  }

  /**
   * Auto-fix common test issues
   */
  static async autoFixCommonIssues(): Promise<{
    fixed: string[];
    stillBroken: string[];
    summary: string;
  }> {
    const fixed: string[] = [];
    const stillBroken: string[] = [];

    try {
      // Auto-fix: Missing test prerequisites
      const prerequisites = await TestDatabaseUtils.validatePrerequisites();
      
      if (!prerequisites.allValid) {
        try {
          await TestDatabaseUtils.createTestPrerequisites();
          fixed.push('Created missing test prerequisites (staff, customers, products)');
        } catch (error) {
          stillBroken.push(`Failed to create prerequisites: ${error}`);
        }
      }

      // Auto-fix: Clean up orphaned test data
      try {
        await TestDatabaseUtils.cleanupTestData();
        fixed.push('Cleaned up orphaned test data');
      } catch (error) {
        stillBroken.push(`Failed to cleanup test data: ${error}`);
      }

      // Auto-fix: Validate and create test scenarios
      try {
        const scenario = await TestDataEnhancer.createTestScenario();
        if (scenario.customer && scenario.product && scenario.staff) {
          fixed.push('Created complete test scenario with relationships');
          await scenario.cleanup(); // Clean up immediately after validation
        }
      } catch (error) {
        stillBroken.push(`Failed to create test scenario: ${error}`);
      }

      const summary = `Auto-fix completed: ${fixed.length} issues fixed, ${stillBroken.length} issues remain`;

      return {
        fixed,
        stillBroken,
        summary
      };

    } catch (error) {
      stillBroken.push(`Auto-fix process failed: ${error}`);
      return {
        fixed,
        stillBroken,
        summary: 'Auto-fix process encountered critical errors'
      };
    }
  }

  /**
   * Generate test improvement recommendations
   */
  static async generateTestRecommendations(): Promise<{
    priority: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    actionItems: string[];
  }[]> {
    const recommendations = [];

    try {
      const healthCheck = await this.runSystemHealthCheck();

      if (!healthCheck.isHealthy) {
        recommendations.push({
          priority: 'critical' as const,
          title: 'System Health Issues Detected',
          description: 'Critical system issues are preventing tests from running properly',
          actionItems: healthCheck.recommendations
        });
      }

      // Check test coverage gaps
      const prerequisites = await TestDatabaseUtils.validatePrerequisites();
      
      if (!prerequisites.hasActiveStaff) {
        recommendations.push({
          priority: 'high' as const,
          title: 'Staff Management Setup Required',
          description: 'Staff members with proper roles and commission rates are needed for comprehensive testing',
          actionItems: [
            'Create admin staff with full permissions',
            'Create sales reps with commission rates (5-15%)',
            'Create warehouse and accountant staff',
            'Verify all staff have is_active = true'
          ]
        });
      }

      if (healthCheck.systemInfo.queryPerformance > 1000) {
        recommendations.push({
          priority: 'medium' as const,
          title: 'Performance Optimization Needed',
          description: 'Database queries are slower than optimal for testing',
          actionItems: [
            'Review database indexes',
            'Optimize frequently used queries',
            'Consider connection pooling',
            'Monitor query execution plans'
          ]
        });
      }

      recommendations.push({
        priority: 'low' as const,
        title: 'Test Monitoring Enhancement',
        description: 'Improve test result tracking and failure analysis',
        actionItems: [
          'Enable real-time test result storage',
          'Set up automated failure alerting',
          'Create test performance dashboards',
          'Implement test trend analysis'
        ]
    });

      return recommendations;

    } catch (error) {
      return [{
        priority: 'critical' as const,
        title: 'Recommendation System Failed',
        description: 'Unable to analyze system for improvement recommendations',
        actionItems: [`Fix recommendation system error: ${error}`]
      }];
    }
  }

  /**
   * Calculate test pass rate improvement metrics
   */
  static calculateImprovementMetrics(beforeCount: number, afterCount: number, totalTests: number): {
    improvementPercentage: number;
    passRate: number;
    status: 'excellent' | 'good' | 'needs_work' | 'critical';
    message: string;
  } {
    const passRate = (afterCount / totalTests) * 100;
    const improvementPercentage = afterCount > beforeCount 
      ? ((afterCount - beforeCount) / totalTests) * 100
      : 0;

    let status: 'excellent' | 'good' | 'needs_work' | 'critical';
    let message: string;

    if (passRate >= 95) {
      status = 'excellent';
      message = 'Test suite is performing exceptionally well';
    } else if (passRate >= 85) {
      status = 'good';
      message = 'Test suite is performing well with minor issues';
    } else if (passRate >= 70) {
      status = 'needs_work';
      message = 'Test suite needs attention to improve reliability';
    } else {
      status = 'critical';
      message = 'Test suite has critical issues requiring immediate attention';
    }

    return {
      improvementPercentage,
      passRate,
      status,
      message
    };
  }
}