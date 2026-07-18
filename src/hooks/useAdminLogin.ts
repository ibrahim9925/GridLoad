// @ts-nocheck

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const useAdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      console.log(`🔐 AdminLogin: Starting ${isSignUp ? 'signup' : 'login'} for:`, email);
      
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin/dashboard`
          }
        });
        
        if (error) throw error;
        
        console.log("✅ AdminLogin: Signup successful for:", data.user?.email);
        toast({
          title: "Account created successfully",
          description: "Please check your email for verification.",
        });
      } else {
        console.log("🚀 AdminLogin: Attempting login...");
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        console.log("✅ AdminLogin: Login successful for:", data.user?.email);
        console.log("📍 AdminLogin: Session created:", data.session ? "Valid" : "None");
        
        toast({
          title: "Login successful",
          description: "Redirecting to dashboard...",
        });
        
        // Note: Navigation will be handled by auth state change in useAuth
        console.log("🔄 AdminLogin: Waiting for auth state change to handle navigation");
      }
      
    } catch (error: any) {
      console.error(`💥 AdminLogin: ${isSignUp ? 'Signup' : 'Login'} failed:`, error);
      setError(error?.message || "Authentication failed");
      toast({
        variant: "destructive",
        title: `${isSignUp ? 'Signup' : 'Login'} failed`,
        description: error?.message || "Invalid credentials",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    email,
    password,
    isLoading,
    error,
    isSignUp,
    setEmail,
    setPassword,
    setIsSignUp,
    handleSubmit
  };
};
