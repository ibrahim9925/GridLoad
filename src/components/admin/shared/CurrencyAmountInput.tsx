// @ts-nocheck
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CURRENCIES = [
  { value: "NIS", label: "₪ NIS" },
  { value: "USD", label: "$ USD" },
  { value: "JOD", label: "JOD" },
  { value: "EUR", label: "€ EUR" },
];

interface CurrencyAmountInputProps {
  amount: number;
  currency: string;
  exchangeRate: number;
  nisEquivalent: number;
  onAmountChange: (amount: number) => void;
  onCurrencyChange: (currency: string) => void;
  onExchangeRateChange: (rate: number) => void;
  onNisEquivalentChange: (nis: number) => void;
  label?: string;
  disabled?: boolean;
}

const CurrencyAmountInput = ({
  amount,
  currency,
  exchangeRate,
  nisEquivalent,
  onAmountChange,
  onCurrencyChange,
  onExchangeRateChange,
  onNisEquivalentChange,
  label = "Amount",
  disabled = false,
}: CurrencyAmountInputProps) => {

  // Recalculate NIS equivalent when amount, currency, or rate changes
  useEffect(() => {
    if (currency === "NIS" || currency === "ILS") {
      onNisEquivalentChange(amount);
      onExchangeRateChange(1);
    } else if (exchangeRate > 0) {
      onNisEquivalentChange(Math.round(amount * exchangeRate * 100) / 100);
    }
  }, [amount, currency, exchangeRate]);

  const isNIS = currency === "NIS" || currency === "ILS";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{label}</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={amount || ""}
            onChange={(e) => onAmountChange(parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            disabled={disabled}
          />
        </div>
        <div>
          <Label>Currency</Label>
          <Select value={currency} onValueChange={onCurrencyChange} disabled={disabled}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!isNIS && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Exchange Rate to NIS</Label>
            <Input
              type="number"
              step="0.001"
              min="0"
              value={exchangeRate || ""}
              onChange={(e) => onExchangeRateChange(parseFloat(e.target.value) || 0)}
              placeholder="e.g. 3.70"
              disabled={disabled}
            />
          </div>
          <div>
            <Label>NIS Equivalent</Label>
            <Input
              type="number"
              value={nisEquivalent.toFixed(2)}
              disabled
              className="bg-muted"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencyAmountInput;
