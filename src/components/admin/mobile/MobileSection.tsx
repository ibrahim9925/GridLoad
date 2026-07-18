// @ts-nocheck
import React, { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  icon: any;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

const MobileSection: React.FC<Props> = ({ icon: Icon, title, subtitle, defaultOpen = false, children, className }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={cn("border rounded-xl bg-card", className)}>
        <CollapsibleTrigger className="w-full flex items-center justify-between p-4 min-h-[56px] text-left">
          <div className="flex items-center gap-3 min-w-0">
            <Icon className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold truncate">{title}</p>
              {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
            </div>
          </div>
          <ChevronDown className={cn("h-5 w-5 transition-transform shrink-0", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 border-t">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default MobileSection;
