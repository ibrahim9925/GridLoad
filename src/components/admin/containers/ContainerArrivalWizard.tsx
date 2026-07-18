// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Package, DollarSign, CheckCircle, Upload } from 'lucide-react';
import { useContainerProducts } from '@/hooks/useContainerProducts';
import { useContainerArrival } from '@/hooks/useContainerArrival';

interface Container {
  id: string;
  container_number: string;
  status: string;
  total_cost?: number;
}

interface ContainerProduct {
  id: string;
  product_name: string;
  quantity: number;
  received_quantity: number;
  unit_cost: number;
  total_cost: number;
}

interface PricingData {
  [productId: string]: {
    min_price: number;
    standard_price: number;
    max_price: number;
  };
}

interface ContainerArrivalWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: Container | null;
  onProcessed?: () => void;
}

export const ContainerArrivalWizard: React.FC<ContainerArrivalWizardProps> = ({
  open,
  onOpenChange,
  container,
  onProcessed
}) => {
  const [currentStep, setCurrentStep] = useState('quantities');
  const [pricingData, setPricingData] = useState<PricingData>({});
  
  const { containerProducts, isLoading, updateContainerProduct } = useContainerProducts(container?.id);
  const { processContainerArrival, isProcessing } = useContainerArrival();

  // Reset wizard when opening
  useEffect(() => {
    if (open) {
      setCurrentStep('quantities');
      setPricingData({});
    }
  }, [open]);

  // Initialize pricing data with suggested values
  useEffect(() => {
    if (containerProducts.length > 0 && Object.keys(pricingData).length === 0) {
      const initialPricing: PricingData = {};
      containerProducts.forEach(product => {
        initialPricing[product.id] = {
          min_price: Math.round(product.unit_cost * 1.2 * 100) / 100,
          standard_price: Math.round(product.unit_cost * 1.5 * 100) / 100,
          max_price: Math.round(product.unit_cost * 2.0 * 100) / 100,
        };
      });
      setPricingData(initialPricing);
    }
  }, [containerProducts, pricingData]);

  const handleQuantityChange = async (productId: string, receivedQuantity: number) => {
    await updateContainerProduct(productId, { received_quantity: receivedQuantity });
  };

  const handlePricingChange = (productId: string, priceType: keyof PricingData[string], value: number) => {
    setPricingData(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [priceType]: value
      }
    }));
  };

  const handleProcess = async () => {
    if (!container) return;
    
    const result = await processContainerArrival(container.id, pricingData);
    if (result?.success) {
      onProcessed?.();
      onOpenChange(false);
    }
  };

  const canProceedToStep = (step: string) => {
    switch (step) {
      case 'pricing':
        return containerProducts.every(p => p.received_quantity >= 0);
      case 'review':
        return containerProducts.every(p => p.received_quantity >= 0) && 
               Object.keys(pricingData).length > 0;
      default:
        return true;
    }
  };

  const getTotalReceivedValue = () => {
    return containerProducts.reduce((sum, product) => 
      sum + (product.received_quantity * product.unit_cost), 0
    );
  };

  const getVarianceCount = () => {
    return containerProducts.filter(p => p.received_quantity !== p.quantity).length;
  };

  if (!container) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Process Container Arrival - {container.container_number}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={currentStep} onValueChange={setCurrentStep} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="quantities" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Quantities
            </TabsTrigger>
            <TabsTrigger 
              value="pricing" 
              disabled={!canProceedToStep('pricing')}
              className="flex items-center gap-2"
            >
              <DollarSign className="h-4 w-4" />
              Pricing
            </TabsTrigger>
            <TabsTrigger 
              value="review" 
              disabled={!canProceedToStep('review')}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Review
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quantities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Verify Received Quantities</CardTitle>
                <CardDescription>
                  Enter the actual quantities received for each product
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {containerProducts.map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{product.product_name}</div>
                          <div className="text-sm text-muted-foreground">
                            Expected: {product.quantity} units @ ${product.unit_cost.toFixed(2)}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`qty-${product.id}`} className="text-sm">Received:</Label>
                            <Input
                              id={`qty-${product.id}`}
                              type="number"
                              min="0"
                              value={product.received_quantity}
                              onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 0)}
                              className="w-20"
                            />
                          </div>
                          {product.received_quantity !== product.quantity && (
                            <Badge variant={product.received_quantity < product.quantity ? "destructive" : "secondary"}>
                              {product.received_quantity > product.quantity ? '+' : ''}
                              {product.received_quantity - product.quantity}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button 
                onClick={() => setCurrentStep('pricing')}
                disabled={!canProceedToStep('pricing')}
              >
                Next: Set Prices
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Set Selling Prices</CardTitle>
                <CardDescription>
                  Configure the selling price tiers for each product
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {containerProducts
                    .filter(p => p.received_quantity > 0)
                    .map((product) => (
                    <div key={product.id} className="p-4 border rounded-lg">
                      <div className="font-medium mb-3">{product.product_name}</div>
                      <div className="text-sm text-muted-foreground mb-3">
                        Cost: ${product.unit_cost.toFixed(2)} • Received: {product.received_quantity} units
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor={`min-${product.id}`}>Min Price</Label>
                          <Input
                            id={`min-${product.id}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={pricingData[product.id]?.min_price || ''}
                            onChange={(e) => handlePricingChange(
                              product.id, 
                              'min_price', 
                              parseFloat(e.target.value) || 0
                            )}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`standard-${product.id}`}>Standard Price</Label>
                          <Input
                            id={`standard-${product.id}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={pricingData[product.id]?.standard_price || ''}
                            onChange={(e) => handlePricingChange(
                              product.id, 
                              'standard_price', 
                              parseFloat(e.target.value) || 0
                            )}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`max-${product.id}`}>Max Price</Label>
                          <Input
                            id={`max-${product.id}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={pricingData[product.id]?.max_price || ''}
                            onChange={(e) => handlePricingChange(
                              product.id, 
                              'max_price', 
                              parseFloat(e.target.value) || 0
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('quantities')}>
                Back
              </Button>
              <Button 
                onClick={() => setCurrentStep('review')}
                disabled={!canProceedToStep('review')}
              >
                Next: Review
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="review" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Review & Process</CardTitle>
                <CardDescription>
                  Review all details before processing the container arrival
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {containerProducts.filter(p => p.received_quantity > 0).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Products</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {containerProducts.reduce((sum, p) => sum + p.received_quantity, 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Units</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      ${getTotalReceivedValue().toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Value</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {getVarianceCount()}
                    </div>
                    <div className="text-sm text-muted-foreground">Variances</div>
                  </div>
                </div>

                {/* Products Summary */}
                <div className="space-y-2">
                  <h4 className="font-medium">Products to Process:</h4>
                  {containerProducts
                    .filter(p => p.received_quantity > 0)
                    .map((product) => (
                    <div key={product.id} className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="font-medium">{product.product_name}</span>
                      <div className="text-sm text-right">
                        <div>{product.received_quantity} units</div>
                        <div className="text-muted-foreground">
                          ${pricingData[product.id]?.standard_price?.toFixed(2) || '0.00'} each
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {getVarianceCount() > 0 && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="font-medium text-orange-800 mb-1">Quantity Variances Detected</div>
                    <div className="text-sm text-orange-700">
                      {getVarianceCount()} products have quantity differences that will be automatically recorded.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('pricing')}>
                Back
              </Button>
              <Button 
                onClick={handleProcess}
                disabled={isProcessing || !canProceedToStep('review')}
                className="min-w-[120px]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Process Arrival
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};