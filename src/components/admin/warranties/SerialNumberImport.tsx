// @ts-nocheck
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SerialNumberImportProps {
  onImportComplete: () => void;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

const SerialNumberImport: React.FC<SerialNumberImportProps> = ({ onImportComplete }) => {
  const [csvData, setCsvData] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvData(content);
    };
    reader.readAsText(file);
  };

  const parseCSVData = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Expected CSV format: serial_number, product_name, customer_name, warranty_start_date, warranty_months
    const expectedHeaders = ['serial_number', 'product_name', 'customer_name', 'warranty_start_date', 'warranty_months'];
    
    return lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim());
      const record: any = {};
      
      headers.forEach((header, headerIndex) => {
        record[header] = values[headerIndex] || '';
      });
      
      record.rowIndex = index + 2; // +2 because we start from line 2 (after header)
      return record;
    }).filter(record => record.serial_number); // Filter out empty rows
  };

  const processImport = async () => {
    if (!csvData.trim()) {
      toast({
        variant: "destructive",
        title: "No Data",
        description: "Please upload a CSV file or paste CSV data first.",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setImportResult(null);

    try {
      const records = parseCSVData(csvData);
      const results: ImportResult = { success: 0, failed: 0, errors: [] };

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        setProgress(((i + 1) / records.length) * 100);

        try {
          // First, find or create customer
          let customerId = null;
          if (record.customer_name) {
            const { data: existingCustomer } = await supabase
              .from('customers')
              .select('id')
              .eq('contact_person', record.customer_name)
              .single();

            if (existingCustomer) {
              customerId = existingCustomer.id;
            } else {
              // Create new customer
              const { data: newCustomer, error: customerError } = await supabase
                .from('customers')
                .insert({
                  contact_person: record.customer_name,
                  notes: 'Auto-created from warranty import'
                })
                .select('id')
                .single();

              if (customerError) throw customerError;
              customerId = newCustomer.id;
            }
          }

          // Find or create product
          let productId = null;
          if (record.product_name) {
            const { data: existingProduct } = await supabase
              .from('products')
              .select('id')
              .eq('name', record.product_name)
              .single();

            if (existingProduct) {
              productId = existingProduct.id;
            } else {
              // Create placeholder product
              const { data: newProduct, error: productError } = await supabase
                .from('products')
                .insert({
                  name: record.product_name,
                  sku: `AUTO-${record.product_name.replace(/\s+/g, '-').toUpperCase()}`,
                  standard_selling_price: 0,
                  current_stock: 0,
                  category: 'imported',
                  warranty_months: parseInt(record.warranty_months) || 12,
                  notes: 'Auto-created from warranty import'
                })
                .select('id')
                .single();

              if (productError) throw productError;
              productId = newProduct.id;
            }
          }

          // Calculate warranty dates
          const startDate = new Date(record.warranty_start_date || Date.now());
          const warrantyMonths = parseInt(record.warranty_months) || 12;
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + warrantyMonths);

          // Insert warranty record
          const warrantyData = {
            serial_number: record.serial_number,
            product_id: productId,
            customer_id: customerId,
            warranty_type: 'manufacturer',
            warranty_period_months: warrantyMonths,
            warranty_start_date: startDate.toISOString().split('T')[0],
            warranty_end_date: endDate.toISOString().split('T')[0],
            status: 'active',
            notes: `Imported from CSV - Row ${record.rowIndex}`
          };

          const { error: warrantyError } = await supabase
            .from('warranties')
            .insert(warrantyData);

          if (warrantyError) throw warrantyError;

          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(`Row ${record.rowIndex}: ${error.message}`);
        }
      }

      setImportResult(results);
      
      if (results.success > 0) {
        toast({
          title: "Import Complete",
          description: `Successfully imported ${results.success} warranty records.`,
        });
        onImportComplete();
      }

    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: error.message || "Failed to process CSV data",
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Import Serial Numbers from CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload */}
        <div className="space-y-2">
          <Label htmlFor="csv-file">Upload CSV File</Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv,.txt"
            onChange={handleFileUpload}
            disabled={isProcessing}
          />
        </div>

        {/* Manual CSV Input */}
        <div className="space-y-2">
          <Label htmlFor="csv-data">Or Paste CSV Data</Label>
          <Textarea
            id="csv-data"
            placeholder="serial_number,product_name,customer_name,warranty_start_date,warranty_months
23fx2000049,Solar Inverter 5kW,John Smith,2024-01-15,60
23fx2000050,Solar Inverter 5kW,Jane Doe,2024-02-10,60"
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            disabled={isProcessing}
            rows={8}
          />
        </div>

        {/* Expected Format Info */}
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            <strong>Expected CSV Format:</strong><br />
            serial_number, product_name, customer_name, warranty_start_date, warranty_months<br />
            <em>Example: 23fx2000049, Solar Inverter 5kW, John Smith, 2024-01-15, 60</em>
          </AlertDescription>
        </Alert>

        {/* Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Import Results */}
        {importResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">Success</p>
                      <p className="text-2xl font-bold text-green-600">{importResult.success}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium text-red-800">Failed</p>
                      <p className="text-2xl font-bold text-red-600">{importResult.failed}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {importResult.errors.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Errors:</strong>
                  <ul className="mt-2 space-y-1">
                    {importResult.errors.slice(0, 5).map((error, index) => (
                      <li key={index} className="text-sm">• {error}</li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li className="text-sm">• ... and {importResult.errors.length - 5} more errors</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={processImport}
            disabled={!csvData.trim() || isProcessing}
            className="flex-1"
          >
            {isProcessing ? "Processing..." : "Import Warranties"}
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => {
              setCsvData("");
              setImportResult(null);
            }}
            disabled={isProcessing}
          >
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SerialNumberImport;