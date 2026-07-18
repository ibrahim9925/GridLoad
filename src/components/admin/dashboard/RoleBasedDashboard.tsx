// @ts-nocheck
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardStats from "./DashboardStats";
import RecentActivityCard from "./RecentActivityCard";
import ProductCategoriesCard from "./ProductCategoriesCard";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Package, Users, AlertTriangle, FileText } from "lucide-react";
import PaymentScheduleOverview from "./PaymentScheduleOverview";

const RoleBasedDashboard = () => {
  const { user, userRole, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSkeleton type="dashboard" />;
  }

  const renderAdminDashboard = () => (
    <div className="space-y-6">
      <DashboardStats />
      <PaymentScheduleOverview />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivityCard />
        <ProductCategoriesCard />
      </div>
    </div>
  );

  const renderAccountantDashboard = () => {
    const stats = { totalPending: 0, totalOverdue: 0, totalCollected: 0, isLoading: false, totalRevenue: 0, collectionRate: 0, outstandingPayments: 0, outstandingCount: 0, commissionsDue: 0, commissionCount: 0, collectedThisMonth: 0, overduePayments: 0 };
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.isLoading ? "..." : stats.totalRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.collectionRate.toFixed(1)}% collection rate
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Payments</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.isLoading ? "..." : stats.outstandingPayments.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.outstandingCount} pending payments
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commissions Due</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.isLoading ? "..." : stats.commissionsDue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.commissionCount} pending commissions
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collected This Month</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.isLoading ? "..." : stats.collectedThisMonth.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                ${stats.overduePayments.toLocaleString()} overdue
              </p>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Financial Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Quick access to financial reports, payment collections, and commission tracking.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderWarehouseDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">248</div>
            <p className="text-xs text-muted-foreground">Active products</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">12</div>
            <p className="text-xs text-muted-foreground">Need restocking</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Installations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$89,420</div>
            <p className="text-xs text-muted-foreground">Current inventory</p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Warehouse Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Manage inventory, track stock movements, and oversee installation schedules.
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const renderSalesRepDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Sales This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$42,350</div>
            <p className="text-xs text-muted-foreground">+18% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2,118</div>
            <p className="text-xs text-muted-foreground">5% commission rate</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15</div>
            <p className="text-xs text-muted-foreground">3 hot prospects</p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Sales Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Track your sales performance, manage leads, and view commission details.
          </p>
        </CardContent>
      </Card>
    </div>
  );

  switch (userRole) {
    case 'accountant':
      return renderAccountantDashboard();
    case 'warehouse':
      return renderWarehouseDashboard();
    case 'sales_rep':
      return renderSalesRepDashboard();
    case 'installer':
      return renderSalesRepDashboard(); // Similar to sales rep for now
    case 'admin':
    default:
      return renderAdminDashboard();
  }
};

export default RoleBasedDashboard;
