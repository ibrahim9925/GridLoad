// @ts-nocheck

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface LeadFormFieldsProps {
  formData: {
    name: string;
    email: string;
    phone: string;
    company: string;
    status: string;
    value: string;
    next_follow_up: string;
    source: string;
    notes: string;
  };
  onInputChange: (field: string, value: string) => void;
}

const LeadFormFields = ({ formData, onInputChange }: LeadFormFieldsProps) => {
  const handleSourceChange = (value: string) => {
    onInputChange("source", value === "not_specified" ? "" : value);
  };

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => onInputChange("name", e.target.value)}
          placeholder="Contact name"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => onInputChange("email", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => onInputChange("phone", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="company">Company</Label>
        <Input
          id="company"
          value={formData.company}
          onChange={(e) => onInputChange("company", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={formData.status} onValueChange={(v) => onInputChange("status", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="quoted">Quoted</SelectItem>
            <SelectItem value="closed_won">Closed Won</SelectItem>
            <SelectItem value="closed_lost">Closed Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="value">Estimated Value (₪)</Label>
        <Input
          id="value"
          type="number"
          step="0.01"
          value={formData.value}
          onChange={(e) => onInputChange("value", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="next_follow_up">Next Follow Up</Label>
        <Input
          id="next_follow_up"
          type="date"
          value={formData.next_follow_up}
          onChange={(e) => onInputChange("next_follow_up", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="source">Lead Source</Label>
        <Select value={formData.source || "not_specified"} onValueChange={handleSourceChange}>
          <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="not_specified">Not specified</SelectItem>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="referral">Referral</SelectItem>
            <SelectItem value="social_media">Social Media</SelectItem>
            <SelectItem value="phone_call">Phone Call</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => onInputChange("notes", e.target.value)}
          rows={3}
        />
      </div>
    </>
  );
};

export default LeadFormFields;
