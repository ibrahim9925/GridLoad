// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  ArrowUp, 
  ArrowDown, 
  Package, 
  Search, 
  Filter,
  Calendar,
  User,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface StockMovement {
  id: string;
  product_id: string;
  movement_type: string;
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  created_at: string;
  created_by?: string;
  product?: {
    name: string;
    sku?: string;
  };
  staff?: {
    full_name: string;
  };
}

const StockMovementsTab = () => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStockMovements();
  }, []);

  const fetchStockMovements = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`*, product:products!stock_movements_product_id_fkey(name, sku, id)`)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      const rows = data || [];
      const userIds = Array.from(new Set(rows.map((r: any) => r.created_by).filter(Boolean)));
      let profMap: Record<string, string> = {};
      if (userIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        (profs || []).forEach((p: any) => {
          profMap[p.id] = p.full_name || p.email || 'User';
        });
      }
      setMovements(
        rows.map((d: any) => ({
          ...d,
          staff: { full_name: profMap[d.created_by] || (d.created_by ? '—' : 'System') },
        }))
      );
    } catch (error: any) {
      console.error('Error fetching stock movements:', error);
      toast({
        title: "Error",
        description: "Failed to fetch stock movements.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMovements = movements.filter(movement => {
    const matchesSearch = movement.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movement.product?.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movement.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || movement.movement_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in':
        return <ArrowUp className="h-4 w-4 text-green-600" />;
      case 'out':
        return <ArrowDown className="h-4 w-4 text-red-600" />;
      default:
        return <Package className="h-4 w-4 text-blue-600" />;
    }
  };

  const getMovementBadge = (type: string) => {
    const variants = {
      in: 'default',
      out: 'destructive',
      adjustment: 'secondary'
    } as const;
    
    return (
      <Badge variant={variants[type as keyof typeof variants] || 'secondary'}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (amount?: number) => {
    return amount ? new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount) : '-';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading stock movements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <ArrowUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Stock In (Today)</p>
                <p className="text-2xl font-bold text-green-600">
                  {movements.filter(m => 
                    m.movement_type === 'in' && 
                    new Date(m.created_at).toDateString() === new Date().toDateString()
                  ).reduce((sum, m) => sum + m.quantity, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <ArrowDown className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Stock Out (Today)</p>
                <p className="text-2xl font-bold text-red-600">
                  {movements.filter(m => 
                    m.movement_type === 'out' && 
                    new Date(m.created_at).toDateString() === new Date().toDateString()
                  ).reduce((sum, m) => sum + m.quantity, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Movements</p>
                <p className="text-2xl font-bold">{movements.length}</p>
                <p className="text-xs text-muted-foreground">Last 100 records</p>
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
            placeholder="Search by product name, SKU, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'in', 'out', 'adjustment'].map((type) => (
            <Button
              key={type}
              variant={filterType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {filteredMovements.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground text-sm">
            {searchTerm ? 'No movements found.' : 'No stock movements found.'}
          </p>
        ) : (
          filteredMovements.map((movement) => (
            <button
              key={movement.id}
              onClick={() => movement.product?.id && navigate(`/admin/products/${movement.product.id}`)}
              className="w-full text-left bg-card border rounded-xl p-3 space-y-1.5 active:bg-muted/40"
            >
              <div className="flex items-center justify-between">
                {getMovementBadge(movement.movement_type)}
                <span className={`font-bold ${movement.movement_type === 'out' ? 'text-red-600' : 'text-green-600'}`}>
                  {movement.movement_type === 'out' ? '-' : '+'}{movement.quantity}
                </span>
              </div>
              <div className="font-medium text-sm truncate">{movement.product?.name || '—'}</div>
              {movement.product?.sku && (
                <div className="text-[10px] text-muted-foreground">SKU: {movement.product.sku}</div>
              )}
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {movement.reference_type
                    ? `${movement.reference_type}${movement.reference_id ? ' #' + movement.reference_id.slice(-6) : ''}`
                    : '—'}
                </span>
                <span>{format(new Date(movement.created_at), 'MMM dd, HH:mm')}</span>
              </div>
              {movement.unit_cost ? (
                <div className="text-xs">Unit cost: {formatCurrency(movement.unit_cost)}</div>
              ) : null}
              <div className="text-[10px] text-muted-foreground">By {movement.staff?.full_name}</div>
            </button>
          ))
        )}
      </div>

      {/* Stock Movements Table - desktop */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>Stock Movement History</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {searchTerm ? "No movements found matching your search." : "No stock movements found."}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getMovementIcon(movement.movement_type)}
                        {getMovementBadge(movement.movement_type)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <button
                          className="font-medium hover:underline text-left"
                          onClick={() => movement.product?.id && navigate(`/admin/products/${movement.product.id}`)}
                        >
                          {movement.product?.name || '—'}
                        </button>
                        {movement.product?.sku && (
                          <div className="text-sm text-muted-foreground">SKU: {movement.product.sku}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={movement.movement_type === 'out' ? 'text-red-600' : 'text-green-600'}>
                        {movement.movement_type === 'out' ? '-' : '+'}{movement.quantity}
                      </span>
                    </TableCell>
                    <TableCell>{formatCurrency(movement.unit_cost)}</TableCell>
                    <TableCell>{formatCurrency(movement.total_cost)}</TableCell>
                    <TableCell>
                      {movement.reference_type && (
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span className="text-sm">
                            {movement.reference_type}
                            {movement.reference_id && ` #${movement.reference_id.slice(-8)}`}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span className="text-sm">
                          {format(new Date(movement.created_at), 'MMM dd, HH:mm')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {movement.staff?.full_name && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="text-sm">{movement.staff.full_name}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {movement.notes || '-'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockMovementsTab;