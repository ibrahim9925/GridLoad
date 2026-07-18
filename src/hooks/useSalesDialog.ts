// @ts-nocheck

import { useSalesDialogForm } from "@/hooks/useSalesDialogForm";

export const useSalesDialog = (open: boolean, sale?: any) => {
  // Directly re-expose the existing hook but as a single source for the dialog
  return useSalesDialogForm(open, sale);
};
