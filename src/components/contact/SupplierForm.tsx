// @ts-nocheck

import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { FormData } from "./types";
import { FormField } from "./FormField";
import { TextareaField } from "./TextareaField";
import { SelectField } from "./SelectField";
import { SelectItem } from "@/components/ui/select";

interface SupplierFormProps {
  formData: FormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string, field?: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export const SupplierForm: React.FC<SupplierFormProps> = ({
  formData,
  handleChange,
  handleSubmit,
  isSubmitting,
}) => {
  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <FormField
          id="supplier-name"
          name="name"
          label="Contact Person"
          value={formData.name}
          onChange={handleChange}
          placeholder="Your name"
          required
        />
        <FormField
          id="supplier-email"
          name="email"
          label="Email"
          value={formData.email}
          onChange={handleChange}
          placeholder="your.email@example.com"
          required
        />
        <FormField
          id="supplier-company"
          name="company"
          label="Company Name"
          value={formData.company}
          onChange={handleChange}
          placeholder="Your company name"
          required
        />
        <SelectField
          id="supplier-product"
          name="productType"
          label="Product Type"
          value={formData.productType}
          onChange={handleChange}
          placeholder="Select product type"
          required
        >
          <SelectItem value="solar-panels">Solar Panels</SelectItem>
          <SelectItem value="batteries">Batteries</SelectItem>
          <SelectItem value="inverters">Inverters</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </SelectField>
        <FormField
          id="supplier-certifications"
          name="certifications"
          label="Certifications"
          value={formData.certifications || ""}
          onChange={handleChange}
          placeholder="e.g., ISO, IEC, TÜV, UL"
        />
        <FormField
          id="supplier-capacity"
          name="capacity"
          label="Production Capacity"
          value={formData.capacity || ""}
          onChange={handleChange}
          placeholder="e.g., 100MW/year"
        />
      </div>
      <TextareaField
        id="supplier-message"
        name="message"
        label="Additional Information"
        value={formData.message}
        onChange={handleChange}
        placeholder="Please tell us about your products, manufacturing capabilities, and export experience..."
        required
      />
      <Button 
        type="submit" 
        className="w-full bg-gridload-green hover:bg-gridload-green/90"
        disabled={isSubmitting}
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isSubmitting ? "Submitting..." : "Submit Application"}
      </Button>
    </form>
  );
};
