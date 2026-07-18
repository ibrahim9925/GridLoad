// @ts-nocheck

import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface InstallationsHeaderProps {
  onAddInstallation: () => void;
}

const InstallationsHeader = ({ onAddInstallation }: InstallationsHeaderProps) => {
  return (
    <div className="flex justify-between items-center">
      <h1 className="text-2xl font-bold">Installation Management</h1>
      <Button size="sm" onClick={onAddInstallation}>
        <Plus className="mr-2 h-4 w-4" />
        Schedule Installation
      </Button>
    </div>
  );
};

export default InstallationsHeader;
