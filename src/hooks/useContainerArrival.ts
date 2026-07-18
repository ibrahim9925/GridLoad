// @ts-nocheck
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface PricingData {
  [productId: string]: {
    min_price?: number;
    standard_price?: number;
    max_price?: number;
  };
}

interface ProcessingResult {
  success: boolean;
  error?: string;
  already_completed?: boolean;
  container_id?: string;
  products_processed?: number;
  products_created?: number;
  stock_movements_created?: number;
  variances_created?: number;
  processed_at?: string;
}

export const useContainerArrival = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const processContainerArrival = async (
    containerId: string, 
    pricingData: PricingData = {}
  ): Promise<ProcessingResult | null> => {
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.rpc('process_container_arrival', {
        p_container_id: containerId,
        p_pricing_data: pricingData
      });

      if (error) {
        console.error('Container arrival processing error:', error);
        toast({
          title: "Processing Failed",
          description: error.message || "Failed to process container arrival",
          variant: "destructive",
        });
        return null;
      }

      const result = (data as any) as ProcessingResult;

      if (!result.success) {
        if (result.already_completed) {
          toast({
            title: "Already Processed",
            description: "This container has already been processed.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Processing Failed",
            description: result.error || "Unknown error occurred",
            variant: "destructive",
          });
        }
        return result;
      }

      // Success
      toast({
        title: "Container Processed Successfully",
        description: `Processed ${result.products_processed} products, created ${result.products_created} new products`,
      });

      // Navigate to products page to see results
      setTimeout(() => {
        navigate('/admin/products');
      }, 2000);

      return result;
    } catch (error) {
      console.error('Unexpected error processing container:', error);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred while processing the container",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    processContainerArrival,
    isProcessing
  };
};