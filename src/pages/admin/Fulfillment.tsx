// @ts-nocheck
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Truck, MapPin, Calendar, Search, Filter } from 'lucide-react';
import { OrderFulfillmentDashboard } from '@/components/admin/fulfillment/OrderFulfillmentDashboard';
import PickingInterface from '@/components/admin/fulfillment/PickingInterface';
import PackingInterface from '@/components/admin/fulfillment/PackingInterface';
import { ShippingDashboard } from '@/components/admin/fulfillment/ShippingDashboard';
import { DeliveryScheduler } from '@/components/admin/fulfillment/DeliveryScheduler';
import { useFulfillmentData } from '@/hooks/useFulfillmentData';

const Fulfillment = () => {
  const [activeTab, setActiveTab] = useState("orders");
  const { fulfillmentStats, isLoading } = useFulfillmentData();

  const quickStats = [
    {
      title: "Pending Orders",
      value: fulfillmentStats?.pending || "0",
      icon: Package,
      change: "3 urgent",
      trend: "up",
      color: "text-orange-600"
    },
    {
      title: "Ready to Ship",
      value: fulfillmentStats?.packed || "0", 
      icon: Truck,
      change: "5 today",
      trend: "up",
      color: "text-blue-600"
    },
    {
      title: "In Transit",
      value: fulfillmentStats?.shipped || "0",
      icon: MapPin,
      change: "2 delayed",
      trend: "neutral",
      color: "text-purple-600"
    },
    {
      title: "Deliveries Today",
      value: fulfillmentStats?.scheduled || "0",
      icon: Calendar,
      change: "8 scheduled",
      trend: "up",
      color: "text-green-600"
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Order Fulfillment</h1>
          <p className="text-muted-foreground">Manage orders from warehouse to delivery</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Search className="mr-2 h-4 w-4" />
            Search Orders
          </Button>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs ${
                stat.trend === 'up' ? 'text-success' : 
                stat.trend === 'down' ? 'text-destructive' : 
                'text-muted-foreground'
              }`}>
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="picking">Picking</TabsTrigger>
          <TabsTrigger value="packing">Packing</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-6">
          <OrderFulfillmentDashboard />
        </TabsContent>

        <TabsContent value="picking" className="space-y-6">
          <PickingInterface />
        </TabsContent>

        <TabsContent value="packing" className="space-y-6">
          <PackingInterface />
        </TabsContent>

        <TabsContent value="shipping" className="space-y-6">
          <ShippingDashboard />
        </TabsContent>

        <TabsContent value="delivery" className="space-y-6">
          <DeliveryScheduler />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Fulfillment;