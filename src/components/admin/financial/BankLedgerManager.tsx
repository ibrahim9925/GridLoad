// @ts-nocheck
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMultiCurrencyFinancials } from "@/hooks/useMultiCurrencyFinancials";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft,
  Search,
  Filter,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";

interface CapitalSummary {
  totalAvailable: number;
  totalAllocated: number;
  utilizationRate: number;
  supplierAllocations: { supplier: string; amount: number }[];
}

export const BankLedgerManager = () => {
  const { 
    bankLedgerEntries, 
    bankAccounts, 
    isLoading, 
    refetch 
  } = useMultiCurrencyFinancials();

  const [filterType, setFilterType] = useState<string>("all");
  const [filterAccount, setFilterAccount] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<string>("30");

  // Calculate capital summary
  const calculateCapitalSummary = (): CapitalSummary => {
    const totalAvailable = bankAccounts.reduce((sum, account) => 
      sum + (account.current_balance || 0), 0
    );

    // Group supplier allocations from ledger
    const supplierAllocations = bankLedgerEntries
      .filter(entry => entry.transaction_type === 'outbound' && entry.purpose?.includes('supplier'))
      .reduce((acc, entry) => {
        const supplier = entry.purpose || 'Unknown Supplier';
        acc[supplier] = (acc[supplier] || 0) + Math.abs(entry.amount);
        return acc;
      }, {} as Record<string, number>);

    const totalAllocated = Object.values(supplierAllocations).reduce((sum, amount) => sum + amount, 0);

    return {
      totalAvailable,
      totalAllocated,
      utilizationRate: totalAvailable > 0 ? (totalAllocated / (totalAvailable + totalAllocated)) * 100 : 0,
      supplierAllocations: Object.entries(supplierAllocations).map(([supplier, amount]) => ({
        supplier,
        amount
      })).sort((a, b) => b.amount - a.amount)
    };
  };

  // Filter entries based on current filters
  const filteredEntries = bankLedgerEntries.filter(entry => {
    const matchesType = filterType === "all" || 
      (filterType === "inbound" && entry.amount > 0) ||
      (filterType === "outbound" && entry.amount < 0) ||
      (filterType === "supplier" && entry.purpose?.toLowerCase().includes("supplier"));
    
    const matchesAccount = filterAccount === "all" || entry.bank_account_id === filterAccount;
    
    const matchesSearch = searchTerm === "" || 
      entry.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const entryDate = new Date(entry.date);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(dateRange));
    const matchesDate = entryDate >= cutoffDate;

    return matchesType && matchesAccount && matchesSearch && matchesDate;
  });

  const capitalSummary = calculateCapitalSummary();

  if (isLoading) {
    return <div className="p-6">Loading bank ledger...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Capital Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Available Capital</p>
                <p className="text-lg font-bold">
                  ₪{capitalSummary.totalAvailable.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Allocated to Suppliers</p>
                <p className="text-lg font-bold">
                  ₪{capitalSummary.totalAllocated.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Utilization Rate</p>
                <p className="text-lg font-bold">
                  {capitalSummary.utilizationRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-secondary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Accounts</p>
                <p className="text-lg font-bold">{bankAccounts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="suppliers">Supplier Allocations</TabsTrigger>
            <TabsTrigger value="accounts">Account Summary</TabsTrigger>
          </TabsList>
          
          <Button onClick={refetch} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <TabsContent value="transactions" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Transaction Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="inbound">Inbound</SelectItem>
                    <SelectItem value="outbound">Outbound</SelectItem>
                    <SelectItem value="supplier">Supplier Payments</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterAccount} onValueChange={setFilterAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Bank Account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} ({account.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                  </SelectContent>
                </Select>

                <div className="text-sm text-muted-foreground">
                  {filteredEntries.length} transactions
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions List */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredEntries.slice(0, 50).map((entry) => {
                  const account = bankAccounts.find(acc => acc.id === entry.bank_account_id);
                  const isInbound = entry.amount > 0;
                  
                  return (
                    <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isInbound ? 'bg-success/10' : 'bg-destructive/10'}`}>
                          {isInbound ? 
                            <ArrowDownLeft className="h-4 w-4 text-success" /> : 
                            <ArrowUpRight className="h-4 w-4 text-destructive" />
                          }
                        </div>
                        
                        <div>
                          <p className="font-medium">{entry.purpose || entry.transaction_type}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{account?.name} ({entry.currency})</span>
                            {entry.reference_number && (
                              <>
                                <span>•</span>
                                <span>Ref: {entry.reference_number}</span>
                              </>
                            )}
                          </div>
                          {entry.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className={`font-bold ${isInbound ? 'text-success' : 'text-destructive'}`}>
                          {isInbound ? '+' : ''}₪{Math.abs(entry.amount).toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(entry.date), 'MMM dd, yyyy')}
                        </p>
                        {entry.usd_value && entry.currency !== 'USD' && (
                          <p className="text-xs text-muted-foreground">
                            ${entry.usd_value.toLocaleString()} USD
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Capital Allocations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {capitalSummary.supplierAllocations.slice(0, 20).map((allocation, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{allocation.supplier}</p>
                        <p className="text-sm text-muted-foreground">
                          {((allocation.amount / capitalSummary.totalAllocated) * 100).toFixed(1)}% of total
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">₪{allocation.amount.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankAccounts.map((account) => (
              <Card key={account.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    {account.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Balance</p>
                      <p className="text-2xl font-bold">
                        {account.currency === 'USD' ? '$' : '₪'}{(account.current_balance || 0).toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span>Currency:</span>
                      <Badge>{account.currency}</Badge>
                    </div>
                    
                    {account.bank_name && (
                      <div className="flex items-center justify-between text-sm">
                        <span>Bank:</span>
                        <span>{account.bank_name}</span>
                      </div>
                    )}
                    
                    {account.account_number && (
                      <div className="flex items-center justify-between text-sm">
                        <span>Account:</span>
                        <span>***{account.account_number.slice(-4)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};