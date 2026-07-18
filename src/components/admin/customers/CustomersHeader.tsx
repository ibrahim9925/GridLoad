// @ts-nocheck

import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import GlobalSearch from "@/components/admin/GlobalSearch";

interface CustomersHeaderProps {
  customersCount: number;
  onAddCustomer: () => void;
}

const CustomersHeader = ({ customersCount, onAddCustomer }: CustomersHeaderProps) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your customer database with {customersCount} total customers
          </p>
        </div>
        <Button onClick={onAddCustomer} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <GlobalSearch />
        </div>
      </div>
    </div>
  );
};

export default CustomersHeader;
