// @ts-nocheck
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Sun, 
  Battery, 
  Zap, 
  DollarSign, 
  Download, 
  Mail, 
  Phone,
  RotateCcw
} from "lucide-react";
import { SolarRecommendations } from "@/types/solar";
import { useToast } from "@/hooks/use-toast";

interface SolarRecommendationCardProps {
  recommendations: SolarRecommendations;
  onReset: () => void;
}

export const SolarRecommendationCard: React.FC<SolarRecommendationCardProps> = ({
  recommendations,
  onReset,
}) => {
  const { toast } = useToast();

  const handleRequestCallback = async () => {
    try {
      // This would integrate with the leads system
      toast({
        title: "Callback Requested",
        description: "A GridLoad specialist will contact you within 24 hours.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to request callback. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = () => {
    toast({
      title: "PDF Generation",
      description: "Your solar recommendation PDF will be ready shortly.",
    });
  };

  const handleEmailQuote = () => {
    toast({
      title: "Email Sent",
      description: "Your solar recommendations have been sent to your email.",
    });
  };

  return (
    <Card className="shadow-lg border-primary/20">
      <CardHeader className="bg-primary/5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl text-primary">Your Solar System Recommendation</CardTitle>
            <CardDescription className="text-base">
              Customized for {recommendations.customerName} in {recommendations.location}
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onReset}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            New Calculation
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="text-center p-4 bg-secondary/10 rounded-lg">
            <Sun className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">{recommendations.systemSizeKw} kW</div>
            <div className="text-sm text-muted-foreground">System Size</div>
          </div>
          
          <div className="text-center p-4 bg-secondary/10 rounded-lg">
            <Sun className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">{recommendations.panelCount}</div>
            <div className="text-sm text-muted-foreground">Solar Panels</div>
          </div>
          
          <div className="text-center p-4 bg-secondary/10 rounded-lg">
            <Zap className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">{recommendations.inverterSize} kW</div>
            <div className="text-sm text-muted-foreground">Inverter Size</div>
          </div>
          
          <div className="text-center p-4 bg-secondary/10 rounded-lg">
            <DollarSign className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">
              {recommendations.currency === 'ILS' 
                ? `₪${recommendations.estimatedCost.toLocaleString()}`
                : `$${recommendations.estimatedCost.toLocaleString()}`
              }
            </div>
            <div className="text-sm text-muted-foreground">Est. Total Cost</div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Recommended Components</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Sun className="h-4 w-4 text-primary" />
                Solar Panels
              </h4>
              <p className="text-sm text-muted-foreground">{recommendations.panelDetails}</p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Inverter
              </h4>
              <p className="text-sm text-muted-foreground">{recommendations.inverterDetails}</p>
            </div>

            {recommendations.batteryDetails && (
              <div className="space-y-2 md:col-span-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Battery className="h-4 w-4 text-primary" />
                  Battery Backup System
                </h4>
                <p className="text-sm text-muted-foreground">{recommendations.batteryDetails}</p>
              </div>
            )}
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Key Benefits</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                ${Math.round(recommendations.monthlySavings).toLocaleString()}/month
              </div>
              <div className="text-sm text-muted-foreground">Estimated Savings</div>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {Math.round(recommendations.paybackYears)} years
              </div>
              <div className="text-sm text-muted-foreground">Payback Period</div>
            </div>
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {Math.round(recommendations.co2ReductionTons)}t CO₂
              </div>
              <div className="text-sm text-muted-foreground">Annual CO₂ Reduction</div>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={handleRequestCallback}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            <Phone className="h-4 w-4 mr-2" />
            Request Callback
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDownloadPDF}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button 
            variant="outline" 
            onClick={handleEmailQuote}
            className="flex-1"
          >
            <Mail className="h-4 w-4 mr-2" />
            Email Quote
          </Button>
        </div>

        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            💡 <strong>Next Steps:</strong> Our solar specialists will contact you to discuss installation details, 
            financing options, and answer any questions. All recommendations are preliminary estimates.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};