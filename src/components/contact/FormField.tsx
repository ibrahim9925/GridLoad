// @ts-nocheck

import React from "react";
import { Input } from "@/components/ui/input";
import { FormFieldProps } from "./types";

export const FormField: React.FC<FormFieldProps> = ({
  id,
  name,
  label,
  value,
  onChange,
  placeholder,
  required = false,
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" htmlFor={id}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <Input
        id={id}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
      />
    </div>
  );
};
