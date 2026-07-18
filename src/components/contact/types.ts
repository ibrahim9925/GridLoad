// @ts-nocheck

import { ReactNode } from "react";

export type FormData = {
  name: string;
  email: string;
  company: string;
  country?: string;
  productType: string;
  volume?: string;
  message: string;
  certifications?: string;
  capacity?: string;
};

export interface FormFieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: any, fieldName?: string) => void;
  placeholder: string;
  required?: boolean;
  children?: ReactNode;
}
