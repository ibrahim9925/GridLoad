// @ts-nocheck
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedPaymentCalculations } from "./useEnhancedPaymentCalculations";

export const useEnhancedPaymentProcessing = () => {
  const { toast } = useToast();
  const { processPayment, updatePaymentStatus } = useEnhancedPaymentCalculations();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePaymentStatusChange = async (
    saleId: string, 
    newStatus: string, 
    totalAmount: number
  ) => {
    try {
      setIsProcessing(true);
      console.log("💳 EnhancedPaymentProcessing: Handling payment status change", { 
        saleId, newStatus, totalAmount 
      });

      // If user sets status to "paid", automatically create a payment record
      if (newStatus === "paid") {
        console.log("💰 Auto-creating payment record for full amount");
        
        await processPayment({
          sale_id: saleId,
          amount: totalAmount,
          payment_method: "cash", // Default method, user can change later
          payment_date: new Date().toISOString().split('T')[0],
          notes: "Auto-generated payment when status set to paid"
        });

        toast({
          title: "Payment Status Updated",
          description: `Sale marked as paid and payment record created for ${totalAmount.toLocaleString()}`,
        });
      } else {
        // Just update the payment status without creating payment record
        const { error } = await supabase
          .from("sales")
          .update({ 
            payment_status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq("id", saleId);

        if (error) throw error;

        // Update payment calculations
        await updatePaymentStatus(saleId);

        toast({
          title: "Payment Status Updated",
          description: `Sale payment status changed to ${newStatus}`,
        });
      }

      return true;
    } catch (error: any) {
      console.error("❌ Error handling payment status change:", error);
      toast({
        variant: "destructive",
        title: "Error updating payment status",
        description: error.message || "Please try again later.",
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const createPaymentRecord = async (paymentData: {
    sale_id: string;
    amount: number;
    payment_method: string;
    payment_date: string;
    reference_number?: string;
    notes?: string;
  }) => {
    try {
      setIsProcessing(true);
      console.log("💳 Creating manual payment record", paymentData);

      const payment = await processPayment(paymentData);
      
      toast({
        title: "Payment Recorded",
        description: `Payment of ${paymentData.amount.toLocaleString()} has been recorded successfully.`,
      });

      return payment;
    } catch (error: any) {
      console.error("❌ Error creating payment record:", error);
      toast({
        variant: "destructive",
        title: "Error recording payment",
        description: error.message || "Please try again later.",
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    handlePaymentStatusChange,
    createPaymentRecord,
    isProcessing
  };
};