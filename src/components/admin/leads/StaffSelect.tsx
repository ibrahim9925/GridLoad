// @ts-nocheck

import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Staff {
  id: string;
  full_name: string;
}

interface StaffSelectProps {
  value: string;
  staff: Staff[];
  onChange: (value: string) => void;
}

const StaffSelect = ({ value, staff, onChange }: StaffSelectProps) => {
  const handleValueChange = (newValue: string) => {
    // Convert "unassigned" back to empty string for the form
    onChange(newValue === "unassigned" ? "" : newValue);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="assigned_to">Assigned To</Label>
      <Select 
        value={value || "unassigned"} 
        onValueChange={handleValueChange}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select staff member" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {staff.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default StaffSelect;
