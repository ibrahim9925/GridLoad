// @ts-nocheck
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import BuyerLeadsTable from "./BuyerLeadsTable";
import SupplierLeadsTable from "./SupplierLeadsTable";
import BillAnalyzerLeadsTab from "./BillAnalyzerLeadsTab";
import { SolarCalculatorAnalytics } from "../solar/SolarCalculatorAnalytics";
import SearchInput from "./SearchInput";
import type { Lead } from "@/hooks/useOptimizedLeadsData";

interface LeadsTabsProps {
  leads: Lead[];
  isLoading: boolean;
  onContactLead: (id: string) => void;
  onConvertLead: (id: string) => void;
  onEditLead: (lead: any) => void;
  onDeleteLead?: (id: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  assignedFilter: string;
  setAssignedFilter: (assigned: string) => void;
}

// Transform leads for BuyerLeadsTable format
const transformLeadToBuyerLead = (lead: Lead) => ({
  id: lead.id,
  name: lead.name || "Unknown",
  company: lead.company || "—",
  email: lead.email || "",
  product: lead.source ? lead.source.replace(/_/g, " ") : "General inquiry",
  quantity: lead.value ? `₪${Number(lead.value).toLocaleString()}` : "—",
  date: lead.created_at || "",
  status: lead.status || "new",
});

const LeadsTabs = ({ 
  leads, 
  isLoading, 
  onContactLead, 
  onConvertLead, 
  onEditLead,
  onDeleteLead,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  assignedFilter,
  setAssignedFilter
}: LeadsTabsProps) => {
  const [searchSupplier, setSearchSupplier] = useState("");

  // Transform leads to buyer format for the table
  const buyerLeads = leads.map(transformLeadToBuyerLead);

  const filteredBuyerLeads = buyerLeads.filter(
    (lead) =>
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.product.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // For suppliers, we'll use empty array for now since we don't have supplier applications in the current schema
  const filteredSupplierLeads: any[] = [];

  return (
    <Tabs defaultValue="buyers">
      <TabsList className="mb-4">
        <TabsTrigger value="buyers">Customer Inquiries ({buyerLeads.length})</TabsTrigger>
        <TabsTrigger value="bill-analyzer">Bill Analyzer</TabsTrigger>
        <TabsTrigger value="suppliers">Supplier Applications</TabsTrigger>
        <TabsTrigger value="solar">Solar Calculator</TabsTrigger>
      </TabsList>
      
      <TabsContent value="buyers">
        <Card>
          <CardContent className="pt-6">
            <SearchInput
              placeholder="Search customer leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <BuyerLeadsTable 
                leads={filteredBuyerLeads}
                isLoading={isLoading}
                onContactLead={onContactLead}
                onConvertLead={onConvertLead}
                onEditLead={onEditLead}
                onDeleteLead={onDeleteLead}
              />
            )}
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="bill-analyzer">
        <Card>
          <CardContent className="pt-6">
            <BillAnalyzerLeadsTab />
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="suppliers">
        <Card>
          <CardContent className="pt-6">
            <SearchInput
              placeholder="Search supplier applications..."
              value={searchSupplier}
              onChange={(e) => setSearchSupplier(e.target.value)}
            />
            
            <SupplierLeadsTable 
              leads={filteredSupplierLeads}
              isLoading={false}
            />
            
            <div className="text-center py-8 text-muted-foreground">
              Supplier application management coming soon.
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="solar">
        <SolarCalculatorAnalytics />
      </TabsContent>
    </Tabs>
  );
};

export default LeadsTabs;