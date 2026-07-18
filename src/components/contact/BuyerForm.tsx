// @ts-nocheck

import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { FormData } from "./types";
import { FormField } from "./FormField";
import { TextareaField } from "./TextareaField";
import { SelectField } from "./SelectField";
import { SelectItem } from "@/components/ui/select";

interface BuyerFormProps {
  formData: FormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string, field?: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export const BuyerForm: React.FC<BuyerFormProps> = ({
  formData,
  handleChange,
  handleSubmit,
  isSubmitting,
}) => {
  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <FormField
          id="buyer-name"
          name="name"
          label="Full Name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Your name"
          required
        />
        <FormField
          id="buyer-email"
          name="email"
          label="Email"
          value={formData.email}
          onChange={handleChange}
          placeholder="your.email@example.com"
          required
        />
        <FormField
          id="buyer-company"
          name="company"
          label="Company"
          value={formData.company}
          onChange={handleChange}
          placeholder="Your company name"
          required
        />
        <FormField
          id="buyer-country"
          name="country"
          label="Country"
          value={formData.country || ""}
          onChange={handleChange}
          placeholder="Your country"
        />
        <SelectField
          id="buyer-product"
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
          <SelectItem value="multiple">Multiple Products</SelectItem>
        </SelectField>
        <FormField
          id="buyer-volume"
          name="volume"
          label="Volume Estimate"
          value={formData.volume || ""}
          onChange={handleChange}
          placeholder="Estimated quantity needed"
        />
      </div>
      <TextareaField
        id="buyer-message"
        name="message"
        label="Message"
        value={formData.message}
        onChange={handleChange}
        placeholder="Please describe your requirements in detail..."
        required
      />
      <Button 
        type="submit" 
        className="w-full bg-gridload-blue hover:bg-gridload-blue/90"
        disabled={isSubmitting}
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isSubmitting ? "Submitting..." : "Submit Request"}
      </Button>
    </form>
  );
};
