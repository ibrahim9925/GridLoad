// @ts-nocheck
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer: React.ReactNode;
  desktopClassName?: string;
}

/**
 * Renders as a centered Dialog on desktop and a bottom Sheet on mobile.
 * On mobile: 95vh, scrollable body, sticky footer.
 */
export const ResponsiveFormShell: React.FC<Props> = ({
  open, onOpenChange, title, children, footer, desktopClassName,
}) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[95vh] p-0 flex flex-col rounded-t-xl"
        >
          <SheetHeader className="px-4 py-3 border-b shrink-0">
            <SheetTitle className="text-left">{title}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
          <div className="border-t bg-background px-4 py-3 shrink-0 flex gap-2 [&>button]:flex-1 [&>button]:h-12 pb-[env(safe-area-inset-bottom)]">
            {footer}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-4xl max-h-[90vh] overflow-y-auto", desktopClassName)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
        <div className="flex justify-end gap-2 pt-4 border-t mt-4">{footer}</div>
      </DialogContent>
    </Dialog>
  );
};

export default ResponsiveFormShell;
