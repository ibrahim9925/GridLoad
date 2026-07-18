// @ts-nocheck

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface EnhancedFormFieldProps {
  type?: "text" | "email" | "tel" | "number" | "date" | "textarea" | "select";
  name: string;
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  options?: Option[];
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  helpText?: string;
}

const EnhancedFormField = ({
  type = "text",
  name,
  label,
  value,
  onChange,
  onBlur,
  error,
  required = false,
  placeholder,
  disabled = false,
  options = [],
  rows = 3,
  min,
  max,
  step,
  className = "",
  helpText,
}: EnhancedFormFieldProps) => {
  const hasError = !!error;
  const isValid = !hasError && value !== "" && value !== undefined;

  const handleChange = (newValue: string | number) => {
    if (type === "number") {
      onChange(newValue === "" ? "" : Number(newValue));
    } else {
      onChange(newValue);
    }
  };

  const renderField = () => {
    switch (type) {
      case "textarea":
        return (
          <Textarea
            id={name}
            name={name}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className={`${hasError ? "border-red-500 focus:border-red-500" : ""} ${
              isValid ? "border-green-500" : ""
            }`}
          />
        );

      case "select":
        return (
          <Select value={value.toString()} onValueChange={handleChange} disabled={disabled}>
            <SelectTrigger
              className={`${hasError ? "border-red-500 focus:border-red-500" : ""} ${
                isValid ? "border-green-500" : ""
              }`}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default:
        return (
          <Input
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            min={min}
            max={max}
            step={step}
            className={`${hasError ? "border-red-500 focus:border-red-500" : ""} ${
              isValid ? "border-green-500" : ""
            }`}
          />
        );
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={name} className="flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
        {isValid && !hasError && (
          <CheckCircle className="h-4 w-4 text-green-500" />
        )}
      </Label>
      
      <div className="relative">
        {renderField()}
        {hasError && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <AlertCircle className="h-4 w-4 text-red-500" />
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
      
      {helpText && !error && (
        <p className="text-sm text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
};

export default EnhancedFormField;
