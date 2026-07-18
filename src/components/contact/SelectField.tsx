// @ts-nocheck

import React from "react";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormFieldProps } from "./types";

export const SelectField: React.FC<FormFieldProps> = ({
  id,
  name,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  children,
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" htmlFor={id}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <Select
        name={name}
        value={value}
        onValueChange={(value) => onChange(value, name)}
      >
        <SelectTrigger id={id} className="bg-white">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {children}
        </SelectContent>
      </Select>
    </div>
  );
};
