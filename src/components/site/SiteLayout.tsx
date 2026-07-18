import { ReactNode } from "react";
import SiteNavbar from "./SiteNavbar";
import SiteFooter from "./SiteFooter";
import WhatsAppButton from "./WhatsAppButton";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SiteNavbar />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <WhatsAppButton />
    </div>
  );
}
