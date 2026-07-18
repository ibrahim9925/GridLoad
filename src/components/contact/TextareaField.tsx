// @ts-nocheck

import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { FormFieldProps } from "./types";

export const TextareaField: React.FC<FormFieldProps> = ({
  id,
  name,
  label,
  value,
  onChange,
  placeholder,
  required = false,
}) => {
  return (
    <div className="space-y-2 mb-6">
      <label className="block text-sm font-medium" htmlFor={id}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <Textarea
        id={id}
        name={name}
        placeholder={placeholder}
        rows={5}
        value={value}
        onChange={onChange}
        required={required}
        className="resize-none"
      />
    </div>
  );
};
