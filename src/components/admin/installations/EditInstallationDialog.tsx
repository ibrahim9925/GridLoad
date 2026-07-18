// @ts-nocheck

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Customer {
  id: string;
  contact_person: string;
  company_name: string | null;
}

interface Engineer {
  id: string;
  full_name: string;
}

interface Installation {
  id: string;
  scheduled_date: string | null;
  status: string | null;
  site_address: string | null;
  completion_date: string | null;
  installation_notes: string | null;
  customer_id: string;
  assigned_engineer: string | null;
}

interface EditInstallationDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  installation: Installation | null;
}

type InstallationStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

const EditInstallationDialog = ({ open, onClose, onSave, installation }: EditInstallationDialogProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedEngineer, setSelectedEngineer] = useState("");
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [completionDate, setCompletionDate] = useState<Date>();
  const [siteAddress, setSiteAddress] = useState("");
  const [status, setStatus] = useState<InstallationStatus>("scheduled");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchCustomers();
      fetchEngineers();
      
      if (installation) {
        setSelectedCustomer(installation.customer_id);
        setSelectedEngineer(installation.assigned_engineer || "");
        setScheduledDate(installation.scheduled_date ? new Date(installation.scheduled_date) : undefined);
        setCompletionDate(installation.completion_date ? new Date(installation.completion_date) : undefined);
        setSiteAddress(installation.site_address || "");
        setStatus((installation.status as InstallationStatus) || "scheduled");
        setNotes(installation.installation_notes || "");
      }
    }
  }, [open, installation]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, contact_person, company_name")
        .order("contact_person");
      
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchEngineers = async () => {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      
      if (error) throw error;
      setEngineers(data || []);
    } catch (error) {
      console.error("Error fetching engineers:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!installation) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("installations")
        .update({
          customer_id: selectedCustomer,
          assigned_engineer: selectedEngineer || null,
          scheduled_date: scheduledDate ? scheduledDate.toISOString().split('T')[0] : null,
          completion_date: completionDate ? completionDate.toISOString().split('T')[0] : null,
          site_address: siteAddress || null,
          status,
          installation_notes: notes || null,
        })
        .eq("id", installation.id);

      if (error) throw error;

      toast({
        title: "Installation updated",
        description: "Installation has been updated successfully.",
      });

      onSave();
      onClose();
    } catch (error: any) {
      console.error("Error updating installation:", error);
      toast({
        variant: "destructive",
        title: "Error updating installation",
        description: error?.message || "Unknown error. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Installation</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.contact_person} {customer.company_name && `(${customer.company_name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="engineer">Assigned Engineer</Label>
              <Select value={selectedEngineer} onValueChange={setSelectedEngineer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select engineer" />
                </SelectTrigger>
                <SelectContent>
                  {engineers.map((engineer) => (
                    <SelectItem key={engineer.id} value={engineer.id}>
                      {engineer.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Scheduled Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !scheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Completion Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !completionDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {completionDate ? format(completionDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={completionDate}
                    onSelect={setCompletionDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value: InstallationStatus) => setStatus(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="site_address">Site Address</Label>
            <Input
              id="site_address"
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              placeholder="Installation site address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Installation Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special instructions or notes for the installation"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Installation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditInstallationDialog;
