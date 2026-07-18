// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Package, CheckCircle, Clock, Settings, PlayCircle } from 'lucide-react';
import { useInstallationSalesIntegration } from '@/hooks/useInstallationSalesIntegration';

interface InstallationSalesIntegrationProps {
  installationId: string;
}

const InstallationSalesIntegration: React.FC<InstallationSalesIntegrationProps> = ({ 
  installationId 
}) => {
  const { 
    getInstallationItems,
    updateInstallationProgress,
    completeInstallation,
    isLoading
  } = useInstallationSalesIntegration();
  
  const [items, setItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [progressDialog, setProgressDialog] = useState(false);
  const [progressQuantity, setProgressQuantity] = useState(0);
  const [progressNotes, setProgressNotes] = useState('');

  useEffect(() => {
    loadItems();
  }, [installationId]);

  const loadItems = async () => {
    const installationItems = await getInstallationItems(installationId);
    setItems(installationItems);
  };

  const handleUpdateProgress = async () => {
    if (!selectedItem) return;
    
    await updateInstallationProgress(
      selectedItem.id,
      progressQuantity,
      progressNotes
    );
    
    setProgressDialog(false);
    loadItems();
  };

  const handleCompleteInstallation = async () => {
    await completeInstallation(installationId);
    loadItems();
  };

  const openProgressDialog = (item: any) => {
    setSelectedItem(item);
    setProgressQuantity(item.quantity_installed || 0);
    setProgressNotes(item.notes || '');
    setProgressDialog(true);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity_to_install, 0);
  const installedItems = items.reduce((sum, item) => sum + item.quantity_installed, 0);
  const overallProgress = totalItems > 0 ? (installedItems / totalItems) * 100 : 0;
  const allCompleted = items.every(item => item.status === 'completed');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Installation Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Progress</span>
                <span>{Math.round(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>
            
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>Total Items: {totalItems}</span>
              <span>Installed: {installedItems}</span>
              <span>Remaining: {totalItems - installedItems}</span>
            </div>

            {allCompleted && (
              <Button 
                onClick={handleCompleteInstallation}
                className="w-full"
                disabled={isLoading}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Installation Complete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium">
                    {item.sale_items?.products?.name || 'Product'}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    SKU: {item.sale_items?.products?.sku || 'N/A'}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <span>To Install: {item.quantity_to_install}</span>
                    <span>Installed: {item.quantity_installed}</span>
                    <Badge variant={
                      item.status === 'completed' ? 'default' :
                      item.status === 'in_progress' ? 'secondary' : 'outline'
                    }>
                      {item.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={(item.quantity_installed / item.quantity_to_install) * 100} 
                    className="w-20 h-2" 
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openProgressDialog(item)}
                    disabled={isLoading}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {item.notes && (
                <p className="mt-2 text-sm text-muted-foreground">{item.notes}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={progressDialog} onOpenChange={setProgressDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Installation Progress</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="quantity">Quantity Installed</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                max={selectedItem?.quantity_to_install || 0}
                value={progressQuantity}
                onChange={(e) => setProgressQuantity(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="notes">Installation Notes</Label>
              <Textarea
                id="notes"
                value={progressNotes}
                onChange={(e) => setProgressNotes(e.target.value)}
                placeholder="Add any notes about the installation progress..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setProgressDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateProgress} disabled={isLoading}>
                Update Progress
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InstallationSalesIntegration;