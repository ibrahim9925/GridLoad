// @ts-nocheck

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";

interface AuthFormProps {
  email: string;
  password: string;
  isLoading: boolean;
  error: string | null;
  isSignUp: boolean;
  connectionStatus: 'checking' | 'connected' | 'error';
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggleMode: () => void;
}

const AuthForm = ({
  email,
  password,
  isLoading,
  error,
  isSignUp,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onToggleMode
}: AuthFormProps) => {
  return (
    <>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="Enter your email"
            required
            disabled={isLoading}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="Enter your password"
            required
            disabled={isLoading}
          />
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? (isSignUp ? "Creating account..." : "Signing in...") : (isSignUp ? "Create account" : "Sign in")}
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={onToggleMode}
          disabled={isLoading}
        >
          {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
        </Button>
        
        <div className="text-center text-sm text-muted-foreground">
          Demo: admin@gridload.com / password123
        </div>
      </form>
    </>
  );
};

export default AuthForm;
