// @ts-nocheck
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calculator, DollarSign, CheckCircle, AlertTriangle, User } from "lucide-react";
import { useAutomaticCommissionCalculation } from "@/hooks/useAutomaticCommissionCalculation";

interface AutoCommissionCalculationProps {
  saleId: string;
  saleAmount: number;
  salesRepId?: string;
  salesRepName?: string;
  onCalculationComplete?: () => void;
}

const AutoCommissionCalculation: React.FC<AutoCommissionCalculationProps> = ({
  saleId,
  saleAmount,
  salesRepId,
  salesRepName,
  onCalculationComplete
}) => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  
  const { calculateAndCreateCommissionPayment } = useAutomaticCommissionCalculation();

  const handleCalculateCommission = async () => {
    setIsCalculating(true);
    setCalculationResult(null);

    try {
      const result = await calculateAndCreateCommissionPayment(saleId);
      setCalculationResult(result);
      
      if (result.success && onCalculationComplete) {
        onCalculationComplete();
      }
    } catch (error) {
      console.error('Error in commission calculation:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  if (!salesRepId) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              No sales rep assigned - commission calculation not available
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Commission Calculation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sales Rep Info */}
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <User className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">{salesRepName || 'Sales Representative'}</p>
            <p className="text-sm text-muted-foreground">Sale Amount: ${(Number(saleAmount) || 0).toFixed(2)}</p>
          </div>
        </div>

        {/* Calculation Result */}
        {calculationResult && (
          <Alert className={calculationResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <div className="flex items-center gap-2">
              {calculationResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              <AlertDescription className={calculationResult.success ? "text-green-800" : "text-red-800"}>
                {calculationResult.success ? (
                  calculationResult.commissionAmount ? (
                    <div>
                      <strong>Commission Calculated Successfully!</strong>
                      <br />
                      Amount: ${(Number(calculationResult.commissionAmount) || 0).toFixed(2)} for {calculationResult.salesRepName}
                      <br />
                      Status: Pending payment approval
                    </div>
                  ) : (
                    <div>
                      <strong>No Commission Calculated</strong>
                      <br />
                      {calculationResult.message}
                    </div>
                  )
                ) : (
                  <div>
                    <strong>Commission Calculation Failed</strong>
                    <br />
                    {calculationResult.error?.message || 'An error occurred during calculation'}
                  </div>
                )}
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Action Button */}
        <div className="flex gap-2">
          <Button 
            onClick={handleCalculateCommission}
            disabled={isCalculating}
            className="flex-1"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            {isCalculating ? "Calculating..." : "Calculate Commission"}
          </Button>
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Commission will be calculated based on the sales rep's commission rate</p>
          <p>• Payment record will be created with "pending" status</p>
          <p>• Accountants can process the payment from the Commission Management section</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AutoCommissionCalculation;