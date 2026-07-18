// @ts-nocheck
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { SolarFormData } from "@/types/solar";

interface SolarCalculatorFormProps {
  formData: SolarFormData;
  isSubmitting: boolean;
  onInputChange: (field: string, value: string | boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const SolarCalculatorForm: React.FC<SolarCalculatorFormProps> = ({
  formData,
  isSubmitting,
  onInputChange,
  onSubmit,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name *</Label>
          <Input
            id="fullName"
            value={formData.fullName}
            onChange={(e) => onInputChange('fullName', e.target.value)}
            placeholder="Your full name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => onInputChange('email', e.target.value)}
            placeholder="your.email@example.com"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => onInputChange('phone', e.target.value)}
            placeholder="+1234567890"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location *</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => onInputChange('location', e.target.value)}
            placeholder="City, Country"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="monthlyBill">Monthly Electricity Bill ($) *</Label>
          <Input
            id="monthlyBill"
            type="number"
            value={formData.monthlyBill}
            onChange={(e) => onInputChange('monthlyBill', e.target.value)}
            placeholder="150"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="monthlyConsumption">Monthly Consumption (kWh)</Label>
          <Input
            id="monthlyConsumption"
            type="number"
            value={formData.monthlyConsumption}
            onChange={(e) => onInputChange('monthlyConsumption', e.target.value)}
            placeholder="500 (optional - we'll estimate)"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="roofSpace">Available Roof Space (m²) *</Label>
          <Input
            id="roofSpace"
            type="number"
            value={formData.roofSpace}
            onChange={(e) => onInputChange('roofSpace', e.target.value)}
            placeholder="50"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="roofType">Roof Type *</Label>
          <Select 
            value={formData.roofType} 
            onValueChange={(value) => onInputChange('roofType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select roof type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flat">Flat Roof</SelectItem>
              <SelectItem value="tilted">Tilted Roof</SelectItem>
              <SelectItem value="concrete">Concrete</SelectItem>
              <SelectItem value="tin">Tin/Metal</SelectItem>
              <SelectItem value="tile">Tile</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="budgetRange">Budget Range (Optional)</Label>
          <Select 
            value={formData.budgetRange} 
            onValueChange={(value) => onInputChange('budgetRange', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select budget range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="under-5k">Under $5,000</SelectItem>
              <SelectItem value="5k-10k">$5,000 - $10,000</SelectItem>
              <SelectItem value="10k-20k">$10,000 - $20,000</SelectItem>
              <SelectItem value="20k-50k">$20,000 - $50,000</SelectItem>
              <SelectItem value="over-50k">Over $50,000</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select value={formData.currency} onValueChange={(value) => onInputChange('currency', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD ($) - US Dollar</SelectItem>
              <SelectItem value="ILS">ILS (₪) - Israeli Shekel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="batteryBackup"
            checked={formData.batteryBackup}
            onCheckedChange={(checked) => onInputChange('batteryBackup', checked)}
          />
          <Label htmlFor="batteryBackup">
            I want battery backup for power outages
          </Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="additionalNotes">Additional Notes</Label>
          <Textarea
            id="additionalNotes"
            value={formData.additionalNotes}
            onChange={(e) => onInputChange('additionalNotes', e.target.value)}
            placeholder="Any specific requirements or questions..."
            rows={3}
          />
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full bg-primary hover:bg-primary/90"
        disabled={isSubmitting}
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isSubmitting ? "Calculating..." : "Calculate My Solar System"}
      </Button>
    </form>
  );
};