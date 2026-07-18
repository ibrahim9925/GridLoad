// @ts-nocheck
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  data?: any;
  duration?: number;
}

const ComprehensiveAuthTester: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [progress, setProgress] = useState(0);

  const runComprehensiveTest = async () => {
    setIsRunning(true);
    setResults([]);
    setProgress(0);

    const tests = [
      { name: 'Frontend Session', test: testFrontendSession },
      { name: 'Database Authentication', test: testDatabaseAuth },
      { name: 'User Role Verification', test: testUserRole },
      { name: 'CRUD Permissions', test: testCrudPermissions },
      { name: 'Session Refresh', test: testSessionRefresh },
      { name: 'RLS Policy Validation', test: testRlsPolicies },
    ];

    const testResults: TestResult[] = [];

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      setCurrentTest(test.name);
      setProgress(((i + 1) / tests.length) * 100);

      const startTime = Date.now();
      try {
        const result = await test.test();
        const duration = Date.now() - startTime;
        testResults.push({
          name: test.name,
          success: result.success,
          message: result.message,
          data: result.data,
          duration,
        });
      } catch (error: any) {
        const duration = Date.now() - startTime;
        testResults.push({
          name: test.name,
          success: false,
          message: `Test failed: ${error.message}`,
          duration,
        });
      }

      setResults([...testResults]);
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause between tests
    }

    setCurrentTest('');
    setIsRunning(false);
  };

  const testFrontendSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      return { success: false, message: `Session error: ${error.message}` };
    }
    
    if (!session) {
      return { success: false, message: 'No active session found' };
    }
    
    return {
      success: true,
      message: `Session active for ${session.user.email}`,
      data: {
        user_id: session.user.id,
        email: session.user.email,
        expires_at: new Date(session.expires_at! * 1000).toLocaleString(),
      },
    };
  };

  const testDatabaseAuth = async () => {
    const { data, error } = await supabase.rpc('debug_auth_status');
    
    if (error) {
      return { success: false, message: `Database auth failed: ${error.message}` };
    }
    
    if (!data || (typeof data === 'object' && !(data as any)?.auth_uid)) {
      return { success: false, message: 'auth.uid() returned null in database' };
    }
    
    return {
      success: true,
      message: 'Database authentication working',
      data: data,
    };
  };

  const testUserRole = async () => {
    const { data, error } = await supabase.rpc('get_current_user_role');
    
    if (error) {
      return { success: false, message: `Role fetch failed: ${error.message}` };
    }
    
    if (!data) {
      return { success: false, message: 'No role found for user' };
    }
    
    return {
      success: true,
      message: `User role: ${data}`,
      data: { role: data },
    };
  };

  const testCrudPermissions = async () => {
    try {
      // Test SELECT permission
      const { data: selectData, error: selectError } = await supabase
        .from('customers')
        .select('id, contact_person')
        .limit(1);
      
      if (selectError) {
        return { success: false, message: `SELECT permission failed: ${selectError.message}` };
      }
      
      // Test INSERT permission (create a test record)
      const testCustomer = {
        contact_person: `Test Customer ${Date.now()}`,
        email: 'test@example.com',
        phone: '123-456-7890',
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('customers')
        .insert(testCustomer)
        .select()
        .single();
      
      if (insertError) {
        return { success: false, message: `INSERT permission failed: ${insertError.message}` };
      }
      
      // Test UPDATE permission
      const { error: updateError } = await supabase
        .from('customers')
        .update({ notes: 'Test update' })
        .eq('id', insertData.id);
      
      if (updateError) {
        // Clean up the test record
        await supabase.from('customers').delete().eq('id', insertData.id);
        return { success: false, message: `UPDATE permission failed: ${updateError.message}` };
      }
      
      // Test DELETE permission (clean up test record)
      const { error: deleteError } = await supabase
        .from('customers')
        .delete()
        .eq('id', insertData.id);
      
      if (deleteError) {
        return { success: false, message: `DELETE permission failed: ${deleteError.message}` };
      }
      
      return {
        success: true,
        message: 'All CRUD operations successful',
        data: {
          select_count: selectData?.length || 0,
          test_record_id: insertData.id,
        },
      };
    } catch (error: any) {
      return { success: false, message: `CRUD test error: ${error.message}` };
    }
  };

  const testSessionRefresh = async () => {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      return { success: false, message: `Session refresh failed: ${error.message}` };
    }
    
    if (!data.session) {
      return { success: false, message: 'No session returned after refresh' };
    }
    
    return {
      success: true,
      message: 'Session refresh successful',
      data: {
        new_expires_at: new Date(data.session.expires_at! * 1000).toLocaleString(),
      },
    };
  };

  const testRlsPolicies = async () => {
    try {
      // Test access to different tables with RLS
      const tablesToTest = [
        { name: 'customers', table: 'customers' as const },
        { name: 'sales', table: 'sales' as const },
        { name: 'payments', table: 'payments' as const },
        { name: 'staff', table: 'staff' as const }
      ];
      const results: any = {};
      
      for (const tableInfo of tablesToTest) {
        const { data, error } = await supabase
          .from(tableInfo.table)
          .select('id')
          .limit(1);
        
        results[tableInfo.name] = {
          accessible: !error,
          error: error?.message || null,
          count: data?.length || 0,
        };
      }
      
      const accessibleTables = Object.keys(results).filter(table => results[table].accessible);
      
      return {
        success: accessibleTables.length > 0,
        message: `Access to ${accessibleTables.length}/${tablesToTest.length} tables`,
        data: results,
      };
    } catch (error: any) {
      return { success: false, message: `RLS test error: ${error.message}` };
    }
  };

  const getTestIcon = (result: TestResult) => {
    if (result.success) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const overallSuccess = results.length > 0 && results.every(r => r.success);
  const successCount = results.filter(r => r.success).length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Comprehensive Auth Test</span>
          {results.length > 0 && (
            <Badge variant={overallSuccess ? 'default' : 'destructive'}>
              {successCount}/{results.length} Passed
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runComprehensiveTest} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running Tests...
            </>
          ) : (
            'Run Comprehensive Test'
          )}
        </Button>
        
        {isRunning && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress: {Math.round(progress)}%</span>
              <span>{currentTest}</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}
        
        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((result, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 border rounded">
                {getTestIcon(result)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{result.name}</span>
                    {result.duration && (
                      <span className="text-xs text-muted-foreground">
                        {result.duration}ms
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {result.message}
                  </p>
                  {result.data && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer">Details</summary>
                      <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {results.length > 0 && !overallSuccess && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Some tests failed. Authentication system requires attention.
            </AlertDescription>
          </Alert>
        )}
        
        {results.length > 0 && overallSuccess && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              All tests passed! Authentication system is working correctly.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ComprehensiveAuthTester;