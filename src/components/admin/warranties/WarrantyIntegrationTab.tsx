// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import BulkWarrantyImport from './BulkWarrantyImport';
import SerialNumberImport from './SerialNumberImport';
import { 
  AlertTriangle,
  Calendar,
  FileText,
  Plus,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, addMonths, isAfter, isBefore } from 'date-fns';

interface Warranty {
  id: string;
  sale_id?: string;
  product_id?: string;
  customer_id?: string;
  serial_number: string;
  warranty_type: string;
  warranty_period_months: number;
  warranty_start_date: string;
  warranty_end_date: string;
  status: string;
  notes?: string;
  created_at: string;
  product?: {
    name: string;
    sku?: string;
  };
  customer?: {
    contact_person: string;
    company_name?: string;
  };
  warranty_claims?: any[];
}

interface WarrantyClaim {
  id: string;
  warranty_id: string;
  claim_type: string;
  description: string;
  claim_date: string;
  claim_amount?: number;
  status: string;
  resolution?: string;
  processed_by?: string;
}

const WarrantyIntegrationTab = () => {
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<Warranty | null>(null);
  const [isProcessingClaim, setIsProcessingClaim] = useState(false);
  const { toast } = useToast();

  const [claimForm, setClaimForm] = useState({
    claim_type: '',
    description: '',
    claim_amount: 0
  });

  useEffect(() => {
    fetchWarranties();
  }, []);

  const fetchWarranties = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('warranties')
        .select(`
          *,
          products!fk_warranties_product_id(id, name, sku),
          customers(contact_person, company_name),
          warranty_claims(id, claim_type, status, claim_date)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Update warranty status based on dates
      const updatedWarranties = (data || []).map(warranty => {
        const now = new Date();
        const endDate = new Date(warranty.warranty_end_date);
        
        let status = warranty.status;
        if (isAfter(now, endDate) && status === 'active') {
          status = 'expired';
        }
        
        return { ...warranty, status };
      });
      
      setWarranties(updatedWarranties);
    } catch (error: any) {
      console.error('Error fetching warranties:', error);
      toast({
        title: "Error",
        description: "Failed to fetch warranties.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createWarrantyFromSale = async (saleId: string) => {
    try {
      // This would be called automatically when a sale is completed
      // Implementation already exists in useSalesInventoryIntegration
      toast({
        title: "Success",
        description: "Warranty automatically created for sale items.",
      });
    } catch (error: any) {
      console.error('Error creating warranty:', error);
      toast({
        title: "Error",
        description: "Failed to create warranty.",
        variant: "destructive",
      });
    }
  };

  const handleCreateClaim = async () => {
    if (!selectedWarranty) return;
    
    try {
      setIsProcessingClaim(true);
      
      const { error } = await supabase
        .from('warranty_claims')
        .insert({
          warranty_id: selectedWarranty.id,
          claim_type: claimForm.claim_type,
          description: claimForm.description,
          claim_amount: claimForm.claim_amount || null,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Claim Created",
        description: "Warranty claim has been submitted successfully.",
      });

      setShowClaimDialog(false);
      setClaimForm({ claim_type: '', description: '', claim_amount: 0 });
      await fetchWarranties();
      
    } catch (error: any) {
      console.error('Error creating claim:', error);
      toast({
        title: "Error",
        description: "Failed to create warranty claim.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingClaim(false);
    }
  };

  const generateExpiryAlerts = () => {
    const thirtyDaysFromNow = addMonths(new Date(), 1);
    const expiringWarranties = warranties.filter(warranty => {
      const endDate = new Date(warranty.warranty_end_date);
      return isBefore(endDate, thirtyDaysFromNow) && warranty.status === 'active';
    });

    return expiringWarranties;
  };

  const filteredWarranties = warranties.filter(warranty => {
    const matchesSearch = warranty.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         warranty.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         warranty.customer?.contact_person.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || warranty.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      expired: 'destructive',
      void: 'secondary'
    } as const;
    
    const icons = {
      active: CheckCircle,
      expired: XCircle,
      void: Clock
    };
    
    const Icon = icons[status as keyof typeof icons] || CheckCircle;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (amount?: number) => {
    return amount ? new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount) : '-';
  };

  const expiringWarranties = generateExpiryAlerts();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading warranty data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {expiringWarranties.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div className="ml-3">
                <h4 className="font-medium text-yellow-800">Warranty Expiry Alert</h4>
                <p className="text-sm text-yellow-700">
                  {expiringWarranties.length} warranties are expiring within 30 days.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Warranties</p>
                <p className="text-2xl font-bold text-green-600">
                  {warranties.filter(w => w.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold text-red-600">
                  {warranties.filter(w => w.status === 'expired').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {expiringWarranties.length}
                </p>
                <p className="text-xs text-muted-foreground">Next 30 days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Claims</p>
                <p className="text-2xl font-bold">
                  {warranties.reduce((sum, w) => sum + (w.warranty_claims?.length || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by serial number, product, or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'expired', 'void'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowClaimDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Claim
          </Button>
          <Button 
            variant="outline"
            onClick={async () => {
              if (filteredWarranties.length === 0) return;
              const { generateBulkWarrantyCertificates } = await import('@/utils/warrantyPDF');
              await generateBulkWarrantyCertificates(filteredWarranties);
            }}
            disabled={filteredWarranties.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Bulk PDF ({filteredWarranties.length})
          </Button>
          <BulkWarrantyImport onSuccess={fetchWarranties} />
          <SerialNumberImport onImportComplete={fetchWarranties} />
        </div>
      </div>

      {/* Warranties Table */}
      <Card>
        <CardHeader>
          <CardTitle>Warranty Registry</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serial Number</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Claims</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWarranties.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {searchTerm ? "No warranties found matching your search." : "No warranties found."}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredWarranties.map((warranty) => (
                  <TableRow key={warranty.id}>
                    <TableCell className="font-medium">{warranty.serial_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{warranty.product?.name}</div>
                        {warranty.product?.sku && (
                          <div className="text-sm text-muted-foreground">
                            SKU: {warranty.product.sku}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{warranty.customer?.contact_person}</div>
                        {warranty.customer?.company_name && (
                          <div className="text-sm text-muted-foreground">
                            {warranty.customer.company_name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{warranty.warranty_type}</TableCell>
                    <TableCell>{warranty.warranty_period_months} months</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span className="text-sm">
                          {format(new Date(warranty.warranty_end_date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(warranty.status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {warranty.warranty_claims?.length || 0} claims
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                         <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedWarranty(warranty);
                            setShowClaimDialog(true);
                          }}
                          disabled={warranty.status !== 'active'}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Claim
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            const { generateWarrantyCertificate } = await import('@/utils/warrantyPDF');
                            await generateWarrantyCertificate(warranty);
                          }}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          PDF
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Claim Dialog */}
      <Dialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Warranty Claim</DialogTitle>
          </DialogHeader>
          
          {selectedWarranty && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium">{selectedWarranty.product?.name}</h4>
                <p className="text-sm text-muted-foreground">
                  Serial: {selectedWarranty.serial_number} • 
                  Customer: {selectedWarranty.customer?.contact_person}
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Claim Type</label>
                  <Select 
                    value={claimForm.claim_type} 
                    onValueChange={(value) => setClaimForm(prev => ({ ...prev, claim_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select claim type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="defect">Product Defect</SelectItem>
                      <SelectItem value="malfunction">Malfunction</SelectItem>
                      <SelectItem value="damage">Physical Damage</SelectItem>
                      <SelectItem value="performance">Performance Issue</SelectItem>
                      <SelectItem value="replacement">Replacement Request</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={claimForm.description}
                    onChange={(e) => setClaimForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the issue in detail..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Claim Amount (Optional)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={claimForm.claim_amount}
                    onChange={(e) => setClaimForm(prev => ({ ...prev, claim_amount: parseFloat(e.target.value) || 0 }))}
                    placeholder="Enter claim amount"
                  />
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowClaimDialog(false)}
              disabled={isProcessingClaim}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateClaim}
              disabled={isProcessingClaim || !claimForm.claim_type || !claimForm.description}
            >
              {isProcessingClaim ? 'Processing...' : 'Create Claim'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WarrantyIntegrationTab;