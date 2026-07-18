// @ts-nocheck
import React, { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import Logo from "@/components/site/Logo";
import { Home, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

import { NAVIGATION_SECTIONS } from "./navigationConfig";
import { NavigationGroup } from "./NavigationGroup";

const AdminSidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { setOpenMobile, isMobile } = useSidebar();

  // Auto-close drawer on mobile when route changes
  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [location.pathname, isMobile, setOpenMobile]);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link to="/admin/dashboard" className="flex items-center py-0.5">
          <Logo heightClass="h-7" />
        </Link>
        <p className="mt-1 text-xs text-muted-foreground pl-0.5">Admin Panel</p>
      </SidebarHeader>

      <SidebarContent>
        {NAVIGATION_SECTIONS.map(({ label, items }) => (
          <NavigationGroup key={label} label={label} items={items} />
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-3">
        <SidebarMenuButton asChild className="w-full">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <Home className="h-4 w-4" />
            <span>Return to Site</span>
          </Link>
        </SidebarMenuButton>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
            <Users className="h-3 w-3" />
          </div>
          <span className="truncate">{user?.email}</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AdminSidebar;
