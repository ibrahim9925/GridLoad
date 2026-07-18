// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Save, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const CURRENCY_PAIRS = [
  { from: "USD", to: "NIS", label: "USD → NIS" },
  { from: "JOD", to: "NIS", label: "JOD → NIS" },
  { from: "EUR", to: "NIS", label: "EUR → NIS" },
];

const ExchangeRatesManager = () => {
  const { toast } = useToast();
  const [rates, setRates] = useState<any[]>([]);
  const [newRate, setNewRate] = useState({ from_currency: "USD", to_currency: "NIS", rate: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchRates(); }, []);

  const fetchRates = async () => {
    const { data } = await supabase
      .from("currency_rates")
      .select("*")
      .order("effective_date", { ascending: false })
      .limit(20);
    setRates(data || []);
  };

  const addRate = async () => {
    if (!newRate.rate || parseFloat(newRate.rate) <= 0) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("currency_rates").insert({
        from_currency: newRate.from_currency,
        to_currency: newRate.to_currency,
        rate: parseFloat(newRate.rate),
        effective_date: new Date().toISOString().split("T")[0],
      });
      if (error) throw error;
      setNewRate({ ...newRate, rate: "" });
      fetchRates();
      toast({ title: "Exchange rate saved" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Exchange Rates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 items-end">
          <div>
            <Label>Currency Pair</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={`${newRate.from_currency}_${newRate.to_currency}`}
              onChange={(e) => {
                const [from, to] = e.target.value.split("_");
                setNewRate({ ...newRate, from_currency: from, to_currency: to });
              }}
            >
              {CURRENCY_PAIRS.map((p) => (
                <option key={p.label} value={`${p.from}_${p.to}`}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Rate</Label>
            <Input
              type="number"
              step="0.001"
              placeholder="e.g. 3.70"
              value={newRate.rate}
              onChange={(e) => setNewRate({ ...newRate, rate: e.target.value })}
            />
          </div>
          <Button onClick={addRate} disabled={loading}>
            <Plus className="mr-1 h-4 w-4" /> Add Rate
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pair</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Effective Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.from_currency} → {r.to_currency}</TableCell>
                <TableCell>{r.rate}</TableCell>
                <TableCell>{r.effective_date}</TableCell>
              </TableRow>
            ))}
            {rates.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">No rates set yet</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ExchangeRatesManager;
