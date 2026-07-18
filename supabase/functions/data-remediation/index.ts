import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RemediationResult {
  success: boolean;
  data?: any;
  error?: string;
  details?: string;
  timestamp: string;
  correlation_id?: string;
  error_code?: string;
  hint?: string;
  stack?: string;
  statistics?: any;
  remediation?: any;
  validation?: any;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting atomic QA remediation...');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Execute the atomic remediation function with proper error handling
    console.log('Executing qa_remediation_atomic function...');
    const { data: remediationResult, error: remediationError } = await supabaseClient
      .rpc('qa_remediation_atomic');

    if (remediationError) {
      console.error('Remediation RPC error:', remediationError);
      
      const errorResponse: RemediationResult = {
        success: false,
        error: 'Database remediation failed',
        details: remediationError.message,
        error_code: remediationError.code,
        hint: remediationError.hint,
        timestamp: new Date().toISOString(),
        correlation_id: `error_${Date.now()}`
      };

      return new Response(JSON.stringify(errorResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    // Check if remediation indicates failure
    if (remediationResult?.status === 'failed') {
      console.error('Remediation function returned failure:', remediationResult);
      
      const errorResponse: RemediationResult = {
        success: false,
        error: 'Remediation process failed',
        details: remediationResult.error_message,
        correlation_id: remediationResult.correlation_id,
        statistics: remediationResult.statistics,
        timestamp: new Date().toISOString()
      };

      return new Response(JSON.stringify(errorResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    console.log('Remediation result:', JSON.stringify(remediationResult, null, 2));

    // Validate the infrastructure after remediation
    console.log('Validating test infrastructure...');
    const { data: validationResult, error: validationError } = await supabaseClient
      .rpc('validate_test_infrastructure');

    if (validationError) {
      console.error('Validation RPC error:', validationError);
      
      const errorResponse: RemediationResult = {
        success: false,
        error: 'Infrastructure validation failed',
        details: validationError.message,
        error_code: validationError.code,
        hint: validationError.hint,
        remediation: remediationResult,
        timestamp: new Date().toISOString(),
        correlation_id: remediationResult?.correlation_id || `error_${Date.now()}`
      };

      return new Response(JSON.stringify(errorResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    console.log('Validation result:', JSON.stringify(validationResult, null, 2));

    const response: RemediationResult = {
      success: true,
      timestamp: new Date().toISOString(),
      correlation_id: remediationResult?.correlation_id || 'unknown',
      remediation: remediationResult,
      validation: validationResult,
      statistics: remediationResult?.statistics || {}
    };

    console.log('Atomic remediation completed successfully');

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Unexpected error in data-remediation function:', error);
    
    const errorResponse: RemediationResult = {
      success: false,
      error: 'Internal server error',
      details: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      correlation_id: `error_${Date.now()}`
    };

    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});