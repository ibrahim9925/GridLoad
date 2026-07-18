// @ts-nocheck
import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backTo?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Sticky detail-page header. Yellow accent strip, back chevron left,
 * centered title, primary action right.
 */
const MobileDetailHeader: React.FC<Props> = ({ title, subtitle, onBack, backTo, action, className }) => {
  const navigate = useNavigate();
  const handleBack = () => {
    if (onBack) return onBack();
    if (backTo) return navigate(backTo);
    navigate(-1);
  };
  return (
    <div
      className={cn(
        "sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border",
        "shadow-[0_1px_0_0_hsl(var(--primary))]",
        className
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2 min-h-[56px]">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          aria-label="Back"
          className="h-11 w-11 shrink-0 text-foreground hover:bg-primary/10"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex-1 min-w-0 text-center">
          <p className="font-semibold truncate text-base leading-tight">{title}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
        </div>
        <div className="shrink-0 flex items-center gap-1">{action}</div>
      </div>
    </div>
  );
};

export default MobileDetailHeader;
