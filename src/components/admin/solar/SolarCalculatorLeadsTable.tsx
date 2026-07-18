// @ts-nocheck
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Eye, Phone, Mail, Zap, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface SolarCalculatorLeadsTableProps {
  filter: string;
}

export const SolarCalculatorLeadsTable: React.FC<SolarCalculatorLeadsTableProps> = ({ filter }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: leads, isLoading } = useQuery({
    queryKey: ["solar-calculator-leads", filter],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("*")
        .eq("lead_type", "solar_calculator")
        .not("calculator_data", "is", null)
        .order("created_at", { ascending: false });

      // Apply filters
      if (filter === "currency:USD") {
        // Filter will be applied in the component since we can't filter JSONB easily in the query
      } else if (filter === "currency:ILS") {
        // Filter will be applied in the component
      } else if (filter === "high-value") {
        // Filter will be applied in the component for systems > 10kW
      }

      const { data, error } = await query;
      if (error) throw error;

      // Apply client-side filtering for JSONB data
      let filteredData = data || [];
      
      if (filter === "currency:USD") {
        filteredData = filteredData.filter(lead => {
          const calculatorData = lead.calculator_data as any;
          return calculatorData?.currency === "USD";
        });
      } else if (filter === "currency:ILS") {
        filteredData = filteredData.filter(lead => {
          const calculatorData = lead.calculator_data as any;
          return calculatorData?.currency === "ILS";
        });
      } else if (filter === "high-value") {
        filteredData = filteredData.filter(lead => {
          const calculatorData = lead.calculator_data as any;
          return (calculatorData?.systemSizeKw || 0) > 10;
        });
      }

      // Apply search term
      if (searchTerm) {
        filteredData = filteredData.filter(lead =>
          lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.address?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      return filteredData;
    },
    enabled: true,
  });

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === "ILS") {
      return `₪${amount.toLocaleString()}`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-100 text-blue-800";
      case "contacted": return "bg-yellow-100 text-yellow-800";
      case "qualified": return "bg-green-100 text-green-800";
      case "proposal": return "bg-purple-100 text-purple-800";
      case "closed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-1/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search leads by name, email, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-3">
      {leads?.map((lead) => {
          const calculatorData = lead.calculator_data as any || {};
          const currency = calculatorData.currency || "USD";
          
          return (
            <Card key={lead.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  {/* Customer Info */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-lg">{lead.name}</h3>
                      <Badge className={getStatusColor(lead.status || "new")}>
                        {lead.status || "new"}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {lead.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {lead.phone}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(lead.created_at), "MMM dd, yyyy")}
                      </div>
                    </div>
                  </div>

                  {/* System Details */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">System Details</h4>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3 text-yellow-600" />
                        <span className="text-sm font-medium">
                          {calculatorData.systemSizeKw || 0} kW System
                        </span>
                      </div>
                      <div className="text-sm">
                        {calculatorData.panelCount || 0} panels
                      </div>
                      <div className="text-sm">
                        Battery: {calculatorData.batteryDetails ? "Yes" : "No"}
                      </div>
                    </div>
                  </div>

                  {/* Financial Info */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Financial</h4>
                    <div className="space-y-1">
                      <div className="text-lg font-bold text-primary">
                        {formatCurrency(calculatorData.estimatedCost || 0, currency)}
                      </div>
                      <div className="text-sm">
                        Monthly savings: {formatCurrency(calculatorData.monthlySavings || 0, currency)}
                      </div>
                      <div className="text-sm">
                        Payback: {calculatorData.paybackYears || 0} years
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Actions</h4>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button size="sm">
                        Contact
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Location: {lead.address}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {leads?.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="h-12 w-12 text-muted-foreground mx-auto mb-4 flex items-center justify-center">
              📊
            </div>
            <h3 className="text-lg font-medium mb-2">No solar calculator leads found</h3>
            <p className="text-muted-foreground">
              Leads will appear here once customers use the solar calculator and provide their contact information.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};