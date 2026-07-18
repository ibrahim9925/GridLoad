
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ExpenseDialog from "@/components/admin/ExpenseDialog";
import ExpenseStats from "@/components/admin/expenses/ExpenseStats";
import ExpenseFilters from "@/components/admin/expenses/ExpenseFilters";
import ExpenseTable from "@/components/admin/expenses/ExpenseTable";
import { useExpenseData } from "@/hooks/useExpenseData";

const Expenses = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const {
    expenses,
    filteredExpenses,
    stats,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    assignedFilter,
    setAssignedFilter,
    sourceFilter,
    setSourceFilter,
    isLoading,
    error,
    staff,
    fetchExpenses,
  } = useExpenseData();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading expenses...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <p className="text-destructive font-medium">Failed to load expenses</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => fetchExpenses()}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">
            Manage and track all business expenses
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </div>

      <ExpenseStats stats={stats} staffCount={staff.length} />

      <ExpenseFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        assignedFilter={assignedFilter}
        setAssignedFilter={setAssignedFilter}
        sourceFilter={sourceFilter}
        setSourceFilter={setSourceFilter}
        staff={staff}
      />

      <ExpenseTable 
        expenses={filteredExpenses} 
        totalExpenses={expenses.length}
        onDataChange={fetchExpenses}
      />

      <ExpenseDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={() => {
          setIsDialogOpen(false);
          fetchExpenses();
        }}
      />
    </div>
  );
};

export default Expenses;
