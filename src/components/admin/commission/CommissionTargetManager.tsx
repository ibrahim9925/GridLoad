// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CommissionTarget {
  id: string;
  sales_rep_id: string;
  target_period_start: string;
  target_period_end: string;
  target_amount: number;
  target_type: string;
  bonus_threshold: number;
  bonus_rate: number;
  staff?: {
    full_name: string;
  } | null;
}

interface CommissionTargetManagerProps {
  onTargetUpdate?: () => void;
}

const CommissionTargetManager = ({ onTargetUpdate }: CommissionTargetManagerProps) => {
  const [targets, setTargets] = useState<CommissionTarget[]>([]);
  const [salesReps, setSalesReps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<CommissionTarget | null>(null);
  const [formData, setFormData] = useState({
    sales_rep_id: "",
    target_period_start: "",
    target_period_end: "",
    target_amount: "",
    target_type: "monthly",
    bonus_threshold: "110",
    bonus_rate: "5",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTargets();
    fetchSalesReps();
  }, []);

  const fetchTargets = async () => {
    try {
      const { data, error } = await supabase
        .from("commission_targets")
        .select(`
          *,
          staff!commission_targets_sales_rep_id_fkey(full_name)
        `)
        .order("target_period_start", { ascending: false });

      if (error) throw error;
      
      // Transform data to handle potential null relationships
      const transformedData = (data || []).map(target => ({
        ...target,
        staff: target.staff ? {
          full_name: (target.staff as any).full_name || "Unknown"
        } : null
      }));
      
      setTargets(transformedData);
    } catch (error) {
      console.error("Error fetching targets:", error);
      toast({
        variant: "destructive",
        title: "Error loading targets",
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSalesReps = async () => {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("id, full_name")
        .eq("role", "sales_rep")
        .eq("is_active", true);

      if (error) throw error;
      setSalesReps(data || []);
    } catch (error) {
      console.error("Error fetching sales reps:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const targetData = {
        sales_rep_id: formData.sales_rep_id,
        target_period_start: formData.target_period_start,
        target_period_end: formData.target_period_end,
        target_amount: parseFloat(formData.target_amount),
        target_type: formData.target_type,
        bonus_threshold: parseFloat(formData.bonus_threshold),
        bonus_rate: parseFloat(formData.bonus_rate),
      };

      if (editingTarget) {
        const { error } = await supabase
          .from("commission_targets")
          .update(targetData)
          .eq("id", editingTarget.id);

        if (error) throw error;
        toast({
          title: "Target Updated",
          description: "Commission target has been updated successfully.",
        });
      } else {
        const { error } = await supabase
          .from("commission_targets")
          .insert(targetData);

        if (error) throw error;
        toast({
          title: "Target Created",
          description: "Commission target has been created successfully.",
        });
      }

      setDialogOpen(false);
      setEditingTarget(null);
      resetForm();
      fetchTargets();
      onTargetUpdate?.();
    } catch (error) {
      console.error("Error saving target:", error);
      toast({
        variant: "destructive",
        title: "Error saving target",
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      sales_rep_id: "",
      target_period_start: "",
      target_period_end: "",
      target_amount: "",
      target_type: "monthly",
      bonus_threshold: "110",
      bonus_rate: "5",
    });
  };

  const handleEdit = (target: CommissionTarget) => {
    setEditingTarget(target);
    setFormData({
      sales_rep_id: target.sales_rep_id,
      target_period_start: target.target_period_start,
      target_period_end: target.target_period_end,
      target_amount: target.target_amount.toString(),
      target_type: target.target_type,
      bonus_threshold: target.bonus_threshold.toString(),
      bonus_rate: target.bonus_rate.toString(),
    });
    setDialogOpen(true);
  };

  const getTargetStatusBadge = (target: CommissionTarget) => {
    const today = new Date();
    const startDate = new Date(target.target_period_start);
    const endDate = new Date(target.target_period_end);

    if (today < startDate) {
      return <Badge variant="outline">Upcoming</Badge>;
    } else if (today > endDate) {
      return <Badge variant="secondary">Completed</Badge>;
    } else {
      return <Badge variant="default">Active</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Commission Targets
          </span>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingTarget(null); }}>
                <Plus className="h-4 w-4 mr-2" />
                Set Target
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingTarget ? "Edit Commission Target" : "Set Commission Target"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sales_rep_id">Sales Representative</Label>
                  <Select
                    value={formData.sales_rep_id}
                    onValueChange={(value) => setFormData({ ...formData, sales_rep_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sales rep" />
                    </SelectTrigger>
                    <SelectContent>
                      {salesReps.map((rep) => (
                        <SelectItem key={rep.id} value={rep.id}>
                          {rep.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target_period_start">Start Date</Label>
                    <Input
                      id="target_period_start"
                      type="date"
                      value={formData.target_period_start}
                      onChange={(e) => setFormData({ ...formData, target_period_start: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target_period_end">End Date</Label>
                    <Input
                      id="target_period_end"
                      type="date"
                      value={formData.target_period_end}
                      onChange={(e) => setFormData({ ...formData, target_period_end: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_amount">Target Amount ($)</Label>
                  <Input
                    id="target_amount"
                    type="number"
                    step="0.01"
                    value={formData.target_amount}
                    onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_type">Target Type</Label>
                  <Select
                    value={formData.target_type}
                    onValueChange={(value) => setFormData({ ...formData, target_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bonus_threshold">Bonus Threshold (%)</Label>
                    <Input
                      id="bonus_threshold"
                      type="number"
                      step="0.01"
                      value={formData.bonus_threshold}
                      onChange={(e) => setFormData({ ...formData, bonus_threshold: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bonus_rate">Bonus Rate (%)</Label>
                    <Input
                      id="bonus_rate"
                      type="number"
                      step="0.01"
                      value={formData.bonus_rate}
                      onChange={(e) => setFormData({ ...formData, bonus_rate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : (editingTarget ? "Update Target" : "Set Target")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sales Rep</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Bonus Info</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {targets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  No commission targets found. Set your first target to get started.
                </TableCell>
              </TableRow>
            ) : (
              targets.map((target) => (
                <TableRow key={target.id}>
                  <TableCell className="font-medium">
                    {target.staff?.full_name}
                  </TableCell>
                  <TableCell>
                    {new Date(target.target_period_start).toLocaleDateString()} - {new Date(target.target_period_end).toLocaleDateString()}
                  </TableCell>
                  <TableCell>${target.target_amount.toFixed(2)}</TableCell>
                  <TableCell className="capitalize">{target.target_type}</TableCell>
                  <TableCell>
                    {target.bonus_threshold}% → +{target.bonus_rate}%
                  </TableCell>
                  <TableCell>
                    {getTargetStatusBadge(target)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(target)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default CommissionTargetManager;
