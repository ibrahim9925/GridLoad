// @ts-nocheck

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RecentActivity {
  id: string;
  action: string;
  time: string;
}

interface RecentActivityCardProps {
  isLoading?: boolean;
}

const RecentActivityCard = ({ isLoading: parentLoading }: RecentActivityCardProps) => {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRecentActivities();
  }, []);

  const getTimeAgo = (dateString: string | null): string => {
    if (!dateString) return "Unknown";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const fetchRecentActivities = async () => {
    try {
      setIsLoading(true);

      // Fetch recent activities
      const { data: recentCustomers, error: customersError } = await supabase
        .from("customers")
        .select("contact_person, created_at")
        .order("created_at", { ascending: false })
        .limit(3);

      const { data: recentProducts, error: productsError } = await supabase
        .from("products")
        .select("name, created_at")
        .order("created_at", { ascending: false })
        .limit(2);

      if (customersError) throw customersError;
      if (productsError) throw productsError;

      // Build recent activities
      const newActivities: RecentActivity[] = [];
      
      if (recentCustomers) {
        recentCustomers.forEach(customer => {
          newActivities.push({
            id: `customer-${customer.contact_person}`,
            action: `New customer: ${customer.contact_person}`,
            time: getTimeAgo(customer.created_at),
          });
        });
      }

      if (recentProducts) {
        recentProducts.forEach(product => {
          newActivities.push({
            id: `product-${product.name}`,
            action: `Product added: ${product.name}`,
            time: getTimeAgo(product.created_at),
          });
        });
      }

      setActivities(newActivities.slice(0, 4));
    } catch (error) {
      console.error("❌ RecentActivity: Error fetching activities:", error);
      toast({
        variant: "destructive",
        title: "Error loading activities",
        description: "Failed to load recent activities.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loading = isLoading || parentLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading activities...</span>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No recent activity</p>
            ) : (
              activities.map((item) => (
                <div key={item.id} className="flex justify-between pb-2 border-b">
                  <span>{item.action}</span>
                  <span className="text-muted-foreground text-sm">{item.time}</span>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivityCard;
