// @ts-nocheck

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Shield, AlertCircle } from "lucide-react";
import { loginSchema, signupSchema } from "@/utils/validationSchemas";
import type { z } from "zod";

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

interface EnhancedAuthFormProps {
  isSignUp: boolean;
  isLoading: boolean;
  error: string | null;
  onSubmit: (data: LoginFormData | SignupFormData) => void;
  onToggleMode: () => void;
  adminOnly?: boolean; // New prop to disable signup for admin portal
}

const EnhancedAuthForm: React.FC<EnhancedAuthFormProps> = ({
  isSignUp,
  isLoading,
  error,
  onSubmit,
  onToggleMode,
  adminOnly = false
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const schema = isSignUp ? signupSchema : loginSchema;
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm({
    resolver: zodResolver(schema),
    mode: "onBlur"
  });

  const password = watch("password");

  const onFormSubmit = (data: any) => {
    onSubmit(data);
  };

  const handleToggleMode = () => {
    reset();
    onToggleMode();
  };

  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    if (!password) return { strength: 0, label: "", color: "" };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    
    const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
    const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"];
    
    return {
      strength,
      label: labels[strength - 1] || "",
      color: colors[strength - 1] || ""
    };
  };

  const passwordStrength = isSignUp ? getPasswordStrength(password || "") : null;

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isSignUp && !adminOnly && (
        <div className="space-y-2">
          <Label htmlFor="full_name">Full Name</Label>
          <Input
            id="full_name"
            type="text"
            placeholder="Enter your full name"
            {...register("full_name")}
            className={errors.full_name ? "border-red-500" : ""}
          />
          {errors.full_name?.message && (
            <p className="text-sm text-red-500">{String(errors.full_name.message)}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter your email"
          {...register("email")}
          className={errors.email ? "border-red-500" : ""}
        />
        {errors.email?.message && (
          <p className="text-sm text-red-500">{String(errors.email.message)}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            {...register("password")}
            className={errors.password ? "border-red-500 pr-10" : "pr-10"}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
        {errors.password?.message && (
          <p className="text-sm text-red-500">{String(errors.password.message)}</p>
        )}
        
        {/* Password strength indicator for signup */}
        {isSignUp && !adminOnly && password && passwordStrength && (
          <div className="space-y-1">
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`h-1 w-full rounded ${
                    level <= passwordStrength.strength 
                      ? passwordStrength.color 
                      : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-600">
              Password strength: {passwordStrength.label}
            </p>
          </div>
        )}
      </div>

      {isSignUp && !adminOnly && (
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              {...register("confirmPassword")}
              className={errors.confirmPassword ? "border-red-500 pr-10" : "pr-10"}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          {errors.confirmPassword?.message && (
            <p className="text-sm text-red-500">{String(errors.confirmPassword.message)}</p>
          )}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>{isSignUp ? "Creating account..." : "Signing in..."}</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>{isSignUp ? "Create Account" : "Sign In"}</span>
          </div>
        )}
      </Button>

      {!adminOnly && (
        <div className="text-center">
          <Button
            type="button"
            variant="link"
            onClick={handleToggleMode}
            className="text-sm"
          >
            {isSignUp 
              ? "Already have an account? Sign in" 
              : "Don't have an account? Sign up"
            }
          </Button>
        </div>
      )}

      {isSignUp && !adminOnly && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Your account will need admin approval before you can access the system.
          </AlertDescription>
        </Alert>
      )}
    </form>
  );
};

export default EnhancedAuthForm;
