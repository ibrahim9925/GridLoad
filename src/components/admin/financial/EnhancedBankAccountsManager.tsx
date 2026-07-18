// @ts-nocheck
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, DollarSign, Banknote, Edit, Trash2, Building2 } from "lucide-react";
import { useMultiCurrencyFinancials } from "@/hooks/useMultiCurrencyFinancials";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BankAccountFormData {
  name: string;
  currency: 'USD' | 'NIS' | 'EUR';
  account_number?: string;
  bank_name?: string;
  opening_balance: number;
}

export const EnhancedBankAccountsManager = () => {
  const { bankAccounts, isLoading, createBankAccount, refetch } = useMultiCurrencyFinancials();
  const { toast } = useToast();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  
  const [createForm, setCreateForm] = useState<BankAccountFormData>({
    name: "",
    currency: "NIS",
    account_number: "",
    bank_name: "",
    opening_balance: 0
  });

  const [editForm, setEditForm] = useState<BankAccountFormData>({
    name: "",
    currency: "NIS",
    account_number: "",
    bank_name: "",
    opening_balance: 0
  });

  const handleCreate = async () => {
    try {
      await createBankAccount({
        ...createForm,
        current_balance: createForm.opening_balance
      });
      
      toast({
        title: "Account Created",
        description: `${createForm.name} has been created successfully`
      });
      
      setCreateForm({
        name: "",
        currency: "NIS",
        account_number: "",
        bank_name: "",
        opening_balance: 0
      });
      setIsCreateDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Error creating bank account:', error);
      toast({
        title: "Error", 
        description: "Failed to create bank account",
        variant: "destructive"
      });
    }
  };

  const handleEdit = async () => {
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .update({
          name: editForm.name,
          bank_name: editForm.bank_name,
          account_number: editForm.account_number,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingAccount.id);

      if (error) throw error;

      toast({
        title: "Account Updated",
        description: `${editForm.name} has been updated successfully`
      });
      
      setIsEditDialogOpen(false);
      setEditingAccount(null);
      refetch();
    } catch (error) {
      console.error('Error updating bank account:', error);
      toast({
        title: "Error",
        description: "Failed to update bank account", 
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (accountId: string, accountName: string) => {
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .update({ is_active: false })
        .eq('id', accountId);

      if (error) throw error;

      toast({
        title: "Account Deactivated",
        description: `${accountName} has been deactivated`
      });
      
      refetch();
    } catch (error) {
      console.error('Error deactivating bank account:', error);
      toast({
        title: "Error",
        description: "Failed to deactivate bank account",
        variant: "destructive"
      });
    }
  };

  const startEdit = (account: any) => {
    setEditingAccount(account);
    setEditForm({
      name: account.name,
      currency: account.currency,
      account_number: account.account_number || "",
      bank_name: account.bank_name || "",
      opening_balance: account.opening_balance || 0
    });
    setIsEditDialogOpen(true);
  };

  const getCurrencyIcon = (currency: string) => {
    return currency === 'USD' ? <DollarSign className="h-4 w-4" /> : <Banknote className="h-4 w-4" />;
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : currency === 'EUR' ? 'EUR' : 'ILS'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Bank Accounts Management</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Account Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Quds Bank USD Main"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={createForm.currency} onValueChange={(value: any) => 
                    setCreateForm(prev => ({ ...prev, currency: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="NIS">NIS - Israeli Shekel</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="opening_balance">Opening Balance</Label>
                  <Input
                    id="opening_balance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={createForm.opening_balance}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, opening_balance: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Select value={createForm.bank_name} onValueChange={(value) => 
                  setCreateForm(prev => ({ ...prev, bank_name: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank Hapoalim">Bank Hapoalim</SelectItem>
                    <SelectItem value="Bank Leumi">Bank Leumi</SelectItem>
                    <SelectItem value="Discount Bank">Discount Bank</SelectItem>
                    <SelectItem value="Mizrahi Tefahot Bank">Mizrahi Tefahot Bank</SelectItem>
                    <SelectItem value="Quds Bank">Quds Bank</SelectItem>
                    <SelectItem value="Bank of Palestine">Bank of Palestine</SelectItem>
                    <SelectItem value="Cairo Amman Bank">Cairo Amman Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number</Label>
                <Input
                  id="account_number"
                  placeholder="Account number"
                  value={createForm.account_number}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, account_number: e.target.value }))}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isLoading || !createForm.name}>
                  {isLoading ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bankAccounts.filter(acc => acc.is_active).map((account) => (
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
                
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(account)}
                    className="flex-1"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="flex-1">
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Deactivate Account</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to deactivate "{account.name}"? This will hide it from active accounts but preserve transaction history.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(account.id, account.name)}>
                          Deactivate
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bank Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_name">Account Name</Label>
              <Input
                id="edit_name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_bank_name">Bank Name</Label>
              <Select value={editForm.bank_name} onValueChange={(value) => 
                setEditForm(prev => ({ ...prev, bank_name: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank Hapoalim">Bank Hapoalim</SelectItem>
                  <SelectItem value="Bank Leumi">Bank Leumi</SelectItem>
                  <SelectItem value="Discount Bank">Discount Bank</SelectItem>
                  <SelectItem value="Mizrahi Tefahot Bank">Mizrahi Tefahot Bank</SelectItem>
                  <SelectItem value="Quds Bank">Quds Bank</SelectItem>
                  <SelectItem value="Bank of Palestine">Bank of Palestine</SelectItem>
                  <SelectItem value="Cairo Amman Bank">Cairo Amman Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_account_number">Account Number</Label>
              <Input
                id="edit_account_number"
                value={editForm.account_number}
                onChange={(e) => setEditForm(prev => ({ ...prev, account_number: e.target.value }))}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={isLoading || !editForm.name}>
                Update Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {bankAccounts.filter(acc => acc.is_active).length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No active bank accounts</p>
            <p className="text-sm text-muted-foreground mb-4">Create your first bank account to start managing finances</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Bank Account
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};