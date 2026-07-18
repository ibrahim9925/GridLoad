// @ts-nocheck
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Package, Loader2 } from "lucide-react";

interface POReceiveButtonProps {
  purchaseOrder: any;
  onSuccess?: () => void;
}

const POReceiveButton = ({ purchaseOrder, onSuccess }: POReceiveButtonProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleReceive = async () => {
    if (purchaseOrder.status === 'received') {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Purchase order is already received"
      });
      return;
    }

    setLoading(true);
    try {
      // Update PO status to received (trigger will handle inventory updates)
      const { error } = await supabase
        .from('purchase_orders')
        .update({ 
          status: 'received',
          actual_delivery_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', purchaseOrder.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Purchase order received - inventory updated automatically"
      });

      onSuccess?.();
    } catch (error: any) {
      console.error('Error receiving PO:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to receive purchase order"
      });
    } finally {
      setLoading(false);
    }
  };

  if (purchaseOrder.status === 'received') {
    return (
      <Button variant="outline" disabled>
        <Package className="h-4 w-4 mr-2" />
        Received
      </Button>
    );
  }

  return (
    <Button onClick={handleReceive} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <Package className="h-4 w-4 mr-2" />
      )}
      Mark as Received
    </Button>
  );
};

export default POReceiveButton;