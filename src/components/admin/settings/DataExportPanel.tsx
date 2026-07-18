import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DataExportPanel = () => {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    const t = toast.loading("Preparing export… this may take up to a minute");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not signed in");

      const url = `https://azhysimjdcongthanzoy.supabase.co/functions/v1/export-all-data`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6aHlzaW1qZGNvbmd0aGFuem95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjAyOTAsImV4cCI6MjA5MDE5NjI5MH0.5tvxztAe-srvTgdPCKUbl5A8Afl7sac3IpiZvQ5-fAA",
        },
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Export failed (${res.status}): ${txt}`);
      }

      const blob = await res.blob();
      const dl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dl;
      a.download = `database_export_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(dl);

      toast.success("Export downloaded", { id: t });
    } catch (e) {
      toast.error((e as Error).message, { id: t });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export All Data</CardTitle>
        <CardDescription>
          Download a ZIP archive containing every table in your database as a separate CSV file.
          Includes a manifest with row counts. Admins only.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleExport} disabled={loading} size="lg">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Preparing export…
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export all data (.zip)
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-3">
          Large databases may take 30–60 seconds. Do not close the tab during export.
        </p>
      </CardContent>
    </Card>
  );
};

export default DataExportPanel;
