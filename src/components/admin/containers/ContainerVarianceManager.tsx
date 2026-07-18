// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle, Clock, Plus, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ContainerVariance {
  id: string;
  container_id: string;
  container_product_id: string | null;
  variance_type: 'shortage' | 'overage' | 'damage' | 'quality';
  expected_quantity: number;
  actual_quantity: number;
  variance_quantity: number;
  variance_value: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'resolved' | 'disputed';
  reported_by: string | null;
  resolved_by: string | null;
  reported_at: string;
  resolved_at: string | null;
  notes: string | null;
  resolution_notes: string | null;
  created_at: string;
  container?: {
    container_number: string;
    supplier?: {
      name: string;
    };
  };
  container_product?: {
    product_name: string;
    unit_cost: number;
  };
}

interface ContainerVarianceManagerProps {
  containerId?: string;
}

export const ContainerVarianceManager: React.FC<ContainerVarianceManagerProps> = ({ containerId }) => {
  const [variances, setVariances] = useState<ContainerVariance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVariance, setEditingVariance] = useState<ContainerVariance | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    container_id: containerId || '',
    variance_type: 'shortage' as 'shortage' | 'overage' | 'damage' | 'quality',
    expected_quantity: 0,
    actual_quantity: 0,
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    notes: '',
    resolution_notes: '',
  });

  useEffect(() => {
    fetchVariances();
  }, [containerId]);

  const fetchVariances = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('container_variances')
        .select(`
          *,
          container:containers(
            container_number,
            supplier:suppliers(name)
          ),
          container_product:container_products(
            product_name,
            unit_cost
          )
        `)
        .order('created_at', { ascending: false });

      if (containerId) {
        query = query.eq('container_id', containerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setVariances((data || []) as ContainerVariance[]);
    } catch (error: any) {
      console.error('Error fetching variances:', error);
      toast({
        title: "Error",
        description: "Failed to fetch container variances.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitVariance = async () => {
    try {
      const varianceQuantity = Math.abs(formData.expected_quantity - formData.actual_quantity);
      const isEditMode = editingVariance !== null;

      const varianceData = {
        ...formData,
        variance_quantity: varianceQuantity,
        variance_value: varianceQuantity * 10, // Placeholder calculation
        reported_by: null, // Will be set by RLS
      };

      if (isEditMode) {
        const { data, error } = await supabase
          .from('container_variances')
          .update(varianceData)
          .eq('id', editingVariance!.id)
          .select()
          .single();

        if (error) throw error;
        toast({
          title: "Success",
          description: "Variance updated successfully.",
        });
      } else {
        const { data, error } = await supabase
          .from('container_variances')
          .insert([varianceData])
          .select()
          .single();

        if (error) throw error;
        toast({
          title: "Success",
          description: "Variance reported successfully.",
        });
      }

      setIsDialogOpen(false);
      setEditingVariance(null);
      resetForm();
      fetchVariances();
    } catch (error: any) {
      console.error('Error saving variance:', error);
      toast({
        title: "Error",
        description: `Failed to ${editingVariance ? 'update' : 'create'} variance.`,
        variant: "destructive",
      });
    }
  };

  const handleResolveVariance = async (varianceId: string, resolutionNotes: string) => {
    try {
      const { error } = await supabase
        .from('container_variances')
        .update({
          status: 'resolved',
          resolution_notes: resolutionNotes,
          resolved_at: new Date().toISOString(),
          resolved_by: null, // Will be set by RLS
        })
        .eq('id', varianceId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Variance resolved successfully.",
      });
      fetchVariances();
    } catch (error: any) {
      console.error('Error resolving variance:', error);
      toast({
        title: "Error",
        description: "Failed to resolve variance.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      container_id: containerId || '',
      variance_type: 'shortage',
      expected_quantity: 0,
      actual_quantity: 0,
      severity: 'medium',
      notes: '',
      resolution_notes: '',
    });
  };

  const openEditDialog = (variance: ContainerVariance) => {
    setEditingVariance(variance);
    setFormData({
      container_id: variance.container_id,
      variance_type: variance.variance_type,
      expected_quantity: variance.expected_quantity,
      actual_quantity: variance.actual_quantity,
      severity: variance.severity,
      notes: variance.notes || '',
      resolution_notes: variance.resolution_notes || '',
    });
    setIsDialogOpen(true);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-500';
      case 'disputed': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredVariances = variances.filter(variance => 
    variance.container?.container_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    variance.container_product?.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    variance.variance_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Container Variances
          </CardTitle>
          <CardDescription>
            Track and manage delivery discrepancies and quality issues
          </CardDescription>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingVariance(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Report Variance
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingVariance ? 'Edit Variance' : 'Report New Variance'}
              </DialogTitle>
              <DialogDescription>
                Record any discrepancies found during container verification
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="variance_type">Variance Type</Label>
                  <Select
                    value={formData.variance_type}
                    onValueChange={(value: 'shortage' | 'overage' | 'damage' | 'quality') => setFormData(prev => ({ ...prev, variance_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shortage">Shortage</SelectItem>
                      <SelectItem value="overage">Overage</SelectItem>
                      <SelectItem value="damage">Damage</SelectItem>
                      <SelectItem value="quality">Quality Issue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="severity">Severity</Label>
                  <Select
                    value={formData.severity}
                    onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => setFormData(prev => ({ ...prev, severity: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expected_quantity">Expected Quantity</Label>
                  <Input
                    id="expected_quantity"
                    type="number"
                    value={formData.expected_quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, expected_quantity: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="actual_quantity">Actual Quantity</Label>
                  <Input
                    id="actual_quantity"
                    type="number"
                    value={formData.actual_quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, actual_quantity: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Describe the variance details..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              
              {editingVariance && (
                <div className="space-y-2">
                  <Label htmlFor="resolution_notes">Resolution Notes</Label>
                  <Textarea
                    id="resolution_notes"
                    placeholder="Resolution details..."
                    value={formData.resolution_notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, resolution_notes: e.target.value }))}
                  />
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitVariance}>
                {editingVariance ? 'Update' : 'Report'} Variance
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent>
        {!containerId && (
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search variances..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        )}
        
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 border rounded-lg animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredVariances.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No variances reported</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredVariances.map((variance) => (
              <div key={variance.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={`${getSeverityColor(variance.severity)} text-white`}>
                      {variance.severity.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className={getStatusColor(variance.status)}>
                      {variance.status.toUpperCase()}
                    </Badge>
                    <span className="font-medium">
                      {variance.variance_type.toUpperCase()} - {variance.container?.container_number}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(variance)}>
                      Edit
                    </Button>
                    {variance.status === 'pending' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleResolveVariance(variance.id, 'Resolved via quick action')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Expected: {variance.expected_quantity}</p>
                    <p className="text-muted-foreground">Actual: {variance.actual_quantity}</p>
                  </div>
                  <div>
                    <p className="font-medium">Variance: {variance.variance_quantity}</p>
                    <p className="text-muted-foreground">Value: ${variance.variance_value}</p>
                  </div>
                  <div>
                    <p className="font-medium">Product</p>
                    <p className="text-muted-foreground">{variance.container_product?.product_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="font-medium">Reported</p>
                    <p className="text-muted-foreground">
                      {format(new Date(variance.reported_at), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                
                {variance.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-sm"><strong>Notes:</strong> {variance.notes}</p>
                  </div>
                )}
                
                {variance.resolution_notes && (
                  <div className="pt-2 border-t bg-green-50 dark:bg-green-950 p-3 rounded">
                    <p className="text-sm"><strong>Resolution:</strong> {variance.resolution_notes}</p>
                    {variance.resolved_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Resolved on {format(new Date(variance.resolved_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};