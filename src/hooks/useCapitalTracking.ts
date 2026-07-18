// @ts-nocheck
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface CapitalData {
  injectedCapital: number;
  availableLiquidity: number;
  frozenCapital: number;
  frozenCapitalReleaseDate: string | null;
  outstandingPayables: number;
}

export interface FrozenCapitalItem {
  id: string;
  containerNumber: string;
  amount: number;
  currency: string;
  expectedReleaseDate: string;
  status: string;
}

export const useCapitalTracking = () => {
  const [capitalData, setCapitalData] = useState<CapitalData>({
    injectedCapital: 0,
    availableLiquidity: 0,
    frozenCapital: 0,
    frozenCapitalReleaseDate: null,
    outstandingPayables: 0,
  });
  const [frozenCapitalItems, setFrozenCapitalItems] = useState<FrozenCapitalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchCapitalData = async () => {
    try {
      setIsLoading(true);
      
      // Get bank account balances (available liquidity)
      const { data: bankAccounts, error: bankError } = await supabase
        .from("bank_accounts")
        .select("current_balance, currency")
        .eq("is_active", true);

      if (bankError) throw bankError;

      // Calculate total liquidity in USD equivalent
      const totalLiquidity = (bankAccounts || []).reduce((sum, account) => {
        // For now, assume 1:1 conversion - can be enhanced with currency rates
        return sum + (account.current_balance || 0);
      }, 0);

      // Get frozen capital from in-transit containers
      const { data: containers, error: containerError } = await supabase
        .from("containers")
        .select("id, container_number, total_cost, expected_arrival_date, status")
        .in("status", ["in_transit", "port_arrival", "customs_processing"]);

      if (containerError) throw containerError;

      const frozenItems: FrozenCapitalItem[] = (containers || []).map(container => ({
        id: container.id,
        containerNumber: container.container_number,
        amount: container.total_cost || 0,
        currency: "USD",
        expectedReleaseDate: container.expected_arrival_date || "",
        status: container.status,
      }));

      const totalFrozen = frozenItems.reduce((sum, item) => sum + item.amount, 0);
      
      // Get earliest release date
      const earliestRelease = frozenItems.length > 0 
        ? frozenItems.reduce((earliest, item) => 
            !earliest || item.expectedReleaseDate < earliest 
              ? item.expectedReleaseDate 
              : earliest, ""
          )
        : null;

      // Get outstanding payables (pending purchase orders)
      const { data: purchaseOrders, error: poError } = await supabase
        .from("purchase_orders")
        .select("total_amount")
        .eq("status", "pending");

      if (poError) throw poError;

      const outstandingPayables = (purchaseOrders || []).reduce((sum, po) => sum + (po.total_amount || 0), 0);

      // For now, set injected capital to a default - this should be configurable by admin
      const injectedCapital = 200000; // $200k default

      setCapitalData({
        injectedCapital,
        availableLiquidity: totalLiquidity,
        frozenCapital: totalFrozen,
        frozenCapitalReleaseDate: earliestRelease,
        outstandingPayables,
      });

      setFrozenCapitalItems(frozenItems);

    } catch (error) {
      console.error("Error fetching capital data:", error);
      toast({
        variant: "destructive",
        title: "Error fetching capital data",
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCapitalData();
  }, []);

  return {
    capitalData,
    frozenCapitalItems,
    isLoading,
    refetch: fetchCapitalData,
  };
};