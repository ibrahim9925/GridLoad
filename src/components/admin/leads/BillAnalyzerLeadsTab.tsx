import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  fetchBillAnalyzerLeads,
  updateBillAnalyzerLeadStatus,
  type BillAnalyzerLead,
  type BillAnalyzerLeadStatus,
} from "@/services/billAnalyzerLeads";

const STATUSES: BillAnalyzerLeadStatus[] = ["new", "callback_requested", "contacted", "quoted", "closed"];

export default function BillAnalyzerLeadsTab() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<BillAnalyzerLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BillAnalyzerLeadStatus | "all">("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await fetchBillAnalyzerLeads();
    setLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Could not load bill analyzer leads", description: error });
      return;
    }
    setLeads(data);
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(
    () => (filter === "all" ? leads : leads.filter((l) => l.status === filter)),
    [filter, leads]
  );

  const setStatus = async (id: string, status: BillAnalyzerLeadStatus) => {
    const { error } = await updateBillAnalyzerLeadStatus(id, status);
    if (error) {
      toast({ variant: "destructive", title: "Update failed", description: error });
      return;
    }
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          All ({leads.length})
        </FilterChip>
        {STATUSES.map((s) => (
          <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)}>
            {labelStatus(s)} ({leads.filter((l) => l.status === s).length})
          </FilterChip>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>System</TableHead>
              <TableHead>Language / Location</TableHead>
              <TableHead>When</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Follow up</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No bill analyzer leads yet.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div className="font-medium">{lead.first_name || "Customer"}</div>
                    <div className="text-sm">{lead.phone}</div>
                    <div className="text-xs text-muted-foreground">{lead.email || "—"}</div>
                  </TableCell>
                  <TableCell>
                    <div>{lead.system_size ?? "—"} kW</div>
                    <div className="text-xs text-muted-foreground">
                      {lead.battery_capacity ? `${lead.battery_capacity} kWh battery` : "No battery"}
                      {" · "}
                      {lead.panels_required ?? "—"} panels
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Bill ₪{lead.monthly_bill ?? "—"} · savings after quote
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{(lead.language || "en").toUpperCase()}</div>
                    <div className="text-xs text-muted-foreground">{lead.location || "—"}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {lead.created_at ? new Date(lead.created_at).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell className="capitalize text-sm">{labelStatus(lead.status)}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => setStatus(lead.id, "contacted")}>
                      Contacted
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus(lead.id, "quoted")}>
                      Quoted
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus(lead.id, "closed")}>
                      Closed
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function labelStatus(status: string | null | undefined) {
  if (status === "callback_requested") return "Callback";
  return status || "new";
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs border ${
        active ? "bg-gridload-navy text-white border-gridload-navy" : "bg-white text-gridload-navy"
      }`}
    >
      {children}
    </button>
  );
}
