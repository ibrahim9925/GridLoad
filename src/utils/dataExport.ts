// @ts-nocheck

export interface ExportColumn {
  key: string;
  label: string;
  formatter?: (value: any) => string;
}

export const exportToCSV = (data: any[], columns: ExportColumn[], filename: string) => {
  const headers = columns.map(col => col.label).join(',');
  
  const rows = data.map(item => 
    columns.map(col => {
      const value = item[col.key];
      const formattedValue = col.formatter ? col.formatter(value) : value;
      
      // Handle CSV escaping
      if (typeof formattedValue === 'string' && (formattedValue.includes(',') || formattedValue.includes('"') || formattedValue.includes('\n'))) {
        return `"${formattedValue.replace(/"/g, '""')}"`;
      }
      
      return formattedValue || '';
    }).join(',')
  );
  
  const csvContent = [headers, ...rows].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return '';
  return `$${value.toFixed(2)}`;
};

export const formatDate = (value: string | null) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString();
};

export const formatBoolean = (value: boolean | null) => {
  if (value === null || value === undefined) return '';
  return value ? 'Yes' : 'No';
};
