// @ts-nocheck
import React from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveTableRowProps {
  children: React.ReactNode;
  className?: string;
  mobileLayout?: React.ReactNode;
}

interface ResponsiveTableCellProps {
  children: React.ReactNode;
  className?: string;
  label?: string;
  hideOnMobile?: boolean;
}

export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <div className={cn("space-y-4", className)}>
        {children}
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <Table className={className}>
        {children}
      </Table>
    </div>
  );
}

export function ResponsiveTableHeader({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  
  if (isMobile) return null;
  
  return <TableHeader>{children}</TableHeader>;
}

export function ResponsiveTableBody({ children }: { children: React.ReactNode }) {
  return <TableBody>{children}</TableBody>;
}

export function ResponsiveTableRow({ children, className, mobileLayout }: ResponsiveTableRowProps) {
  const isMobile = useIsMobile();
  
  if (isMobile && mobileLayout) {
    return (
      <Card className={cn("p-4", className)}>
        <CardContent className="p-0">
          {mobileLayout}
        </CardContent>
      </Card>
    );
  }
  
  if (isMobile) {
    return (
      <Card className={cn("p-4", className)}>
        <CardContent className="p-0 space-y-2">
          {children}
        </CardContent>
      </Card>
    );
  }
  
  return <TableRow className={className}>{children}</TableRow>;
}

export function ResponsiveTableHead({ children, className }: { children: React.ReactNode; className?: string }) {
  return <TableHead className={className}>{children}</TableHead>;
}

export function ResponsiveTableCell({ children, className, label, hideOnMobile }: ResponsiveTableCellProps) {
  const isMobile = useIsMobile();
  
  if (isMobile && hideOnMobile) return null;
  
  if (isMobile) {
    return (
      <div className={cn("flex justify-between items-center", className)}>
        {label && <span className="font-medium text-sm text-muted-foreground">{label}:</span>}
        <span className="text-sm">{children}</span>
      </div>
    );
  }
  
  return <TableCell className={className}>{children}</TableCell>;
}