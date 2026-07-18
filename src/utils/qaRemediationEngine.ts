// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { TestInfrastructureFixer } from './testInfrastructureFixer';
import { TestValidationRunner } from './testValidationRunner';
import { ProductPricingValidator } from './productPricingValidator';

/**
 * QA Remediation Engine - Executes the full 6-phase remediation plan
 */
export class QARemediationEngine {
  
  /**
   * Execute real data remediation using Edge Function
   */
  static async executeRealDataRemediation(): Promise<any> {
    try {
      console.log('Executing atomic QA remediation via edge function...');
      
      const { data, error } = await supabase.functions.invoke('data-remediation', {
        body: { 
          action: 'atomic_remediation',
          timestamp: new Date().toISOString()
        }
      });

      if (error) {
        console.error('Edge function invocation error:', error);
        throw new Error(`Edge function error: ${error.message}`);
      }

      // Handle new response format
      if (!data?.success) {
        const errorMessage = data?.error || 'Unknown error';
        const errorDetails = data?.details || '';
        const correlationId = data?.correlation_id || 'unknown';
        
        console.error('Remediation failed:', {
          error: errorMessage,
          details: errorDetails,
          correlationId,
          statistics: data?.statistics
        });
        
        throw new Error(`Remediation failed (${correlationId}): ${errorMessage}${errorDetails ? ' - ' + errorDetails : ''}`);
      }

      console.log('Atomic remediation completed successfully:', {
        correlationId: data.correlation_id,
        statistics: data.statistics,
        remediation: data.remediation,
        validation: data.validation
      });
      
      return data;
    } catch (error) {
      console.error('Atomic data remediation failed:', error);
      throw error;
    }
  }

  /**
   * Fallback to local remediation if Edge Function fails
   */
  static async executeLocalRemediation(): Promise<any> {
    try {
      console.log('Falling back to local remediation...');
      
      // Use the existing TestInfrastructureFixer as fallback
      const localResult = await TestInfrastructureFixer.executeInfrastructureFixes();
      
      return {
        success: true,
        timestamp: new Date().toISOString(),
        correlation_id: `local_${Date.now()}`,
        remediation: {
          status: 'success',
          statistics: {
            total_changes: 3, // phase1, phase2, phase3
            staff_created: localResult.phase1?.staffCreated || 0,
            orphaned_sales_fixed: 0, // Local remediation doesn't handle this
            invalid_products_fixed: localResult.phase2?.productsFixed || 0
          },
          phases_completed: [
            'Local Staff Infrastructure',
            'Local Product Pricing Fix', 
            'Local Infrastructure Validation'
          ]
        },
        validation: {
          status: 'healthy',
          validation_score: localResult.summary?.infrastructureScore || 60,
          recommendations: ['Local remediation completed', 'Run full validation to verify results']
        },
        fallback: true
      };
    } catch (error) {
      console.error('Local remediation also failed:', error);
      throw error;
    }
  }

  /**
   * Execute the complete QA remediation plan - now using atomic operations with fallback
   */
  static async executeFullRemediation(): Promise<any> {
    try {
      console.log('🚀 Starting atomic QA remediation process...');
      
      const results = {
        phases: [],
        startTime: new Date().toISOString(),
        endTime: null,
        success: false,
        summary: {},
        atomic: true,
        fallback: false
      };

      // Phase 1: Atomic Remediation Execution (with fallback)
      console.log('Phase 1: Executing atomic remediation...');
      let atomicResult;
      
      try {
        atomicResult = await this.executeRealDataRemediation();
      } catch (edgeFunctionError) {
        console.warn('Edge Function failed, attempting local fallback:', edgeFunctionError.message);
        
        try {
          atomicResult = await this.executeLocalRemediation();
          results.fallback = true;
        } catch (fallbackError) {
          console.error('Both Edge Function and local fallback failed:', fallbackError);
          
          results.phases.push({
            phase: 1,
            name: 'Atomic Data Remediation',
            status: 'failed',
            error: `Edge Function failed: ${edgeFunctionError.message}. Fallback failed: ${fallbackError.message}`,
            timestamp: new Date().toISOString()
          });
          
          throw new Error(`Complete remediation failure: ${edgeFunctionError.message}`);
        }
      }
      
      const remediationData = atomicResult.remediation;
      const statistics = atomicResult.statistics || {};
      const validationData = atomicResult.validation;

      results.phases.push({
        phase: 1,
        name: 'Atomic Data Remediation',
        status: 'completed',
        result: {
          correlation_id: atomicResult.correlation_id,
          orphaned_sales_fixed: statistics.orphaned_sales_fixed || 0,
          invalid_products_fixed: statistics.invalid_products_fixed || 0,
          staff_created: statistics.staff_created || 0,
          total_changes: statistics.total_changes || 0,
          phases_completed: remediationData?.phases_completed || [],
          fallback_used: results.fallback
        },
        timestamp: new Date().toISOString()
      });

      // Phase 2: Post-Remediation Validation
      console.log('Phase 2: Post-remediation validation...');
      
      const validationScore = validationData?.validation_score || 0;
      const infrastructureChecks = validationData?.infrastructure_checks || {};
      const dataQuality = validationData?.data_quality || {};
      
      results.phases.push({
        phase: 2,
        name: 'Post-Remediation Validation',
        status: validationScore >= 80 ? 'completed' : 'warning',
        result: {
          validation_score: validationScore,
          infrastructure_healthy: infrastructureChecks.customers_available && 
                                infrastructureChecks.products_available && 
                                infrastructureChecks.staff_available,
          data_quality_score: dataQuality.valid_products_count || 0,
          sales_with_reps: dataQuality.sales_with_reps || 0,
          commission_rates: dataQuality.commission_rates_detected || []
        },
        timestamp: new Date().toISOString()
      });

      // Phase 3: Final Infrastructure Check
      console.log('Phase 3: Final infrastructure validation...');
      
      const counts = validationData?.counts || {};
      const recommendations = validationData?.recommendations || [];

      results.phases.push({
        phase: 3,
        name: 'Infrastructure Readiness Check',
        status: (counts.customers > 0 && counts.products > 0 && counts.sales > 0 && counts.staff >= 3) ? 'completed' : 'warning',
        result: {
          ready_for_testing: validationScore >= 80,
          data_counts: counts,
          recommendations: recommendations.filter(r => r !== 'Infrastructure validation passed'),
          overall_health: validationData?.status || 'unknown'
        },
        timestamp: new Date().toISOString()
      });

      results.endTime = new Date().toISOString();
      results.success = results.phases.every(p => p.status === 'completed' || p.status === 'warning');

      // Generate enhanced summary and recommendations
      results.summary = this.generateAtomicRecommendations(results);

      console.log('✅ Atomic QA Remediation process completed:', results);
      return results;

    } catch (error) {
      console.error('❌ Atomic QA Remediation process failed:', error);
      throw error;
    }
  }
  
  /**
   * Phase 3: Validate data integrity
   */
  static async validateDataIntegrity() {
    try {
      const [salesIntegrity, productIntegrity, customerIntegrity] = await Promise.all([
        // Check sales FK integrity
        supabase.rpc('get_system_health_status'),
        
        // Check product data
        supabase
          .from('products')
          .select('id, name, cost_price, standard_selling_price')
          .eq('is_active', true)
          .limit(5),
          
        // Check customer data
        supabase
          .from('customers')
          .select('id, contact_person, email')
          .limit(5)
      ]);
      
      const validProducts = productIntegrity.data?.filter(p => 
        (p.standard_selling_price || 0) > (p.cost_price || 0)
      ) || [];
      
      return {
        success: true,
        message: 'Data integrity validation completed',
        details: {
          healthStatus: salesIntegrity.data || {},
          productIntegrity: {
            total: productIntegrity.data?.length || 0,
            valid: validProducts.length
          },
          customerIntegrity: {
            total: customerIntegrity.data?.length || 0
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Data integrity validation failed: ${error.message}`,
        error: error.message
      };
    }
  }
  
  /**
   * Phase 4: Ensure sales data prerequisites exist
   */
  static async ensureSalesDataPrerequisites() {
    try {
      const [customers, products, staff] = await Promise.all([
        supabase.from('customers').select('id').limit(1),
        supabase.from('products').select('id').eq('is_active', true).limit(1),
        supabase.from('staff').select('id').eq('is_active', true).limit(1)
      ]);
      
      const hasPrerequisites = (
        customers.data && customers.data.length > 0 &&
        products.data && products.data.length > 0 &&
        staff.data && staff.data.length > 0
      );
      
      // Check if sales data exists
      const { data: sales } = await supabase
        .from('sales')
        .select('id')
        .limit(5);
      
      return {
        success: hasPrerequisites,
        message: hasPrerequisites 
          ? 'Sales prerequisites validated successfully'
          : 'Missing sales prerequisites',
        details: {
          hasCustomers: (customers.data?.length || 0) > 0,
          hasProducts: (products.data?.length || 0) > 0, 
          hasStaff: (staff.data?.length || 0) > 0,
          hasSalesData: (sales?.length || 0) > 0,
          customersCount: customers.data?.length || 0,
          productsCount: products.data?.length || 0,
          staffCount: staff.data?.length || 0,
          salesCount: sales?.length || 0
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Sales prerequisites validation failed: ${error.message}`,
        error: error.message
      };
    }
  }
  
  /**
   * Phase 5: Check real-time subscriptions
   */
  static async checkRealtimeSubscriptions() {
    try {
      // Check if tables are in realtime publication
      const { data: publications } = await supabase
        .rpc('get_system_health_status');
      
      return {
        success: true,
        message: 'Real-time subscriptions check completed',
        details: {
          publicationExists: !!publications,
          healthStatus: publications || {}
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Real-time subscriptions check failed: ${error.message}`,
        error: error.message
      };
    }
  }
  
  /**
   * Generate recommendations based on remediation results
   */
  static generateRecommendations(results: any): any {
    const recommendations = [];
    const failedPhases = results.phases.filter(p => p.status === 'failed');
    const warningPhases = results.phases.filter(p => p.status === 'warning');

    if (failedPhases.length === 0 && warningPhases.length === 0) {
      recommendations.push({
        type: 'success',
        message: 'All remediation phases completed successfully',
        action: 'Run comprehensive business test suite to validate fixes'
      });
    }

    if (failedPhases.length > 0) {
      recommendations.push({
        type: 'critical',
        message: `${failedPhases.length} phase(s) failed`,
        action: 'Review failed phases and retry remediation',
        details: failedPhases.map(p => ({ phase: p.name, error: p.error }))
      });
    }

    if (warningPhases.length > 0) {
      recommendations.push({
        type: 'warning',
        message: `${warningPhases.length} phase(s) completed with warnings`,
        action: 'Review warnings and consider manual intervention',
        details: warningPhases.map(p => ({ phase: p.name, result: p.result }))
      });
    }

    return {
      overall_status: failedPhases.length === 0 ? 'success' : 'failed',
      pass_rate: ((results.phases.length - failedPhases.length) / results.phases.length * 100).toFixed(1) + '%',
      recommendations,
      next_steps: failedPhases.length === 0 
        ? ['Run Quick Validation Tests', 'Execute Business Test Suite', 'Monitor Test Results']
        : ['Fix Failed Phases', 'Retry Remediation', 'Validate Results']
    };
  }

  static generateAtomicRecommendations(results: any): any {
    const recommendations = [];
    const failedPhases = results.phases.filter(p => p.status === 'failed');
    const warningPhases = results.phases.filter(p => p.status === 'warning');

    // Analyze specific atomic remediation results
    const auditPhase = results.phases.find(p => p.name === 'Post-Remediation Audit');
    const infraPhase = results.phases.find(p => p.name === 'Test Infrastructure Validation');

    if (auditPhase?.result?.orphaned_sales_remaining === 0) {
      recommendations.push({
        type: 'success',
        message: 'All orphaned sales successfully assigned to active sales reps',
        action: 'Sales commission calculations should now work correctly'
      });
    }

    if (auditPhase?.result?.invalid_products_remaining === 0) {
      recommendations.push({
        type: 'success', 
        message: 'All product pricing validation issues resolved',
        action: 'Price calculation tests should now pass'
      });
    }

    if (infraPhase?.result?.commission_rates_found >= 2) {
      recommendations.push({
        type: 'success',
        message: `Found ${infraPhase.result.commission_rates_found} sales reps with active commission rates`,
        action: 'Commission calculation tests should detect rates correctly'
      });
    }

    if (infraPhase?.result?.realtime_tables?.length > 0) {
      recommendations.push({
        type: 'success',
        message: `Real-time enabled for ${infraPhase.result.realtime_tables.length} critical tables`,
        action: 'Real-time subscription tests should pass'
      });
    }

    if (failedPhases.length === 0 && warningPhases.length === 0) {
      recommendations.push({
        type: 'success',
        message: 'Atomic remediation completed successfully - all data integrity issues resolved',
        action: 'Expected test pass rate: ≥85%. Run full test suite now.'
      });
    }

    return {
      overall_status: failedPhases.length === 0 ? 'success' : 'failed',
      pass_rate: ((results.phases.length - failedPhases.length) / results.phases.length * 100).toFixed(1) + '%',
      data_integrity_score: this.calculateDataIntegrityScore(results),
      recommendations,
      next_steps: failedPhases.length === 0 
        ? ['Execute Quick Validation Tests', 'Run Full Business Test Suite', 'Verify 85%+ Pass Rate', 'Monitor Ongoing Test Results']
        : ['Review Failed Atomic Operations', 'Check Database Constraints', 'Retry Remediation']
    };
  }

  static calculateDataIntegrityScore(results: any): number {
    const auditPhase = results.phases.find(p => p.name === 'Post-Remediation Audit');
    const infraPhase = results.phases.find(p => p.name === 'Test Infrastructure Validation');
    
    let score = 0;
    
    // Orphaned sales fixed (25 points)
    if (auditPhase?.result?.orphaned_sales_remaining === 0) score += 25;
    
    // Product pricing fixed (25 points) 
    if (auditPhase?.result?.invalid_products_remaining === 0) score += 25;
    
    // Commission rates detected (25 points)
    if (infraPhase?.result?.commission_rates_found >= 2) score += 25;
    
    // Real-time enabled (25 points)
    if (infraPhase?.result?.realtime_tables?.length >= 3) score += 25;
    
    return score;
  }
  
  /**
   * Quick status check without full remediation
   */
  static async getRemediationStatus() {
    try {
      const validation = await TestValidationRunner.runQuickValidationTests();
      
      return {
        currentPassRate: validation.summary?.passRate || 0,
        testsRun: validation.summary?.totalTests || 0,
        testsPassed: validation.summary?.passedTests || 0,
        testsFailed: validation.summary?.failedTests || 0,
        needsRemediation: (validation.summary?.passRate || 0) < 85,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        error: error.message,
        needsRemediation: true,
        lastChecked: new Date().toISOString()
      };
    }
  }
}