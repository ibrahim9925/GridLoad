// @ts-nocheck

import React from "react";
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, RefreshCw, Shield } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, authError, clearError, userRole } = useAuth();
  const navigate = useNavigate();

  // Wait for role lookup to finish even after isLoading flips to false.
  // useAuthCore defers fetchUserRole via setTimeout, so there's a brief window
  // where isAuthenticated=true but userRole=null — without this guard the user
  // sees a false "Access Denied" flash right after a successful login.
  if (isLoading || (isAuthenticated && userRole === null && !authError)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="mb-4">
              Authentication Error: {authError}
            </AlertDescription>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={clearError}
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
              <Button 
                size="sm" 
                onClick={() => navigate('/login', { replace: true })}
                className="bg-red-600 hover:bg-red-700"
              >
                Go to Login
              </Button>
            </div>
          </Alert>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Access Denied: Unable to verify user permissions. Please contact your administrator.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Access Denied: Admin privileges are required to access this area. 
              Your account role: {userRole}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
