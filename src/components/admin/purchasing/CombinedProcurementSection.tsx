// @ts-nocheck
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, ShoppingCart } from 'lucide-react';
import ContainerManagementSection from '../containers/ContainerManagementSection';
import PurchaseOrdersSection from './PurchaseOrdersSection';

const CombinedProcurementSection = () => {
  return (
    <Tabs defaultValue="containers" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="containers" className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          Container Orders
        </TabsTrigger>
        <TabsTrigger value="purchase-orders" className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          Purchase Orders
        </TabsTrigger>
      </TabsList>

      <TabsContent value="containers" className="space-y-6">
        <ContainerManagementSection />
      </TabsContent>

      <TabsContent value="purchase-orders" className="space-y-6">
        <PurchaseOrdersSection />
      </TabsContent>
    </Tabs>
  );
};

export default CombinedProcurementSection;