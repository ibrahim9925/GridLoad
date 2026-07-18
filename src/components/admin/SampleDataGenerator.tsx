// @ts-nocheck
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Trash2, 
  Database, 
  TrendingUp, 
  Clock, 
  DollarSign,
  Package2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { enhancedSampleDataService } from '@/services/EnhancedSampleDataService';

export const SampleDataGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [generationResults, setGenerationResults] = useState<any[]>([]);
  const { toast } = useToast();

  const scenarios = enhancedSampleDataService.getAvailableScenarios();

  const handleGenerateScenario = async (scenarioName: string) => {
    setIsGenerating(true);
    try {
      const result = await enhancedSampleDataService.generateScenarioData(scenarioName);
      toast({
        title: "Scenario Generated",
        description: `Successfully generated ${scenarioName} with comprehensive test data`,
      });
      
      // Update results
      setGenerationResults(prev => [
        ...prev.filter(r => r.scenario !== scenarioName),
        result
      ]);
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate sample data",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAllScenarios = async () => {
    setIsGenerating(true);
    try {
      const results = await enhancedSampleDataService.generateAllScenarios();
      setGenerationResults(results);
      
      const successCount = results.filter(r => !r.error).length;
      toast({
        title: "Bulk Generation Complete",
        description: `Generated ${successCount}/${results.length} scenarios successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Bulk Generation Failed",
        description: error.message || "Failed to generate sample data",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearTestData = async () => {
    setIsClearing(true);
    try {
      const results = await enhancedSampleDataService.clearTestData();
      const successCount = results.filter(r => r.success).length;
      
      toast({
        title: "Test Data Cleared",
        description: `Cleared data from ${successCount}/${results.length} tables`,
      });
      
      setGenerationResults([]);
    } catch (error: any) {
      toast({
        title: "Clear Failed",
        description: error.message || "Failed to clear test data",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const getScenarioIcon = (config: any) => {
    if (config.salesVelocity === 'high') return TrendingUp;
    if (config.leadTimes === 'long') return Clock;
    if (config.cashFlow === 'frozen') return DollarSign;
    return Package2;
  };

  const getScenarioColor = (config: any) => {
    if (config.salesVelocity === 'high') return 'text-success';
    if (config.leadTimes === 'long') return 'text-warning';
    if (config.cashFlow === 'frozen') return 'text-destructive';
    return 'text-primary';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Sample Data Generator
          </h2>
          <p className="text-muted-foreground">Generate realistic test scenarios for supply chain intelligence</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClearTestData}
            disabled={isClearing || isGenerating}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isClearing ? 'Clearing...' : 'Clear Test Data'}
          </Button>
          <Button
            onClick={handleGenerateAllScenarios}
            disabled={isGenerating || isClearing}
          >
            <Play className="mr-2 h-4 w-4" />
            {isGenerating ? 'Generating...' : 'Generate All Scenarios'}
          </Button>
        </div>
      </div>

      {/* Important Notice */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          This will generate comprehensive test data including customers, products, suppliers, sales, purchase orders, and bank transactions. 
          Each scenario creates realistic business conditions to test supply chain intelligence algorithms.
        </AlertDescription>
      </Alert>

      {/* Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {scenarios.map((scenario) => {
          const Icon = getScenarioIcon(scenario.config);
          const iconColor = getScenarioColor(scenario.config);
          const result = generationResults.find(r => r.scenario === scenario.name);
          
          return (
            <Card key={scenario.name} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${iconColor}`} />
                    {scenario.name}
                  </CardTitle>
                  {result && (
                    <Badge variant={result.error ? "destructive" : "default"}>
                      {result.error ? "Failed" : "Generated"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{scenario.description}</p>
                
                {/* Configuration */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>Sales: {scenario.config.salesVelocity}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Lead: {scenario.config.leadTimes}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span>Cash: {scenario.config.cashFlow}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Package2 className="h-3 w-3" />
                    <span>Seasonal: {scenario.config.seasonality ? 'Yes' : 'No'}</span>
                  </div>
                </div>

                {/* Results */}
                {result && !result.error && (
                  <div className="bg-muted/50 p-3 rounded-md">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-success" />
                      Generated Data:
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>Customers: {result.generated.customers}</div>
                      <div>Products: {result.generated.products}</div>
                      <div>Suppliers: {result.generated.suppliers}</div>
                      <div>Sales: {result.generated.sales}</div>
                      <div>POs: {result.generated.purchaseOrders}</div>
                      <div>Bank Txns: {result.generated.bankTransactions}</div>
                    </div>
                  </div>
                )}

                {result && result.error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {result.error}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleGenerateScenario(scenario.name)}
                  disabled={isGenerating || isClearing}
                >
                  <Play className="mr-2 h-3 w-3" />
                  Generate This Scenario
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Generation Summary */}
      {generationResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-success">
                  {generationResults.filter(r => !r.error).length}
                </div>
                <p className="text-sm text-muted-foreground">Successful</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">
                  {generationResults.filter(r => r.error).length}
                </div>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {generationResults.reduce((sum, r) => sum + (r.generated?.sales || 0), 0)}
                </div>
                <p className="text-sm text-muted-foreground">Total Sales Generated</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};