// @ts-nocheck

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, DollarSign, Users, Package, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: "New Sale",
      icon: DollarSign,
      description: "Create a new sale record",
      onClick: () => navigate("/admin/sales"),
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Add Customer",
      icon: Users,
      description: "Register a new customer",
      onClick: () => navigate("/admin/customers"),
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Record Payment",
      icon: FileText,
      description: "Process customer payment",
      onClick: () => navigate("/admin/payments"),
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Add Product",
      icon: Package,
      description: "Add new product to inventory",
      onClick: () => navigate("/admin/products"),
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <Button
              key={action.title}
              variant="outline"
              className={`h-auto p-4 flex-col items-start text-left ${action.bgColor} border-0 hover:shadow-md transition-all`}
              onClick={action.onClick}
            >
              <div className="flex items-center gap-2 mb-2">
                <action.icon className={`h-4 w-4 ${action.color}`} />
                <span className="font-medium text-gray-900">{action.title}</span>
              </div>
              <span className="text-xs text-gray-600">{action.description}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
