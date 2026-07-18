// @ts-nocheck

import React from "react";
import { TableHeader, TableRow, TableHead } from "@/components/ui/table";

const InstallationTableHeader = () => (
  <TableHeader>
    <TableRow>
      <TableHead>Customer</TableHead>
      <TableHead className="hidden md:table-cell">Site Address</TableHead>
      <TableHead className="hidden lg:table-cell">Engineer</TableHead>
      <TableHead className="hidden sm:table-cell">Scheduled Date</TableHead>
      <TableHead>Status</TableHead>
      <TableHead className="text-right">Actions</TableHead>
    </TableRow>
  </TableHeader>
);

export default InstallationTableHeader;
