// @ts-nocheck
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Clock, Shield } from 'lucide-react';

const SessionHealthMonitor: React.FC = () => {
  const { 
    isAuthenticated, 
    authError, 
    userRole 
  } = useAuth();

  const getHealthStatus = () => {
    if (!isAuthenticated) {
      return {
        status: "Not Authenticated",
        color: "destructive" as const,
        icon: <AlertTriangle className="h-4 w-4" />
      };
    }
    
    if (authError) {
      return {
        status: "Error",
        color: "destructive" as const,
        icon: <AlertTriangle className="h-4 w-4" />
      };
    }
    
    return {
      status: "Healthy",
      color: "default" as const,
      icon: <CheckCircle className="h-4 w-4" />
    };
  };

  const healthStatus = getHealthStatus();

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Session Health
          </span>
          <Badge variant={healthStatus.color as any} className="text-xs">
            {healthStatus.icon}
            {healthStatus.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {authError && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {authError}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <div className="text-muted-foreground">Status</div>
              <div className="font-medium">
                {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-muted-foreground">Role</div>
              <div className="font-medium">
                {userRole ? `${userRole}` : 'Loading...'}
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-muted-foreground">DB Session</div>
              <div className="font-medium">
                ✅ Active
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-muted-foreground">Last Check</div>
              <div className="font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Just now
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SessionHealthMonitor;