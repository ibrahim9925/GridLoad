// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import EnhancedAuthForm from '@/components/admin/auth/EnhancedAuthForm';
import ErrorBoundary from '@/components/ErrorBoundary';
import Logo from '@/components/site/Logo';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (data: { email: string; password: string }) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("🔐 Login: Attempting login for:", data.email);
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("Invalid email or password. Please check your credentials and try again.");
        }
        throw error;
      }
      console.log("✅ Login: Login successful");
      toast({
        title: "Login successful",
        description: "Welcome back to GridLoad CRM!",
      });
    } catch (error: any) {
      console.error("💥 Login: Auth failed:", error);
      const errorMessage = error?.message || "Authentication failed. Please try again.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Login failed",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect if already authenticated  
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      console.log("✅ Login: User already authenticated, redirecting to dashboard");
      navigate("/admin/dashboard", { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render if already authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <Logo heightClass="h-9" />
            </div>
            <CardTitle className="text-center">Admin Access</CardTitle>
            <p className="text-center text-sm text-muted-foreground">
              Authorized Personnel Only
            </p>
          </CardHeader>
          <CardContent>
            <EnhancedAuthForm
              isSignUp={false}
              isLoading={isLoading}
              error={error}
              onSubmit={handleSubmit}
              onToggleMode={() => {}}
              adminOnly={true}
            />
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
};

export default Login;