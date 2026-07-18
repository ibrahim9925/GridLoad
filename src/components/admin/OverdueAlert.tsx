// @ts-nocheck

import React, { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const OverdueAlert = () => {
  const [overdueCount, setOverdueCount] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOverdueCount();
  }, []);

  const fetchOverdueCount = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_schedules")
        .select("id", { count: "exact", head: true })
        .eq("status", "overdue");

      if (error) throw error;
      
      setOverdueCount(data?.length || 0);
    } catch (error) {
      console.error("Error fetching overdue count:", error);
    }
  };

  if (!isVisible || overdueCount === 0) return null;

  return (
    <Alert className="border-red-200 bg-red-50 mb-6">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-red-800">
            <strong>{overdueCount}</strong> payment{overdueCount > 1 ? "s" : ""} overdue
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/payments")}
            className="text-red-700 border-red-300 hover:bg-red-100"
          >
            <Eye className="h-3 w-3 mr-1" />
            View Payments
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="text-red-600 hover:bg-red-100"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default OverdueAlert;
