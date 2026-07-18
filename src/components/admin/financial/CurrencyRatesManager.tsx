// @ts-nocheck
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Plus, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { useMultiCurrencyFinancials } from "@/hooks/useMultiCurrencyFinancials";
import { format } from "date-fns";

interface CurrencyRateFormData {
  from_currency: 'USD' | 'NIS';
  to_currency: 'USD' | 'NIS';
  rate: number;
  date: string;
}

export const CurrencyRatesManager = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { currencyRates, isLoading, updateCurrencyRate, refetch } = useMultiCurrencyFinancials();

  const form = useForm<CurrencyRateFormData>({
    defaultValues: {
      from_currency: "USD",
      to_currency: "NIS",
      rate: 3.70,
      date: new Date().toISOString().split('T')[0]
    }
  });

  const onSubmit = async (data: CurrencyRateFormData) => {
    try {
      await updateCurrencyRate(data.from_currency, data.to_currency, data.rate, data.date);
      form.reset();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error updating currency rate:', error);
    }
  };

  // Get the latest rates for quick display
  const latestUsdToNis = currencyRates.find(r => r.from_currency === 'USD' && r.to_currency === 'NIS');
  const latestNisToUsd = currencyRates.find(r => r.from_currency === 'NIS' && r.to_currency === 'USD');

  // Group rates by currency pair
  const ratesPairs = currencyRates.reduce((acc, rate) => {
    const pair = `${rate.from_currency}-${rate.to_currency}`;
    if (!acc[pair]) acc[pair] = [];
    acc[pair].push(rate);
    return acc;
  }, {} as Record<string, typeof currencyRates>);

  const getRateTrend = (rates: typeof currencyRates) => {
    if (rates.length < 2) return null;
    const current = rates[0].rate;
    const previous = rates[1].rate;
    const trend = current > previous ? 'up' : current < previous ? 'down' : 'stable';
    const change = ((current - previous) / previous * 100).toFixed(2);
    return { trend, change: Math.abs(parseFloat(change)) };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Currency Exchange Rates</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Update Rate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Exchange Rate</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="from_currency"
                      rules={{ required: "From currency is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="NIS">NIS</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="to_currency"
                      rules={{ required: "To currency is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>To</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="NIS">NIS</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="rate"
                    rules={{ 
                      required: "Rate is required",
                      min: { value: 0.01, message: "Rate must be greater than 0" }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exchange Rate</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.000001"
                            placeholder="3.70" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="date"
                    rules={{ required: "Date is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
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
                      {isLoading ? "Updating..." : "Update Rate"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Current Rates Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">USD → NIS</CardTitle>
            <Badge variant="outline">Current Rate</Badge>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold">
                {latestUsdToNis?.rate.toFixed(4) || 'N/A'}
              </span>
              {latestUsdToNis && ratesPairs['USD-NIS'] && (() => {
                const trend = getRateTrend(ratesPairs['USD-NIS']);
                return trend && (
                  <div className="flex items-center space-x-1">
                    {trend.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : trend.trend === 'down' ? (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    ) : null}
                    <span className={`text-sm ${
                      trend.trend === 'up' ? 'text-green-500' : 
                      trend.trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
                    }`}>
                      {trend.change}%
                    </span>
                  </div>
                );
              })()}
            </div>
            {latestUsdToNis && (
              <p className="text-xs text-muted-foreground mt-1">
                Updated {format(new Date(latestUsdToNis.date), 'MMM d, yyyy')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NIS → USD</CardTitle>
            <Badge variant="outline">Current Rate</Badge>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold">
                {latestNisToUsd?.rate.toFixed(4) || 'N/A'}
              </span>
              {latestNisToUsd && ratesPairs['NIS-USD'] && (() => {
                const trend = getRateTrend(ratesPairs['NIS-USD']);
                return trend && (
                  <div className="flex items-center space-x-1">
                    {trend.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : trend.trend === 'down' ? (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    ) : null}
                    <span className={`text-sm ${
                      trend.trend === 'up' ? 'text-green-500' : 
                      trend.trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
                    }`}>
                      {trend.change}%
                    </span>
                  </div>
                );
              })()}
            </div>
            {latestNisToUsd && (
              <p className="text-xs text-muted-foreground mt-1">
                Updated {format(new Date(latestNisToUsd.date), 'MMM d, yyyy')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historical Rates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historical Exchange Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currencyRates.slice(0, 20).map((rate) => {
                const pairRates = ratesPairs[`${rate.from_currency}-${rate.to_currency}`];
                const rateIndex = pairRates?.findIndex(r => r.id === rate.id) || 0;
                const trend = rateIndex < pairRates?.length - 1 ? getRateTrend(pairRates.slice(rateIndex)) : null;
                
                return (
                  <TableRow key={rate.id}>
                    <TableCell>{format(new Date(rate.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{rate.from_currency}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{rate.to_currency}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{rate.rate.toFixed(6)}</TableCell>
                    <TableCell className="text-right">
                      {trend && (
                        <div className="flex items-center justify-end space-x-1">
                          {trend.trend === 'up' ? (
                            <TrendingUp className="h-3 w-3 text-green-500" />
                          ) : trend.trend === 'down' ? (
                            <TrendingDown className="h-3 w-3 text-red-500" />
                          ) : null}
                          <span className={`text-xs ${
                            trend.trend === 'up' ? 'text-green-500' : 
                            trend.trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
                          }`}>
                            {trend.change}%
                          </span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};