// @ts-nocheck
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle, Key, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  data?: any;
}

const AuthSystemTester: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const { isAuthenticated, user, userRole, authError } = useAuth();

  const runAuthTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    const results: TestResult[] = [];

    try {
      // Test 1: Frontend Authentication Status
      results.push({
        name: 'Frontend Authentication Status',
        success: isAuthenticated,
        message: isAuthenticated 
          ? `✅ User authenticated: ${user?.email}` 
          : '❌ No authenticated user in frontend',
        data: { isAuthenticated, userEmail: user?.email, userRole }
      });

      // Test 2: Session Verification
      try {
        const { data: session } = await supabase.auth.getSession();
        results.push({
          name: 'Supabase Session Verification',
          success: !!session.session,
          message: session.session 
            ? `✅ Valid Supabase session found for ${session.session.user.email}`
            : '❌ No valid Supabase session',
          data: { hasSession: !!session.session, userId: session.session?.user?.id }
        });
      } catch (error: any) {
        results.push({
          name: 'Supabase Session Verification',
          success: false,
          message: `❌ Session check failed: ${error.message}`,
          data: { error: error.message }
        });
      }

      // Test 3: Database Authentication Context
      try {
        const { data: debugInfo, error } = await supabase.rpc('debug_auth_comprehensive');
        const debugData = debugInfo as any; // Cast to handle dynamic JSON structure
        results.push({
          name: 'Database Authentication Context',
          success: !error && debugData?.auth_uid !== null,
          message: error 
            ? `❌ Database auth check failed: ${error.message}`
            : debugData?.auth_uid
              ? `✅ Database session active: ${debugData.auth_uid}`
              : '❌ No database authentication context found',
          data: debugData
        });
      } catch (error: any) {
        results.push({
          name: 'Database Authentication Context',
          success: false,
          message: `❌ Database auth test failed: ${error.message}`,
          data: { error: error.message }
        });
      }

      // Test 4: Role Function Access
      try {
        const { data: roleData, error } = await supabase.rpc('get_current_user_role');
        results.push({
          name: 'Role Function Access',
          success: !error && roleData !== null,
          message: error 
            ? `❌ Role function failed: ${error.message}`
            : `✅ Role function working: ${roleData}`,
          data: { role: roleData, error: error?.message }
        });
      } catch (error: any) {
        results.push({
          name: 'Role Function Access',
          success: false,
          message: `❌ Role function error: ${error.message}`,
          data: { error: error.message }
        });
      }

      // Test 5: RLS Policy Test - Try to access protected data
      try {
        const { data: customersData, error } = await supabase
          .from('customers')
          .select('id')
          .limit(1);
          
        results.push({
          name: 'RLS Policy Access Test',
          success: !error,
          message: error 
            ? `❌ RLS policy blocking access: ${error.message}`
            : `✅ RLS policies working correctly - data accessible`,
          data: { hasAccess: !error, recordCount: customersData?.length || 0 }
        });
      } catch (error: any) {
        results.push({
          name: 'RLS Policy Access Test',
          success: false,
          message: `❌ RLS test failed: ${error.message}`,
          data: { error: error.message }
        });
      }

      // Test 6: Admin Function Access
      try {
        const { data: isAdminResult, error } = await supabase.rpc('is_admin');
        results.push({
          name: 'Admin Function Access',
          success: !error,
          message: error 
            ? `❌ Admin function failed: ${error.message}`
            : `✅ Admin function working: ${isAdminResult ? 'User is admin' : 'User is not admin'}`,
          data: { isAdmin: isAdminResult, error: error?.message }
        });
      } catch (error: any) {
        results.push({
          name: 'Admin Function Access',
          success: false,
          message: `❌ Admin function error: ${error.message}`,
          data: { error: error.message }
        });
      }

    } catch (error: any) {
      results.push({
        name: 'Test Suite Execution',
        success: false,
        message: `❌ Test suite failed: ${error.message}`,
        data: { error: error.message }
      });
    }

    setTestResults(results);
    setIsRunning(false);
  };

  const getOverallStatus = () => {
    if (testResults.length === 0) return 'pending';
    const successCount = testResults.filter(r => r.success).length;
    if (successCount === testResults.length) return 'success';
    if (successCount > 0) return 'warning';
    return 'error';
  };

  const overallStatus = getOverallStatus();
  const successCount = testResults.filter(r => r.success).length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Authentication System Tester
        </CardTitle>
        <div className="flex items-center justify-between">
          <Button 
            onClick={runAuthTests} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Key className="h-4 w-4" />
                Test Authentication System
              </>
            )}
          </Button>
          
          {testResults.length > 0 && (
            <Badge 
              variant={overallStatus === 'success' ? 'default' : 
                     overallStatus === 'warning' ? 'secondary' : 'destructive'}
            >
              {successCount}/{testResults.length} Tests Passed
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {authError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Authentication Error: {authError}
            </AlertDescription>
          </Alert>
        )}

        {/* Current Auth Status */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="text-sm font-medium">Frontend Auth</div>
            <div className={`text-xs ${isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
              {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium">User Role</div>
            <div className="text-xs text-muted-foreground">
              {userRole || 'No Role'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium">User Email</div>
            <div className="text-xs text-muted-foreground">
              {user?.email || 'No User'}
            </div>
          </div>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Test Results:</h4>
            {testResults.map((result, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{result.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {result.message}
                  </div>
                  {result.data && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-blue-600 hover:text-blue-800">
                        View Details
                      </summary>
                      <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Overall Status */}
        {testResults.length > 0 && (
          <Alert variant={overallStatus === 'success' ? 'default' : 'destructive'}>
            <AlertDescription>
              {overallStatus === 'success' ? (
                <>✅ Authentication System: All tests passed! System is ready for production.</>
              ) : overallStatus === 'warning' ? (
                <>⚠️ Authentication System: Some issues detected. Review failed tests above.</>
              ) : (
                <>❌ Authentication System: Critical issues detected. System not ready for production.</>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default AuthSystemTester;