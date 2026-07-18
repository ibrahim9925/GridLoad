// @ts-nocheck
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

const AuthDebugger: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testAuthentication = async () => {
    setIsLoading(true);
    try {
      console.log("🔧 AuthDebugger: Testing authentication...");
      
      // Test 1: Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // Test 2: Call debug function to check database-level auth
      const { data: debugData, error: debugError } = await supabase
        .rpc('debug_auth_status');
      
      // Test 3: Try a simple CRUD operation
      const { data: customerTest, error: crudError } = await supabase
        .from('customers')
        .select('id, contact_person')
        .limit(1);
        
      setDebugInfo({
        session: {
          exists: !!session,
          user_id: session?.user?.id,
          email: session?.user?.email,
          expires_at: session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : null,
          error: sessionError?.message
        },
        database_auth: {
          data: debugData,
          error: debugError?.message
        },
        crud_test: {
          success: !crudError,
          data_count: customerTest?.length || 0,
          error: crudError?.message
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error("❌ AuthDebugger: Test failed:", error);
      setDebugInfo({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAuthStatus = () => {
    if (!debugInfo) return { status: 'unknown', color: 'secondary' };
    
    if (debugInfo.error) return { status: 'error', color: 'destructive' };
    
    const hasSession = debugInfo.session?.exists;
    const hasDbAuth = debugInfo.database_auth?.data?.auth_uid;
    const canCrud = debugInfo.crud_test?.success;
    
    if (hasSession && hasDbAuth && canCrud) {
      return { status: 'fully authenticated', color: 'default' };
    } else if (hasSession && !hasDbAuth) {
      return { status: 'session exists, db auth failed', color: 'destructive' };
    } else if (!hasSession) {
      return { status: 'no session', color: 'destructive' };
    } else {
      return { status: 'partial auth', color: 'secondary' };
    }
  };

  const authStatus = getAuthStatus();

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Authentication Debugger
          <Badge variant={authStatus.color as any}>
            {authStatus.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testAuthentication} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Testing..." : "Test Authentication & CRUD"}
        </Button>
        
        {debugInfo && (
          <div className="space-y-4">
            {debugInfo.error && (
              <Alert variant="destructive">
                <AlertDescription>
                  Test Error: {debugInfo.error}
                </AlertDescription>
              </Alert>
            )}
            
            {!debugInfo.error && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Frontend Session</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs space-y-1">
                        <div>Exists: {debugInfo.session?.exists ? '✅' : '❌'}</div>
                        <div>User ID: {debugInfo.session?.user_id?.substring(0, 8) || 'none'}...</div>
                        <div>Email: {debugInfo.session?.email || 'none'}</div>
                        {debugInfo.session?.error && (
                          <div className="text-red-500">Error: {debugInfo.session.error}</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Database Auth</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs space-y-1">
                        <div>auth.uid(): {debugInfo.database_auth?.data?.auth_uid ? '✅' : '❌'}</div>
                        <div>Staff Record: {debugInfo.database_auth?.data?.staff_record ? '✅' : '❌'}</div>
                        <div>Profile Record: {debugInfo.database_auth?.data?.profile_record ? '✅' : '❌'}</div>
                        {debugInfo.database_auth?.error && (
                          <div className="text-red-500">Error: {debugInfo.database_auth.error}</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">CRUD Test</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs space-y-1">
                        <div>Success: {debugInfo.crud_test?.success ? '✅' : '❌'}</div>
                        <div>Records: {debugInfo.crud_test?.data_count || 0}</div>
                        {debugInfo.crud_test?.error && (
                          <div className="text-red-500">Error: {debugInfo.crud_test.error}</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium">Raw Debug Data</summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                    {JSON.stringify(debugInfo, null, 2)}
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

export default AuthDebugger;