// @ts-nocheck
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, DollarSign, Package, Users, FileText, Wrench, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SalesDialog from './SalesDialog';
import CustomerDialog from './CustomerDialog';
import ProductDialog from './ProductDialog';
import { useToast } from '@/hooks/use-toast';
import { useEnhancedSalesInventoryIntegration } from '@/hooks/useEnhancedSalesInventoryIntegration';

const QuickActionPanel = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [salesDialogOpen, setSalesDialogOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const { createCompleteSale } = useEnhancedSalesInventoryIntegration();

  const handleQuickSale = async (saleData: any) => {
    try {
      const sale = await createCompleteSale(saleData, saleData.saleItems);
      if (sale) {
        toast({
          title: "Quick Sale Created",
          description: "Sale processed with inventory deduction and warranties generated",
        });
        setSalesDialogOpen(false);
      }
    } catch (error) {
      console.error('Quick sale error:', error);
    }
  };

  const quickActions = [
    {
      title: "Record Sale",
      description: "Quick sale entry",
      icon: Plus,
      color: "text-green-500",
      onClick: () => setSalesDialogOpen(true)
    },
    {
      title: "Record Payment", 
      description: "Log customer payment",
      icon: DollarSign,
      color: "text-blue-500",
      onClick: () => navigate('/admin/payments')
    },
    {
      title: "Add Customer",
      description: "New customer entry",
      icon: Users,
      color: "text-purple-500", 
      onClick: () => setCustomerDialogOpen(true)
    },
    {
      title: "Add Product",
      description: "New product entry",
      icon: Package,
      color: "text-amber-500",
      onClick: () => setProductDialogOpen(true)
    },
    {
      title: "View Inventory",
      description: "Check stock levels",
      icon: Package,
      color: "text-cyan-500",
      onClick: () => navigate('/admin/products')
    },
    {
      title: "Outstanding Debts",
      description: "Customer balances",
      icon: AlertTriangle,
      color: "text-red-500",
      onClick: () => navigate('/admin/customers')
    },
    {
      title: "Generate Reports",
      description: "Business reports",
      icon: FileText,
      color: "text-indigo-500",
      onClick: () => navigate('/admin/reports')
    },
    {
      title: "Service & Warranty",
      description: "Warranty management",
      icon: Wrench,
      color: "text-emerald-500",
      onClick: () => navigate('/admin/warranties')
    }
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-muted/50"
                onClick={action.onClick}
              >
                <action.icon className={`h-6 w-6 ${action.color}`} />
                <div className="text-center">
                  <div className="text-sm font-medium">{action.title}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <SalesDialog
        open={salesDialogOpen}
        onClose={() => setSalesDialogOpen(false)}
        onSave={handleQuickSale}
      />

      <CustomerDialog
        open={customerDialogOpen}
        onClose={() => setCustomerDialogOpen(false)}
        onSave={async () => {
          toast({ title: "Customer Added", description: "New customer created successfully" });
          setCustomerDialogOpen(false);
        }}
      />

      <ProductDialog
        open={productDialogOpen}
        onClose={() => setProductDialogOpen(false)}
        onSave={async () => {
          toast({ title: "Product Added", description: "New product created successfully" });
          setProductDialogOpen(false);
        }}
      />
    </>
  );
};

export default QuickActionPanel;