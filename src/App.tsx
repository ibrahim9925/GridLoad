// @ts-nocheck
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import Login from "@/pages/Login";

// Public site
import Home from "@/pages/site/Home";
import Products from "@/pages/site/Products";
import ProductDetail from "@/pages/site/ProductDetail";
import ProjectsPage from "@/pages/site/Projects";
import About from "@/pages/site/About";
import Contact from "@/pages/site/Contact";
import SiteNotFound from "@/pages/site/NotFound";

// Admin (existing CRM)
import Dashboard from "@/pages/admin/Dashboard";
import AdminLayout from "@/components/admin/AdminLayout";
import Customers from "@/pages/admin/Customers";
import AdminProducts from "@/pages/admin/Products";
import ProductLedger from "@/pages/admin/ProductLedger";
import Sales from "@/pages/admin/Sales";
import Leads from "@/pages/admin/Leads";
import InventoryManagement from "@/pages/admin/InventoryManagement";
import AdvancedAnalytics from "@/pages/admin/AdvancedAnalytics";
import Settings from "@/pages/admin/Settings";
import ErrorBoundary from "@/components/ErrorBoundary";
import AutomationHub from "@/pages/admin/AutomationHub";
import ComprehensivePayments from "@/pages/admin/ComprehensivePayments";
import Installations from "@/pages/admin/Installations";
import Expenses from "@/pages/admin/Expenses";
import Warranties from "@/pages/admin/Warranties";
import FinancialReports from "@/pages/admin/FinancialReports";
import CommissionManagement from "@/pages/admin/CommissionManagement";
import SecurityCenter from "@/pages/admin/SecurityCenter";
import Purchasing from "@/pages/admin/Purchasing";
import SupplyChain from "@/pages/admin/SupplyChain";
import Banking from "@/pages/admin/Banking";
import CashBundles from "@/pages/admin/CashBundles";
import Quotations from "@/pages/admin/Quotations";
import Reports from "@/pages/admin/Reports";
import MonthlyReconciliation from "@/pages/admin/MonthlyReconciliation";
import Fulfillment from "@/pages/admin/Fulfillment";
import TestMonitor from "@/pages/admin/TestMonitor";
import ProtectedRoute from "@/components/admin/ProtectedRoute";
import CustomerLedger from "@/pages/admin/CustomerLedger";
import Suppliers from "@/pages/admin/Suppliers";
import SupplierProfile from "@/pages/admin/SupplierProfile";
import Invoices from "@/pages/admin/Invoices";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
        <AuthProvider>
            <Toaster />
            <Routes>
              {/* Public GridLoad site */}
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:slug" element={<ProductDetail />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />

              {/* Admin Auth */}
              <Route path="/login" element={<Login />} />

              {/* Admin CRM */}
              <Route path="/admin/*" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <Routes>
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route path="customers/:id" element={<CustomerLedger />} />
                      <Route path="customers" element={<Customers />} />
                      <Route path="suppliers/:id" element={<SupplierProfile />} />
                      <Route path="suppliers" element={<Suppliers />} />
                      <Route path="invoices" element={<Invoices />} />
                      <Route path="leads" element={<Leads />} />
                      <Route path="products" element={<AdminProducts />} />
                      <Route path="products/:id" element={<ProductLedger />} />
                      <Route path="inventory" element={<InventoryManagement />} />
                      <Route path="sales" element={<Sales />} />
                      <Route path="payments" element={<ComprehensivePayments />} />
                      <Route path="purchasing" element={<Purchasing />} />
                      <Route path="supply-chain" element={<SupplyChain />} />
                      <Route path="banking" element={<Banking />} />
                      <Route path="banking/cash-bundles" element={<CashBundles />} />
                      <Route path="quotations" element={<Quotations />} />
                      <Route path="fulfillment" element={<Fulfillment />} />
                      <Route path="installations" element={<Installations />} />
                      <Route path="expenses" element={<Expenses />} />
                      <Route path="warranties" element={<Warranties />} />
                      <Route path="commission" element={<CommissionManagement />} />
                      <Route path="financial-reports" element={<FinancialReports />} />
                      <Route path="reports" element={<Reports />} />
                      <Route path="reports/reconciliation" element={<MonthlyReconciliation />} />
                      <Route path="analytics" element={<AdvancedAnalytics />} />
                      <Route path="automation" element={<AutomationHub />} />
                      <Route path="security" element={<SecurityCenter />} />
                      <Route path="test-monitor" element={<TestMonitor />} />
                      <Route path="settings" element={<Settings />} />
                      <Route path="" element={<Navigate to="dashboard" replace />} />
                    </Routes>
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="*" element={<SiteNotFound />} />
            </Routes>
        </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
