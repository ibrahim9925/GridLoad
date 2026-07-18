import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BankLedgerManager } from "@/components/admin/financial/BankLedgerManager";
import { EnhancedBankAccountsManager } from "@/components/admin/financial/EnhancedBankAccountsManager";
import { ReconciliationQueue } from "@/components/admin/financial/ReconciliationQueue";
import { BankAccountsOverview } from "@/components/admin/financial/BankAccountsOverview";
import ChecksPanel from "@/components/admin/financial/ChecksPanel";
import { Link } from "react-router-dom";
import { Wallet } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMultiCurrencyFinancials } from "@/hooks/useMultiCurrencyFinancials";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  ArrowUpDown,
  Building2,
  CreditCard,
  Send,
  Banknote,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

const Banking = () => {
  const { bankAccounts, createBankLedgerEntry, refetch, currencyRates, fetchExchangeRate } = useMultiCurrencyFinancials();
  const { toast } = useToast();
  
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isFxTransferDialogOpen, setIsFxTransferDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [selectedAccountsForDelete, setSelectedAccountsForDelete] = useState<string[]>([]);
  const [reconciliationCount, setReconciliationCount] = useState(0);
  const [transactionForm, setTransactionForm] = useState({
    bank_account_id: "",
    transaction_type: "",
    amount: "",
    currency: "NIS",
    purpose: "",
    reference_number: "",
    notes: ""
  });

  const [fxTransferForm, setFxTransferForm] = useState({
    from_account_id: "",
    to_account_id: "",
    from_amount: "",
    exchange_rate: "",
    purpose: "Currency exchange transfer",
    reference_number: "",
    notes: ""
  });

  const handleCreateTransaction = async () => {
    try {
      const amount = parseFloat(transactionForm.amount);
      if (isNaN(amount) || amount === 0) {
        toast({
          title: "Invalid Amount",
          description: "Please enter a valid amount",
          variant: "destructive"
        });
        return;
      }

      const adjustedAmount = transactionForm.transaction_type === 'outbound' ? -Math.abs(amount) : Math.abs(amount);
      
      await createBankLedgerEntry({
        bank_account_id: transactionForm.bank_account_id,
        transaction_type: transactionForm.transaction_type,
        amount: adjustedAmount,
        currency: transactionForm.currency,
        purpose: transactionForm.purpose,
        reference_number: transactionForm.reference_number || undefined,
        notes: transactionForm.notes || undefined
      });

      toast({
        title: "Transaction Created",
        description: "Bank transaction has been recorded successfully"
      });

      setIsTransactionDialogOpen(false);
      setTransactionForm({
        bank_account_id: "",
        transaction_type: "",
        amount: "",
        currency: "NIS",
        purpose: "",
        reference_number: "",
        notes: ""
      });
      
      refetch();
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast({
        title: "Error",
        description: "Failed to create transaction",
        variant: "destructive"
      });
    }
  };

  const handleFxTransfer = async () => {
    try {
      const fromAmount = parseFloat(fxTransferForm.from_amount);
      const exchangeRate = parseFloat(fxTransferForm.exchange_rate);
      
      if (isNaN(fromAmount) || isNaN(exchangeRate) || fromAmount <= 0 || exchangeRate <= 0) {
        toast({
          title: "Invalid Input",
          description: "Please enter valid amounts and exchange rate",
          variant: "destructive"
        });
        return;
      }

      const fromAccount = bankAccounts.find(acc => acc.id === fxTransferForm.from_account_id);
      const toAccount = bankAccounts.find(acc => acc.id === fxTransferForm.to_account_id);
      
      if (!fromAccount || !toAccount) {
        toast({
          title: "Invalid Accounts",
          description: "Please select valid source and destination accounts",
          variant: "destructive"
        });
        return;
      }

      const toAmount = fromAmount * exchangeRate;
      
      // Create outbound transaction from source account
      await createBankLedgerEntry({
        bank_account_id: fxTransferForm.from_account_id,
        transaction_type: 'transfer',
        amount: -Math.abs(fromAmount),
        currency: fromAccount.currency,
        purpose: `${fxTransferForm.purpose} to ${toAccount.name}`,
        reference_number: fxTransferForm.reference_number || `FX-${Date.now()}`,
        notes: `FX Transfer: Rate ${exchangeRate} ${fromAccount.currency}/${toAccount.currency}`,
        exchange_rate: exchangeRate
      });

      // Create inbound transaction to destination account
      await createBankLedgerEntry({
        bank_account_id: fxTransferForm.to_account_id,
        transaction_type: 'transfer',
        amount: Math.abs(toAmount),
        currency: toAccount.currency,
        purpose: `${fxTransferForm.purpose} from ${fromAccount.name}`,
        reference_number: fxTransferForm.reference_number || `FX-${Date.now()}`,
        notes: `FX Transfer: Rate ${exchangeRate} ${fromAccount.currency}/${toAccount.currency}`,
        exchange_rate: 1/exchangeRate
      });

      toast({
        title: "FX Transfer Completed",
        description: `Transferred ${fromAmount} ${fromAccount.currency} → ${toAmount.toFixed(2)} ${toAccount.currency}`
      });

      setIsFxTransferDialogOpen(false);
      setFxTransferForm({
        from_account_id: "",
        to_account_id: "",
        from_amount: "",
        exchange_rate: "",
        purpose: "Currency exchange transfer",
        reference_number: "",
        notes: ""
      });
      
      refetch();
    } catch (error) {
      console.error('Error creating FX transfer:', error);
      toast({
        title: "Error",
        description: "Failed to process FX transfer",
        variant: "destructive"
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      if (selectedAccountsForDelete.length === 0) {
        toast({
          title: "No Accounts Selected",
          description: "Please select test accounts to delete",
          variant: "destructive"
        });
        return;
      }

      // Call the bulk delete function (signature is dynamic — bypass strict typing)
      const { data, error } = await (supabase.rpc as any)('bulk_delete_test_accounts', {
        account_ids: selectedAccountsForDelete
      });

      if (error) throw error;

      toast({
        title: "Test Accounts Cleaned",
        description: `Successfully deactivated ${data} test accounts`
      });

      setIsBulkDeleteDialogOpen(false);
      setSelectedAccountsForDelete([]);
      refetch();
    } catch (error) {
      console.error('Error bulk deleting accounts:', error);
      toast({
        title: "Error",
        description: "Failed to delete accounts",
        variant: "destructive"
      });
    }
  };

  // Auto-populate exchange rate when accounts are selected
  React.useEffect(() => {
    const fromAccount = bankAccounts.find(acc => acc.id === fxTransferForm.from_account_id);
    const toAccount = bankAccounts.find(acc => acc.id === fxTransferForm.to_account_id);
    
    if (fromAccount && toAccount && fromAccount.currency !== toAccount.currency) {
      // Auto-populate common exchange rates
      const rates: Record<string, number> = {
        'USD_NIS': 3.7,
        'NIS_USD': 0.27,
        'EUR_NIS': 4.1,
        'NIS_EUR': 0.24,
        'USD_EUR': 0.85,
        'EUR_USD': 1.18
      };
      
      const rateKey = `${fromAccount.currency}_${toAccount.currency}`;
      if (rates[rateKey]) {
        setFxTransferForm(prev => ({ ...prev, exchange_rate: rates[rateKey].toString() }));
      }
    }
  }, [fxTransferForm.from_account_id, fxTransferForm.to_account_id, bankAccounts]);

  return (
    <div className="pb-28">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border shadow-[0_1px_0_0_hsl(var(--primary))]">
        <div className="flex items-center justify-between gap-2 px-3 py-2 min-h-[56px]">
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">Banking & Finance</h1>
            <p className="text-[11px] text-muted-foreground truncate">Multi-bank, multi-currency ledger</p>
          </div>
          <Button variant="ghost" size="icon" onClick={refetch} aria-label="Refresh" className="h-10 w-10">
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-3 space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap [&_button]:w-full sm:[&_button]:w-auto">


          <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Record Bank Transaction</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bank_account">Bank Account</Label>
                  <Select value={transactionForm.bank_account_id} onValueChange={(value) => 
                    setTransactionForm(prev => ({ ...prev, bank_account_id: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({account.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="transaction_type">Type</Label>
                    <Select value={transactionForm.transaction_type} onValueChange={(value) => 
                      setTransactionForm(prev => ({ ...prev, transaction_type: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Transaction type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inbound">
                          <div className="flex items-center gap-2">
                            <ArrowUpDown className="h-4 w-4 text-success" />
                            Deposit/Income
                          </div>
                        </SelectItem>
                        <SelectItem value="outbound">
                          <div className="flex items-center gap-2">
                            <Send className="h-4 w-4 text-destructive" />
                            Payment/Expense
                          </div>
                        </SelectItem>
                        <SelectItem value="transfer">
                          <div className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 text-primary" />
                            Transfer
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={transactionForm.currency} onValueChange={(value) => 
                      setTransactionForm(prev => ({ ...prev, currency: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NIS">₪ NIS</SelectItem>
                        <SelectItem value="USD">$ USD</SelectItem>
                        <SelectItem value="EUR">€ EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={transactionForm.amount}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose</Label>
                  <Input
                    id="purpose"
                    placeholder="e.g., Supplier payment, Customer deposit"
                    value={transactionForm.purpose}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, purpose: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference_number">Reference Number (Optional)</Label>
                  <Input
                    id="reference_number"
                    placeholder="Transaction reference"
                    value={transactionForm.reference_number}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, reference_number: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional details about this transaction"
                    rows={3}
                    value={transactionForm.notes}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>

                <Button 
                  onClick={handleCreateTransaction} 
                  className="w-full"
                  disabled={!transactionForm.bank_account_id || !transactionForm.transaction_type || !transactionForm.amount || !transactionForm.purpose}
                >
                  Record Transaction
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isFxTransferDialogOpen} onOpenChange={setIsFxTransferDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                FX Transfer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Foreign Exchange Transfer</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="from_account">From Account</Label>
                    <Select value={fxTransferForm.from_account_id} onValueChange={(value) => 
                      setFxTransferForm(prev => ({ ...prev, from_account_id: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Source account" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} ({account.currency})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="to_account">To Account</Label>
                    <Select value={fxTransferForm.to_account_id} onValueChange={(value) => 
                      setFxTransferForm(prev => ({ ...prev, to_account_id: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Destination account" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.filter(acc => acc.id !== fxTransferForm.from_account_id).map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} ({account.currency})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="from_amount">Amount</Label>
                    <Input
                      id="from_amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={fxTransferForm.from_amount}
                      onChange={(e) => setFxTransferForm(prev => ({ ...prev, from_amount: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="exchange_rate">Exchange Rate</Label>
                    <Input
                      id="exchange_rate"
                      type="number"
                      step="0.0001"
                      placeholder="e.g., 3.7"
                      value={fxTransferForm.exchange_rate}
                      onChange={(e) => setFxTransferForm(prev => ({ ...prev, exchange_rate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fx_reference">Reference Number (Optional)</Label>
                  <Input
                    id="fx_reference"
                    placeholder="FX transaction reference"
                    value={fxTransferForm.reference_number}
                    onChange={(e) => setFxTransferForm(prev => ({ ...prev, reference_number: e.target.value }))}
                  />
                </div>

                <Button 
                  onClick={handleFxTransfer} 
                  className="w-full"
                  disabled={!fxTransferForm.from_account_id || !fxTransferForm.to_account_id || !fxTransferForm.from_amount || !fxTransferForm.exchange_rate}
                >
                  Execute FX Transfer
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Clean Test Data removed for production */}


        </div>


      {/* Multi-bank grouped overview */}
      <BankAccountsOverview />

      {reconciliationCount > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Action required</AlertTitle>
          <AlertDescription>
            {reconciliationCount} payment{reconciliationCount === 1 ? "" : "s"} need reconciliation.
            Assign a bank account in the Reconciliation Queue below to update balances.
          </AlertDescription>
        </Alert>
      )}


      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => {
          setTransactionForm(prev => ({ ...prev, transaction_type: 'inbound' }));
          setIsTransactionDialogOpen(true);
        }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-full">
                <Banknote className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="font-medium">Record Deposit</p>
                <p className="text-sm text-muted-foreground">Customer payment</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => {
          setTransactionForm(prev => ({ ...prev, transaction_type: 'outbound', purpose: 'supplier payment' }));
          setIsTransactionDialogOpen(true);
        }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-full">
                <Send className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="font-medium">Supplier Payment</p>
                <p className="text-sm text-muted-foreground">Pay suppliers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => {
          setTransactionForm(prev => ({ ...prev, transaction_type: 'transfer' }));
          setIsTransactionDialogOpen(true);
        }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <ArrowUpDown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Transfer Funds</p>
                <p className="text-sm text-muted-foreground">Between accounts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => {
          setTransactionForm(prev => ({ ...prev, transaction_type: 'outbound', purpose: 'business expense' }));
          setIsTransactionDialogOpen(true);
        }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-full">
                <CreditCard className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="font-medium">Record Expense</p>
                <p className="text-sm text-muted-foreground">Business expenses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

        {/* Bank Accounts Management */}
        <EnhancedBankAccountsManager />

        {/* Pending Checks */}
        <ChecksPanel />

        {/* Reconciliation Queue */}
        <ReconciliationQueue onCountChange={setReconciliationCount} />

        {/* Bank Ledger Manager */}
        <BankLedgerManager />
      </div>

      {/* Fixed bottom action bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur border-t p-3 flex gap-2">
        <Button
          onClick={() => setIsFxTransferDialogOpen(true)}
          className="flex-1 h-12 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <ArrowUpDown className="h-5 w-5 mr-2" />Internal Transfer
        </Button>
        <Button asChild variant="outline" className="flex-1 h-12">
          <Link to="/admin/banking/cash-bundles">
            <Wallet className="h-5 w-5 mr-2" />Cash Bundles
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default Banking;