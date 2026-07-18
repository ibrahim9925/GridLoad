// @ts-nocheck
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, MoreHorizontal, Phone, Mail, Edit, Trash2, Star } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSuppliers } from '@/hooks/useSuppliers';
import { DeleteConfirmationDialog } from '@/components/admin/DeleteConfirmationDialog';
import { useDeletionImpactAnalysis } from '@/hooks/useDeletionImpactAnalysis';
import { BulkSupplierOperations } from './BulkSupplierOperations';

interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  payment_terms: string;
  lead_time_days: number;
  quality_rating: number;
  delivery_rating: number;
  min_order_amount: number;
  is_active: boolean;
  created_at: string;
}

export const SuppliersSection = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { suppliers, isLoading, createSupplier, updateSupplier, deleteSupplier, refetch: fetchSuppliers } = useSuppliers();
  const { 
    isAnalyzing, 
    analyzeSupplierDeletion 
  } = useDeletionImpactAnalysis();
  
  const [impactAnalysis, setImpactAnalysis] = useState<any>(null);

  const filteredSuppliers = suppliers?.filter((supplier: Supplier) => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.contact_person.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || 
                         (filterStatus === "active" && supplier.is_active) ||
                         (filterStatus === "inactive" && !supplier.is_active);
    return matchesSearch && matchesFilter;
  }) || [];

  const getQualityBadge = (rating: number) => {
    if (rating >= 4.5) return <Badge variant="default" className="bg-success text-success-foreground">Excellent</Badge>;
    if (rating >= 3.5) return <Badge variant="secondary">Good</Badge>;
    if (rating >= 2.5) return <Badge variant="outline">Average</Badge>;
    return <Badge variant="destructive">Poor</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleDeleteClick = async (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setDeleteDialogOpen(true);
    
    // Analyze deletion impact
    try {
      const analysis = await analyzeSupplierDeletion(supplier.id);
      setImpactAnalysis(analysis);
    } catch (error) {
      console.error('Failed to analyze deletion impact:', error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!supplierToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteSupplier(supplierToDelete.id);
      setDeleteDialogOpen(false);
      setSupplierToDelete(null);
      setImpactAnalysis(null);
    } catch (error) {
      console.error('Failed to delete supplier:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSupplierToDelete(null);
    setImpactAnalysis(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading suppliers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bulk Operations */}
      <BulkSupplierOperations 
        suppliers={filteredSuppliers} 
        onSuppliersUpdated={() => {
          // Trigger a refresh of suppliers data without page reload
          fetchSuppliers();
        }}
      />

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant={filterStatus === "all" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilterStatus("all")}
          >
            All
          </Button>
          <Button 
            variant={filterStatus === "active" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilterStatus("active")}
          >
            Active
          </Button>
          <Button 
            variant={filterStatus === "inactive" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilterStatus("inactive")}
          >
            Inactive
          </Button>
        </div>
      </div>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Payment Terms</TableHead>
                <TableHead>Lead Time</TableHead>
                <TableHead>Min Order</TableHead>
                <TableHead>Quality Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {searchTerm ? "No suppliers found matching your search." : "No suppliers found."}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((supplier: Supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{supplier.name}</div>
                        <div className="text-sm text-muted-foreground">{supplier.contact_person}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" />
                          {supplier.email}
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {supplier.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{supplier.payment_terms}</TableCell>
                    <TableCell>{supplier.lead_time_days} days</TableCell>
                    <TableCell>{formatCurrency(supplier.min_order_amount)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${
                                i < supplier.quality_rating ? 'text-yellow-400 fill-current' : 'text-muted-foreground'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {supplier.quality_rating.toFixed(1)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={supplier.is_active ? "default" : "secondary"}>
                        {supplier.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            View Performance
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Create Purchase Order
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDeleteClick(supplier)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        title="Delete Supplier"
        itemName={supplierToDelete?.name}
        isLoading={isDeleting}
        impactAnalysis={impactAnalysis}
        isAnalyzing={isAnalyzing}
      />
    </div>
  );
};