// @ts-nocheck
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Trash2, X } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/admin/DeleteConfirmationDialog';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useToast } from '@/hooks/use-toast';

interface BulkDeletePurchaseOrdersProps {
  purchaseOrders: any[];
}

export const BulkDeletePurchaseOrders = ({ purchaseOrders }: BulkDeletePurchaseOrdersProps) => {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  const { deletePurchaseOrder } = usePurchaseOrders();
  const { toast } = useToast();

  // Filter out orders that can be safely deleted (draft, cancelled, or test orders)
  const deletableOrders = purchaseOrders.filter(order => 
    order.status === 'draft' || 
    order.status === 'cancelled' || 
    order.order_number?.toLowerCase().includes('test')
  );

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders(prev => [...prev, orderId]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
    }
  };

  const handleSelectAll = () => {
    const allDeletableIds = deletableOrders.map(order => order.id);
    if (selectedOrders.length === allDeletableIds.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(allDeletableIds);
    }
  };

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const orderId of selectedOrders) {
        try {
          await deletePurchaseOrder(orderId);
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Failed to delete order ${orderId}:`, error);
        }
      }

      toast({
        title: "Bulk Deletion Complete",
        description: `Successfully deleted ${successCount} orders. ${errorCount > 0 ? `Failed to delete ${errorCount} orders.` : ''}`,
        variant: successCount > 0 ? "default" : "destructive",
      });

      setBulkDeleteDialogOpen(false);
      setSelectedOrders([]);
    } catch (error) {
      toast({
        title: "Bulk Deletion Failed",
        description: "An error occurred during bulk deletion.",
        variant: "destructive",
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  if (deletableOrders.length === 0) {
    return null;
  }

  const bulkImpactAnalysis = {
    canDelete: true,
    dependencies: [
      {
        table: 'purchase_orders',
        count: selectedOrders.length,
        description: `${selectedOrders.length} purchase orders selected for deletion`
      }
    ],
    warnings: selectedOrders.length > 0 ? [
      'This will permanently delete the selected purchase orders',
      'Only draft, cancelled, or test orders are shown for bulk deletion'
    ] : []
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg border">
        <div className="flex items-center gap-4">
          <Checkbox
            checked={selectedOrders.length === deletableOrders.length && deletableOrders.length > 0}
            onCheckedChange={handleSelectAll}
          />
          <div>
            <h3 className="font-medium">Bulk Delete Test Orders</h3>
            <p className="text-sm text-muted-foreground">
              {deletableOrders.length} deletable orders found (draft, cancelled, or test orders)
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedOrders.length > 0 && (
            <>
              <Badge variant="secondary">
                {selectedOrders.length} selected
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedOrders([])}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setBulkDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Selected
              </Button>
            </>
          )}
        </div>
      </div>

      {deletableOrders.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Deletable Orders:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {deletableOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={selectedOrders.includes(order.id)}
                  onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {order.order_number || `Order ${order.id.slice(0, 8)}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <Badge variant="outline" className="mr-1">
                      {order.status?.toUpperCase()}
                    </Badge>
                    ${order.total_amount?.toFixed(2) || '0.00'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <DeleteConfirmationDialog
        open={bulkDeleteDialogOpen}
        onClose={() => setBulkDeleteDialogOpen(false)}
        onConfirm={handleBulkDelete}
        title="Bulk Delete Purchase Orders"
        itemName={`${selectedOrders.length} purchase orders`}
        isLoading={isBulkDeleting}
        impactAnalysis={bulkImpactAnalysis}
        isAnalyzing={false}
      />
    </div>
  );
};