// @ts-nocheck

import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PaymentCalculation {
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  balance_due: number;
  total_paid: number;
}

interface SaleItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export const useEnhancedPaymentCalculations = () => {
  const { toast } = useToast();

  const calculateSaleTotal = (
    items: SaleItem[],
    discountType: "percentage" | "fixed" = "percentage",
    discountValue: number = 0,
    taxRate: number = 0
  ): PaymentCalculation => {
    console.log("💰 PaymentCalculations: Calculating sale total", { items, discountType, discountValue, taxRate });
    
    // Calculate subtotal from line items
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
    
    // Calculate discount amount
    let discount_amount = 0;
    if (discountType === "percentage") {
      discount_amount = (subtotal * discountValue) / 100;
    } else {
      discount_amount = Math.min(discountValue, subtotal); // Can't discount more than subtotal
    }
    
    // Calculate tax on discounted amount
    const taxable_amount = subtotal - discount_amount;
    const tax_amount = (taxable_amount * taxRate) / 100;
    
    // Calculate final total
    const total_amount = subtotal - discount_amount + tax_amount;
    
    const result = {
      subtotal,
      discount_amount,
      tax_amount,
      total_amount,
      balance_due: total_amount, // Initially equals total
      total_paid: 0 // Initially zero
    };
    
    console.log("✅ PaymentCalculations: Calculation complete", result);
    return result;
  };

  const calculateInstallmentSchedule = (
    totalAmount: number,
    planType: string,
    startDate: Date = new Date()
  ) => {
    console.log("📅 PaymentCalculations: Creating installment schedule", { totalAmount, planType });
    
    const schedules = [];
    const baseDate = new Date(startDate);
    
    switch (planType) {
      case "30-70":
        schedules.push({
          installment_number: 1,
          due_date: new Date(baseDate),
          amount: totalAmount * 0.3,
          status: "pending"
        });
        schedules.push({
          installment_number: 2,
          due_date: new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000),
          amount: totalAmount * 0.7,
          status: "pending"
        });
        break;
        
      case "50-25-25":
        schedules.push(
          {
            installment_number: 1,
            due_date: new Date(baseDate),
            amount: totalAmount * 0.5,
            status: "pending"
          },
          {
            installment_number: 2,
            due_date: new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000),
            amount: totalAmount * 0.25,
            status: "pending"
          },
          {
            installment_number: 3,
            due_date: new Date(baseDate.getTime() + 60 * 24 * 60 * 60 * 1000),
            amount: totalAmount * 0.25,
            status: "pending"
          }
        );
        break;
        
      case "25-25-25-25":
        for (let i = 0; i < 4; i++) {
          schedules.push({
            installment_number: i + 1,
            due_date: new Date(baseDate.getTime() + i * 30 * 24 * 60 * 60 * 1000),
            amount: totalAmount * 0.25,
            status: "pending"
          });
        }
        break;
        
      default:
        // Custom plan - single payment
        schedules.push({
          installment_number: 1,
          due_date: new Date(baseDate),
          amount: totalAmount,
          status: "pending"
        });
    }
    
    console.log("✅ PaymentCalculations: Schedule created", schedules);
    return schedules;
  };

  const updatePaymentStatus = async (saleId: string) => {
    try {
      console.log("🔄 PaymentCalculations: Updating payment status for sale:", saleId);
      
      // Get all payments for this sale
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("amount")
        .eq("sale_id", saleId);
      
      if (paymentsError) throw paymentsError;
      
      // Get sale total
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .select("total_amount")
        .eq("id", saleId)
        .single();
      
      if (saleError) throw saleError;
      
      const totalPaid = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      const balanceDue = sale.total_amount - totalPaid;
      
      let paymentStatus = "pending";
      if (totalPaid >= sale.total_amount) {
        paymentStatus = "paid";
      } else if (totalPaid > 0) {
        paymentStatus = "partial_paid";
      }
      
      // Update sale with new payment status
      const { error: updateError } = await supabase
        .from("sales")
        .update({
          total_paid: totalPaid,
          balance_due: balanceDue,
          payment_status: paymentStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", saleId);
      
      if (updateError) throw updateError;
      
      console.log("✅ PaymentCalculations: Payment status updated", {
        saleId,
        totalPaid,
        balanceDue,
        paymentStatus
      });
      
      return { totalPaid, balanceDue, paymentStatus };
      
    } catch (error) {
      console.error("❌ PaymentCalculations: Error updating payment status:", error);
      toast({
        variant: "destructive",
        title: "Error updating payment status",
        description: "Please try again later.",
      });
      throw error;
    }
  };

  const calculateCommission = (
    saleAmount: number,
    commissionRate: number,
    bonusRate: number = 0,
    targetAmount: number = 0
  ) => {
    console.log("💼 PaymentCalculations: Calculating commission", { 
      saleAmount, commissionRate, bonusRate, targetAmount 
    });
    
    const baseCommission = (saleAmount * commissionRate) / 100;
    let bonusCommission = 0;
    
    // Calculate bonus if sale exceeds target
    if (targetAmount > 0 && saleAmount > targetAmount) {
      const excessAmount = saleAmount - targetAmount;
      bonusCommission = (excessAmount * bonusRate) / 100;
    }
    
    const totalCommission = baseCommission + bonusCommission;
    
    console.log("✅ PaymentCalculations: Commission calculated", {
      baseCommission,
      bonusCommission,
      totalCommission
    });
    
    return {
      base_commission: baseCommission,
      bonus_commission: bonusCommission,
      total_commission: totalCommission
    };
  };

  const processPayment = async (paymentData: {
    sale_id: string;
    amount: number;
    payment_method: string;
    payment_date: string;
    reference_number?: string;
    notes?: string;
    payment_schedule_id?: string;
  }) => {
    try {
      console.log("💳 PaymentCalculations: Processing payment", paymentData);
      
      // Insert payment record
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          ...paymentData,
          recorded_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();
      
      if (paymentError) throw paymentError;
      
      // Update payment schedule if applicable
      if (paymentData.payment_schedule_id) {
        const { error: scheduleError } = await supabase
          .from("payment_schedules")
          .update({ status: "paid" })
          .eq("id", paymentData.payment_schedule_id);
        
        if (scheduleError) throw scheduleError;
      }
      
      // Update sale payment status
      await updatePaymentStatus(paymentData.sale_id);
      
      console.log("✅ PaymentCalculations: Payment processed successfully");
      
      toast({
        title: "Payment processed",
        description: `Payment of $${paymentData.amount.toFixed(2)} has been recorded.`,
      });
      
      return payment;
      
    } catch (error) {
      console.error("❌ PaymentCalculations: Error processing payment:", error);
      toast({
        variant: "destructive",
        title: "Error processing payment",
        description: "Please try again later.",
      });
      throw error;
    }
  };

  return {
    calculateSaleTotal,
    calculateInstallmentSchedule,
    updatePaymentStatus,
    calculateCommission,
    processPayment
  };
};
