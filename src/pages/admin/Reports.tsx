// @ts-nocheck

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, FileText, PieChart, TrendingUp, Download, RefreshCw } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useRealTimeData } from '@/hooks/useRealTimeData';
import { exportToCSV, formatCurrency, formatDate } from '@/utils/dataExport';

interface ReportData {
  totalSales: number;
  totalExpenses: number;
  totalCustomers: number;
  totalProducts: number;
  salesGrowth: number;
  expenseGrowth: number;
}

const Reports = () => {
  const [reportData, setReportData] = useState<ReportData>({
    totalSales: 0,
    totalExpenses: 0,
    totalCustomers: 0,
    totalProducts: 0,
    salesGrowth: 0,
    expenseGrowth: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch sales data
      const { data: sales } = await supabase
        .from('sales')
        .select('total_amount, created_at');
      
      // Fetch expenses data
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount, created_at');
      
      // Fetch customers count
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });
      
      // Fetch products count
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      const totalSales = sales?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
      const totalExpenses = expenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;

      // Calculate growth (simplified - comparing this month vs last month)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const currentMonthSales = sales?.filter(sale => {
        const saleDate = new Date(sale.created_at);
        return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
      }).reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;

      const lastMonthSales = sales?.filter(sale => {
        const saleDate = new Date(sale.created_at);
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return saleDate.getMonth() === lastMonth && saleDate.getFullYear() === lastMonthYear;
      }).reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;

      const salesGrowth = lastMonthSales > 0 ? ((currentMonthSales - lastMonthSales) / lastMonthSales) * 100 : 0;

      setReportData({
        totalSales,
        totalExpenses,
        totalCustomers: customersCount || 0,
        totalProducts: productsCount || 0,
        salesGrowth,
        expenseGrowth: 0 // Simplified for now
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  // Real-time updates
  useRealTimeData({
    table: 'sales',
    onInsert: fetchReportData,
    onUpdate: fetchReportData,
    onDelete: fetchReportData,
  });

  useRealTimeData({
    table: 'expenses',
    onInsert: fetchReportData,
    onUpdate: fetchReportData,
    onDelete: fetchReportData,
  });

  const handleExportSalesReport = async () => {
    try {
      const { data: sales } = await supabase
        .from('sales')
        .select(`
          *,
          customers(contact_person, company_name),
          staff(full_name)
        `)
        .order('created_at', { ascending: false });

      if (sales) {
        const exportColumns = [
          { key: 'sale_date', label: 'Date', formatter: formatDate },
          { key: 'customers.contact_person', label: 'Customer' },
          { key: 'customers.company_name', label: 'Company' },
          { key: 'total_amount', label: 'Amount', formatter: formatCurrency },
          { key: 'payment_status', label: 'Payment Status' },
          { key: 'staff.full_name', label: 'Sales Rep' },
        ];

        exportToCSV(sales, exportColumns, `sales-report-${new Date().toISOString().split('T')[0]}`);
      }
    } catch (error) {
      console.error('Error exporting sales report:', error);
    }
  };

  const handleExportExpensesReport = async () => {
    try {
      const { data: expenses } = await supabase
        .from('expenses')
        .select(`
          *,
          staff(full_name)
        `)
        .order('expense_date', { ascending: false });

      if (expenses) {
        const exportColumns = [
          { key: 'expense_date', label: 'Date', formatter: formatDate },
          { key: 'description', label: 'Description' },
          { key: 'category', label: 'Category' },
          { key: 'amount', label: 'Amount', formatter: formatCurrency },
          { key: 'staff.full_name', label: 'Assigned To' },
        ];

        exportToCSV(expenses, exportColumns, `expenses-report-${new Date().toISOString().split('T')[0]}`);
      }
    } catch (error) {
      console.error('Error exporting expenses report:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading reports...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Reports</h1>
        <div className="flex gap-2">
          <Button asChild variant="default" size="sm">
            <a href="/admin/reports/reconciliation">Monthly Reconciliation</a>
          </Button>
          <Button onClick={fetchReportData} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(reportData.totalSales)}</div>
            <p className="text-xs text-muted-foreground">
              {reportData.salesGrowth >= 0 ? '+' : ''}{reportData.salesGrowth.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(reportData.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              Business expenses tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              Active customer base
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Products in inventory
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Sales Reports</CardTitle>
            <Button onClick={handleExportSalesReport} size="sm" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Comprehensive sales analysis including customer details, amounts, and payment status.
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-lg font-semibold">Net Revenue: {formatCurrency(reportData.totalSales - reportData.totalExpenses)}</div>
                <div className="text-sm text-muted-foreground">
                  Revenue after expenses
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Expense Reports</CardTitle>
            <Button onClick={handleExportExpensesReport} size="sm" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Detailed expense tracking with categories, assignments, and receipt management.
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-lg font-semibold">Expense Ratio: {reportData.totalSales > 0 ? ((reportData.totalExpenses / reportData.totalSales) * 100).toFixed(1) : 0}%</div>
                <div className="text-sm text-muted-foreground">
                  Expenses as percentage of sales
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
