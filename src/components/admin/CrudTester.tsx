// @ts-nocheck
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';

const CrudTester: React.FC = () => {
  const [testResults, setTestResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testCustomerName, setTestCustomerName] = useState('Test Customer ' + Date.now());

  const runCrudTests = async () => {
    setIsLoading(true);
    const results: any = { timestamp: new Date().toISOString(), tests: {} };
    
    try {
      console.log("🧪 CrudTester: Starting CRUD tests...");
      
      // Test 1: CREATE - Add a test customer
      console.log("📝 Testing CREATE...");
      try {
        const { data: createData, error: createError } = await supabase
          .from('customers')
          .insert([{
            contact_person: testCustomerName,
            email: 'test@example.com',
            phone: '1234567890',
            notes: 'Test customer for CRUD testing'
          }])
          .select()
          .single();
          
        results.tests.create = {
          success: !createError,
          data: createData,
          error: createError?.message
        };
        
        if (createData?.id) {
          // Test 2: READ - Fetch the created customer
          console.log("👀 Testing READ...");
          const { data: readData, error: readError } = await supabase
            .from('customers')
            .select('*')
            .eq('id', createData.id)
            .single();
            
          results.tests.read = {
            success: !readError,
            data: readData,
            error: readError?.message
          };
          
          // Test 3: UPDATE - Modify the customer
          console.log("✏️ Testing UPDATE...");
          const { data: updateData, error: updateError } = await supabase
            .from('customers')
            .update({ notes: 'Updated test customer' })
            .eq('id', createData.id)
            .select()
            .single();
            
          results.tests.update = {
            success: !updateError,
            data: updateData,
            error: updateError?.message
          };
          
          // Test 4: DELETE - Remove the test customer
          console.log("🗑️ Testing DELETE...");
          const { error: deleteError } = await supabase
            .from('customers')
            .delete()
            .eq('id', createData.id);
            
          results.tests.delete = {
            success: !deleteError,
            error: deleteError?.message
          };
        }
      } catch (error: any) {
        results.tests.create = {
          success: false,
          error: error.message
        };
      }
      
      // Test 5: LIST - Get customers list
      console.log("📋 Testing LIST...");
      try {
        const { data: listData, error: listError } = await supabase
          .from('customers')
          .select('id, contact_person, email')
          .limit(5);
          
        results.tests.list = {
          success: !listError,
          count: listData?.length || 0,
          error: listError?.message
        };
      } catch (error: any) {
        results.tests.list = {
          success: false,
          error: error.message
        };
      }
      
      setTestResults(results);
      
    } catch (error: any) {
      console.error("❌ CrudTester: Test failed:", error);
      setTestResults({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getOverallStatus = () => {
    if (!testResults?.tests) return { status: 'not tested', color: 'secondary' };
    
    const tests = testResults.tests;
    const successCount = Object.values(tests).filter((test: any) => test.success).length;
    const totalTests = Object.keys(tests).length;
    
    if (successCount === totalTests) {
      return { status: `all tests passed (${successCount}/${totalTests})`, color: 'default' };
    } else if (successCount > 0) {
      return { status: `partial success (${successCount}/${totalTests})`, color: 'secondary' };
    } else {
      return { status: `all tests failed (0/${totalTests})`, color: 'destructive' };
    }
  };

  const status = getOverallStatus();

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          CRUD Operations Tester
          <Badge variant={status.color as any}>
            {status.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="testCustomerName">Test Customer Name</Label>
          <Input
            id="testCustomerName"
            value={testCustomerName}
            onChange={(e) => setTestCustomerName(e.target.value)}
            placeholder="Enter test customer name"
          />
        </div>
        
        <Button 
          onClick={runCrudTests} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Running CRUD Tests..." : "Run All CRUD Tests"}
        </Button>
        
        {testResults && (
          <div className="space-y-4">
            {testResults.error && (
              <Alert variant="destructive">
                <AlertDescription>
                  Test Error: {testResults.error}
                </AlertDescription>
              </Alert>
            )}
            
            {testResults.tests && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <Card className="p-3">
                    <div className="flex items-center space-x-2">
                      <Plus className="h-4 w-4" />
                      <div className="text-xs">
                        <div>CREATE</div>
                        <div className={testResults.tests.create?.success ? 'text-green-600' : 'text-red-600'}>
                          {testResults.tests.create?.success ? '✅' : '❌'}
                        </div>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-3">
                    <div className="flex items-center space-x-2">
                      <Edit className="h-4 w-4" />
                      <div className="text-xs">
                        <div>READ</div>
                        <div className={testResults.tests.read?.success ? 'text-green-600' : 'text-red-600'}>
                          {testResults.tests.read?.success ? '✅' : '❌'}
                        </div>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-3">
                    <div className="flex items-center space-x-2">
                      <Edit className="h-4 w-4" />
                      <div className="text-xs">
                        <div>UPDATE</div>
                        <div className={testResults.tests.update?.success ? 'text-green-600' : 'text-red-600'}>
                          {testResults.tests.update?.success ? '✅' : '❌'}
                        </div>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-3">
                    <div className="flex items-center space-x-2">
                      <Trash2 className="h-4 w-4" />
                      <div className="text-xs">
                        <div>DELETE</div>
                        <div className={testResults.tests.delete?.success ? 'text-green-600' : 'text-red-600'}>
                          {testResults.tests.delete?.success ? '✅' : '❌'}
                        </div>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-3">
                    <div className="flex items-center space-x-2">
                      <Edit className="h-4 w-4" />
                      <div className="text-xs">
                        <div>LIST</div>
                        <div className={testResults.tests.list?.success ? 'text-green-600' : 'text-red-600'}>
                          {testResults.tests.list?.success ? '✅' : '❌'}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
                
                {/* Show errors for failed tests */}
                {Object.entries(testResults.tests).map(([testName, testResult]: [string, any]) => (
                  testResult.error && (
                    <Alert key={testName} variant="destructive">
                      <AlertDescription>
                        <strong>{testName.toUpperCase()} Error:</strong> {testResult.error}
                      </AlertDescription>
                    </Alert>
                  )
                ))}
                
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium">Full Test Results</summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                    {JSON.stringify(testResults, null, 2)}
                  </pre>
                </details>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CrudTester;