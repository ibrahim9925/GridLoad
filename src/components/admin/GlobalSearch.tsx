// @ts-nocheck

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface SearchResult {
  id: string;
  type: 'customer' | 'lead' | 'sale' | 'product' | 'installation';
  title: string;
  subtitle?: string;
  url: string;
}

const GlobalSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const searchData = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const results: SearchResult[] = [];

    try {
      // Search customers
      const { data: customers } = await supabase
        .from("customers")
        .select("id, contact_person, company_name, email")
        .or(`contact_person.ilike.%${searchQuery}%, company_name.ilike.%${searchQuery}%, email.ilike.%${searchQuery}%`)
        .limit(5);

      customers?.forEach((customer) => {
        results.push({
          id: customer.id,
          type: 'customer',
          title: customer.contact_person,
          subtitle: customer.company_name || customer.email,
          url: `/admin/customers`
        });
      });

      // Search leads with proper column hints
      const { data: leads } = await supabase
        .from("leads")
        .select(`
          id, source, notes,
          customers!leads_customer_id_fkey (contact_person, company_name)
        `)
        .or(`source.ilike.%${searchQuery}%, notes.ilike.%${searchQuery}%`)
        .limit(5);

      leads?.forEach((lead) => {
        const customer = lead.customers as any;
        results.push({
          id: lead.id,
          type: 'lead',
          title: customer?.contact_person || 'Unknown Contact',
          subtitle: `Lead from ${lead.source}`,
          url: `/admin/leads`
        });
      });

      // Search products
      const { data: products } = await supabase
        .from("products")
        .select("id, name, category, sku")
        .or(`name.ilike.%${searchQuery}%, category.ilike.%${searchQuery}%, sku.ilike.%${searchQuery}%`)
        .limit(5);

      products?.forEach((product) => {
        results.push({
          id: product.id,
          type: 'product',
          title: product.name,
          subtitle: `${product.category} - ${product.sku}`,
          url: `/admin/products`
        });
      });

      setResults(results);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchData(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleResultClick = (result: SearchResult) => {
    navigate(result.url);
    setIsOpen(false);
    setQuery("");
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'customer': return 'bg-blue-100 text-blue-800';
      case 'lead': return 'bg-green-100 text-green-800';
      case 'sale': return 'bg-purple-100 text-purple-800';
      case 'product': return 'bg-orange-100 text-orange-800';
      case 'installation': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search customers, leads, products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isOpen && (query || results.length > 0) && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-96 overflow-y-auto">
          <CardContent className="p-2">
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground">Searching...</div>
            ) : results.length > 0 ? (
              <div className="space-y-1">
                {results.map((result) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted cursor-pointer"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{result.title}</div>
                      {result.subtitle && (
                        <div className="text-sm text-muted-foreground">{result.subtitle}</div>
                      )}
                    </div>
                    <Badge className={getTypeColor(result.type)}>
                      {result.type}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : query ? (
              <div className="text-center py-4 text-muted-foreground">No results found</div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GlobalSearch;
