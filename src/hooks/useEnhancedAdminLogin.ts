// @ts-nocheck

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { validateSchema, loginSchema, signupSchema } from "@/utils/validationSchemas";
import { useSecurityAuditLogging } from "@/hooks/useSecurityAuditLogging";
import { useEnhancedSecurity } from "@/hooks/useEnhancedSecurity";
import type { z } from "zod";

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

export const useEnhancedAdminLogin = (adminOnly: boolean = false) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const { toast } = useToast();
  const { logLogin, logFailedAuth } = useSecurityAuditLogging();
  const { checkRateLimit } = useEnhancedSecurity();

  const handleLogin = async (data: LoginFormData) => {
    const validation = validateSchema(loginSchema, data);
    if (!validation.success) {
      setError(validation.errors?.[0] || "Invalid input");
      return;
    }

    // Check rate limiting
    const identifier = data.email.toLowerCase();
    if (!checkRateLimit(identifier)) {
      setError("Too many login attempts. Please wait before trying again.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("🔐 EnhancedAdminLogin: Attempting login for:", data.email);
      
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      
      if (error) {
        // Log failed authentication attempt
        await logFailedAuth('password_login', {
          email: data.email,
          error_message: error.message,
          timestamp: new Date().toISOString()
        });

        if (error.message.includes("Invalid login credentials")) {
          throw new Error("Invalid email or password. Please check your credentials and try again.");
        }
        throw error;
      }
      
      console.log("✅ EnhancedAdminLogin: Login successful");
      
      // Log successful login (detailed logging handled in useAuthEnhanced)
      toast({
        title: "Login successful",
        description: "Welcome back to GridLoad CRM!",
      });
      
    } catch (error: any) {
      console.error("💥 EnhancedAdminLogin: Login failed:", error);
      const errorMessage = error?.message || "Login failed. Please try again.";
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

  const handleSignup = async (data: SignupFormData) => {
    // Signup is completely disabled for admin login
    setError("Registration is not available. Please contact your administrator for access.");
    return;
  };

  const handleSubmit = async (data: LoginFormData | SignupFormData) => {
    // Only allow login, never signup for admin area
    await handleLogin(data as LoginFormData);
  };

  const toggleMode = () => {
    // Never allow toggle mode for admin area - login only
    setError("Registration is not available for admin access.");
  };

  return {
    isLoading,
    error,
    isSignUp,
    handleSubmit,
    toggleMode
  };
};
