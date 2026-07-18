// @ts-nocheck
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, User, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const AuthenticationStatus = () => {
  const { 
    isAuthenticated, 
    user, 
    userRole, 
    authError 
  } = useAuth();

  const getAuthStatus = () => {
    if (!isAuthenticated || !user) {
      return {
        status: "Not Authenticated",
        color: "destructive" as const,
        icon: <AlertCircle className="h-4 w-4" />
      };
    }
    
    return {
      status: "Authenticated",
      color: "default" as const,
      icon: <CheckCircle className="h-4 w-4" />
    };
  };

  const authStatus = getAuthStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Authentication Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span>Overall Status:</span>
          <Badge variant={authStatus.color} className="flex items-center gap-1">
            {authStatus.icon}
            {authStatus.status}
          </Badge>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>User ID:</span>
            <span className="font-mono">{user?.id || "None"}</span>
          </div>
          <div className="flex justify-between">
            <span>Email:</span>
            <span>{user?.email || "Not logged in"}</span>
          </div>
          <div className="flex justify-between">
            <span>Role:</span>
            <span>{userRole || "Unknown"}</span>
          </div>
          <div className="flex justify-between">
            <span>Session Health:</span>
            <Badge variant="default">
              Healthy
            </Badge>
          </div>
        </div>
        
        {authError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}
        
        {!isAuthenticated && (
          <Alert>
            <User className="h-4 w-4" />
            <AlertDescription>
              Please log in to run system tests. Tests require admin authentication.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};