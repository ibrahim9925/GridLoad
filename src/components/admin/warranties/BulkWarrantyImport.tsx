// @ts-nocheck
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Download, FileText } from "lucide-react";

interface BulkWarrantyImportProps {
  onSuccess?: () => void;
}

const BulkWarrantyImport: React.FC<BulkWarrantyImportProps> = ({ onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [importMethod, setImportMethod] = useState<'csv' | 'manual' | 'generate'>('csv');
  const [serialNumbers, setSerialNumbers] = useState('');
  const [warrantyData, setWarrantyData] = useState({
    warranty_period_months: 12,
    warranty_type: 'manufacturer',
    product_id: '',
    customer_id: '',
    prefix: 'WTY',
    start_number: 1,
    count: 100
  });
  const { toast } = useToast();

  const handleCsvImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    if (!headers.includes('serial_number')) {
      toast({
        variant: "destructive",
        title: "Invalid CSV",
        description: "CSV must contain 'serial_number' column",
      });
      return;
    }

    const warranties = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const warranty: any = {};
      headers.forEach((header, index) => {
        warranty[header] = values[index];
      });
      return warranty;
    });

    await processBulkWarranties(warranties);
  };

  const handleManualImport = async () => {
    const numbers = serialNumbers.split('\n').filter(s => s.trim());
    if (numbers.length === 0) {
      toast({
        variant: "destructive",
        title: "No serial numbers",
        description: "Please enter at least one serial number",
      });
      return;
    }

    const warranties = numbers.map(serial => ({
      serial_number: serial.trim(),
      warranty_period_months: warrantyData.warranty_period_months,
      warranty_type: warrantyData.warranty_type,
      product_id: warrantyData.product_id || null,
      customer_id: warrantyData.customer_id || null
    }));

    await processBulkWarranties(warranties);
  };

  const handleGenerateSerials = async () => {
    const warranties = [];
    for (let i = 0; i < warrantyData.count; i++) {
      const serialNumber = `${warrantyData.prefix}${String(warrantyData.start_number + i).padStart(6, '0')}`;
      warranties.push({
        serial_number: serialNumber,
        warranty_period_months: warrantyData.warranty_period_months,
        warranty_type: warrantyData.warranty_type,
        product_id: warrantyData.product_id || null,
        customer_id: warrantyData.customer_id || null
      });
    }

    await processBulkWarranties(warranties);
  };

  const processBulkWarranties = async (warranties: any[]) => {
    setIsLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      
      const warrantyRecords = warranties.map(warranty => {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + (warranty.warranty_period_months || 12));
        
        return {
          serial_number: warranty.serial_number,
          warranty_period_months: warranty.warranty_period_months || 12,
          warranty_type: warranty.warranty_type || 'manufacturer',
          warranty_start_date: startDate.toISOString().split('T')[0],
          warranty_end_date: endDate.toISOString().split('T')[0],
          product_id: warranty.product_id || null,
          customer_id: warranty.customer_id || null,
          registered_by: session.session?.user?.id || null,
          status: 'active'
        };
      });

      const { error } = await supabase
        .from('warranties')
        .insert(warrantyRecords);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${warranties.length} warranties imported successfully`,
      });

      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Import failed",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "serial_number,warranty_period_months,warranty_type,product_id,customer_id\nWTY000001,12,manufacturer,,\nWTY000002,24,extended,,";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'warranty_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bulk Warranty Import</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Import Method</Label>
            <Select value={importMethod} onValueChange={(value: any) => setImportMethod(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV Upload</SelectItem>
                <SelectItem value="manual">Manual Entry</SelectItem>
                <SelectItem value="generate">Auto Generate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {importMethod === 'csv' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
              <div>
                <Label htmlFor="csv-file">Upload CSV File</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleCsvImport}
                />
              </div>
            </div>
          )}

          {importMethod === 'manual' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="serial-numbers">Serial Numbers (one per line)</Label>
                <Textarea
                  id="serial-numbers"
                  value={serialNumbers}
                  onChange={(e) => setSerialNumbers(e.target.value)}
                  placeholder="WTY000001&#10;WTY000002&#10;WTY000003"
                  className="min-h-32"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Warranty Period (Months)</Label>
                  <Input
                    type="number"
                    value={warrantyData.warranty_period_months}
                    onChange={(e) => setWarrantyData({...warrantyData, warranty_period_months: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Warranty Type</Label>
                  <Select
                    value={warrantyData.warranty_type}
                    onValueChange={(value) => setWarrantyData({...warrantyData, warranty_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manufacturer">Manufacturer</SelectItem>
                      <SelectItem value="extended">Extended</SelectItem>
                      <SelectItem value="dealer">Dealer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleManualImport} disabled={isLoading}>
                Import {serialNumbers.split('\n').filter(s => s.trim()).length} Warranties
              </Button>
            </div>
          )}

          {importMethod === 'generate' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Prefix</Label>
                  <Input
                    value={warrantyData.prefix}
                    onChange={(e) => setWarrantyData({...warrantyData, prefix: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Start Number</Label>
                  <Input
                    type="number"
                    value={warrantyData.start_number}
                    onChange={(e) => setWarrantyData({...warrantyData, start_number: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Count</Label>
                  <Input
                    type="number"
                    value={warrantyData.count}
                    onChange={(e) => setWarrantyData({...warrantyData, count: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Warranty Period (Months)</Label>
                  <Input
                    type="number"
                    value={warrantyData.warranty_period_months}
                    onChange={(e) => setWarrantyData({...warrantyData, warranty_period_months: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Warranty Type</Label>
                  <Select
                    value={warrantyData.warranty_type}
                    onValueChange={(value) => setWarrantyData({...warrantyData, warranty_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manufacturer">Manufacturer</SelectItem>
                      <SelectItem value="extended">Extended</SelectItem>
                      <SelectItem value="dealer">Dealer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="p-3 bg-muted rounded">
                <p className="text-sm text-muted-foreground">
                  Preview: {warrantyData.prefix}{String(warrantyData.start_number).padStart(6, '0')} to {warrantyData.prefix}{String(warrantyData.start_number + warrantyData.count - 1).padStart(6, '0')}
                </p>
              </div>
              <Button onClick={handleGenerateSerials} disabled={isLoading}>
                Generate {warrantyData.count} Warranties
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkWarrantyImport;