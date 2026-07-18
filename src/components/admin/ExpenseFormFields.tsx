// @ts-nocheck

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ExpenseCategory } from "@/hooks/useExpenseForm";

interface Staff {
  id: string;
  full_name: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface Shipment {
  id: string;
  shipment_number: string;
}

interface ExpenseFormFieldsProps {
  category: ExpenseCategory;
  setCategory: (value: ExpenseCategory) => void;
  amount: string;
  setAmount: (value: string) => void;
  expenseDate: Date;
  setExpenseDate: (date: Date) => void;
  description: string;
  setDescription: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  assignedTo: string;
  setAssignedTo: (value: string) => void;
  staff: Staff[];
  supplierId?: string;
  setSupplierId?: (value: string) => void;
  suppliers?: Supplier[];
  shipmentId?: string;
  setShipmentId?: (value: string) => void;
  shipments?: Shipment[];
}

const ExpenseFormFields = ({
  category,
  setCategory,
  amount,
  setAmount,
  expenseDate,
  setExpenseDate,
  description,
  setDescription,
  notes,
  setNotes,
  assignedTo,
  setAssignedTo,
  staff,
  supplierId = "",
  setSupplierId,
  suppliers = [],
  shipmentId = "",
  setShipmentId,
  shipments = [],
}: ExpenseFormFieldsProps) => {
  const expenseCategories: { value: ExpenseCategory; label: string }[] = [
    { value: "transport", label: "Transport" },
    { value: "parts", label: "Parts" },
    { value: "installation", label: "Installation" },
    { value: "marketing", label: "Marketing" },
    { value: "office", label: "Office" },
    { value: "other", label: "Other" },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select value={category} onValueChange={(value: ExpenseCategory) => setCategory(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {expenseCategories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Amount *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Expense Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !expenseDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {expenseDate ? format(expenseDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={expenseDate}
                onSelect={(date) => date && setExpenseDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label htmlFor="assigned_to">Assigned To</Label>
          <Select value={assignedTo} onValueChange={setAssignedTo}>
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of the expense"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes or details"
          rows={3}
        />
      </div>

      {setSupplierId && suppliers.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="supplier">Link to Supplier (optional)</Label>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger>
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {setShipmentId && (
        <div className="space-y-2">
          <Label htmlFor="shipment">Link to Shipment (optional)</Label>
          <Select value={shipmentId || "none"} onValueChange={setShipmentId}>
            <SelectTrigger>
              <SelectValue placeholder="Select shipment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {shipments.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.shipment_number}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );
};

export default ExpenseFormFields;
