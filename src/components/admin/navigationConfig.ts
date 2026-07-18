import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Warehouse,
  Settings,
  CreditCard,
  Shield,
  DollarSign,
  Receipt,
  Truck,
  UserPlus,
  FileText,
  Boxes,
  Wrench,
  BarChart3,
  FileBarChart,
} from "lucide-react";

export type NavigationItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const NAVIGATION_SECTIONS: {
  label: string;
  items: NavigationItem[];
}[] = [
  {
    label: "Core",
    items: [
      { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
      { title: "Products", url: "/admin/products", icon: Package },
      { title: "Inventory", url: "/admin/inventory", icon: Boxes },
      { title: "Customers", url: "/admin/customers", icon: Users },
      { title: "Leads", url: "/admin/leads", icon: UserPlus },
      { title: "Sales", url: "/admin/sales", icon: ShoppingCart },
      { title: "Quotations", url: "/admin/quotations", icon: FileText },
      { title: "Invoices", url: "/admin/invoices", icon: FileBarChart },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Suppliers", url: "/admin/suppliers", icon: Truck },
      { title: "Purchasing", url: "/admin/purchasing", icon: Warehouse },
      { title: "Installations", url: "/admin/installations", icon: Wrench },
      { title: "Payments", url: "/admin/payments", icon: CreditCard },
      { title: "Warranties", url: "/admin/warranties", icon: Shield },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Expenses", url: "/admin/expenses", icon: Receipt },
      { title: "Banking", url: "/admin/banking", icon: DollarSign },
      { title: "Reports", url: "/admin/reports", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Settings", url: "/admin/settings", icon: Settings },
    ],
  },
];

export const DEPRECATED_ROUTES: string[] = [];
