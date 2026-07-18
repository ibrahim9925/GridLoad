// @ts-nocheck
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, DollarSign, Banknote } from "lucide-react";
import { useForm } from "react-hook-form";
import { useMultiCurrencyFinancials } from "@/hooks/useMultiCurrencyFinancials";

interface BankAccountFormData {
  name: string;
  currency: 'USD' | 'NIS';
  account_number?: string;
  bank_name?: string;
  opening_balance: number;
}

export const BankAccountsManager = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { bankAccounts, isLoading, createBankAccount } = useMultiCurrencyFinancials();

  const form = useForm<BankAccountFormData>({
    defaultValues: {
      name: "",
      currency: "NIS",
      account_number: "",
      bank_name: "",
      opening_balance: 0
    }
  });

  const onSubmit = async (data: BankAccountFormData) => {
    try {
      await createBankAccount({
        ...data,
        current_balance: data.opening_balance
      });
      form.reset();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error creating bank account:', error);
    }
  };

  const getCurrencyIcon = (currency: string) => {
    return currency === 'USD' ? <DollarSign className="h-4 w-4" /> : <Banknote className="h-4 w-4" />;
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'ILS'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Bank Accounts</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Bank Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Bank Account</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  rules={{ required: "Account name is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., USD Main Account" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="currency"
                  rules={{ required: "Currency is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="NIS">NIS - Israeli Shekel</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                  <FormField
                  control={form.control}
                  name="bank_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select bank or enter custom" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Bank Hapoalim">Bank Hapoalim</SelectItem>
                          <SelectItem value="Bank Leumi">Bank Leumi</SelectItem>
                          <SelectItem value="Discount Bank">Discount Bank</SelectItem>
                          <SelectItem value="First International Bank">First International Bank</SelectItem>
                          <SelectItem value="Mizrahi Tefahot Bank">Mizrahi Tefahot Bank</SelectItem>
                          <SelectItem value="Quds Bank Dollar">Quds Bank (USD)</SelectItem>
                          <SelectItem value="Quds Bank Shekel">Quds Bank (NIS)</SelectItem>
                          <SelectItem value="Bank of Palestine">Bank of Palestine</SelectItem>
                          <SelectItem value="Cairo Amman Bank">Cairo Amman Bank</SelectItem>
                          <SelectItem value="custom">Custom Bank Name</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="account_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Account number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="opening_balance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opening Balance</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="0.00" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Creating..." : "Create Account"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bankAccounts.map((account) => (
          <Card key={account.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
              <div className="flex items-center space-x-2">
                {getCurrencyIcon(account.currency)}
                <Badge variant="outline">{account.currency}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Current Balance</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(account.current_balance, account.currency)}
                  </p>
                </div>
                {account.bank_name && (
                  <div>
                    <p className="text-xs text-muted-foreground">Bank</p>
                    <p className="text-sm">{account.bank_name}</p>
                  </div>
                )}
                {account.account_number && (
                  <div>
                    <p className="text-xs text-muted-foreground">Account Number</p>
                    <p className="text-sm font-mono">{account.account_number}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {bankAccounts.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Banknote className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No bank accounts yet</p>
            <p className="text-sm text-muted-foreground mb-4">Create your first bank account to start managing finances</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Bank Account
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};