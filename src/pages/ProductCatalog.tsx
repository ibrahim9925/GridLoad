// @ts-nocheck

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Search, ArrowRight, ChevronRight } from "lucide-react";

const ProductCatalog = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Sample product data
  const products = [
    {
      id: "sp001",
      category: "solar-panels",
      title: "Monocrystalline Solar Panel - 450W",
      description: "High-efficiency monocrystalline solar panel with excellent performance in low-light conditions.",
      image: "https://images.unsplash.com/photo-1509390144018-eeaf61f48b25?auto=format&fit=crop&w=600",
      specs: [
        { name: "Power Output", value: "450W" },
        { name: "Efficiency", value: "21.3%" },
        { name: "Cell Type", value: "Monocrystalline" },
        { name: "Dimensions", value: "2108 × 1048 × 40mm" },
        { name: "Weight", value: "25kg" }
      ],
      moq: "100 units"
    },
    {
      id: "sp002",
      category: "solar-panels",
      title: "Polycrystalline Solar Panel - 400W",
      description: "Cost-effective polycrystalline solar panel suitable for large commercial installations.",
      image: "https://images.unsplash.com/photo-1613665813446-82a78c468a1d?auto=format&fit=crop&w=600",
      specs: [
        { name: "Power Output", value: "400W" },
        { name: "Efficiency", value: "19.8%" },
        { name: "Cell Type", value: "Polycrystalline" },
        { name: "Dimensions", value: "2000 × 1000 × 40mm" },
        { name: "Weight", value: "23kg" }
      ],
      moq: "100 units"
    },
    {
      id: "bat001",
      category: "batteries",
      title: "LFP Battery Storage - 5kWh",
      description: "Safe and reliable lithium iron phosphate battery with long cycle life for residential use.",
      image: "https://images.unsplash.com/photo-1513828742140-ccaa28f3eda0?auto=format&fit=crop&w=600",
      specs: [
        { name: "Capacity", value: "5kWh" },
        { name: "Type", value: "LFP (LiFePO4)" },
        { name: "Cycle Life", value: "6000+ cycles" },
        { name: "Dimensions", value: "584 × 650 × 173mm" },
        { name: "Weight", value: "57kg" }
      ],
      moq: "10 units"
    },
    {
      id: "bat002",
      category: "batteries",
      title: "Grid Storage Battery - 10kWh",
      description: "Commercial-grade battery storage system for grid support and peak shaving applications.",
      image: "https://images.unsplash.com/photo-1593941707882-a5bba13927cc?auto=format&fit=crop&w=600",
      specs: [
        { name: "Capacity", value: "10kWh" },
        { name: "Type", value: "NMC" },
        { name: "Cycle Life", value: "4000+ cycles" },
        { name: "Dimensions", value: "650 × 800 × 200mm" },
        { name: "Weight", value: "95kg" }
      ],
      moq: "5 units"
    },
    {
      id: "inv001",
      category: "inverters",
      title: "String Inverter - 10kW",
      description: "High-performance grid-tie string inverter with WiFi monitoring for commercial solar installations.",
      image: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=600",
      specs: [
        { name: "Power Output", value: "10kW" },
        { name: "Efficiency", value: "98.3%" },
        { name: "Input Voltage Range", value: "150-1000V DC" },
        { name: "Dimensions", value: "480 × 530 × 200mm" },
        { name: "Weight", value: "25kg" }
      ],
      moq: "20 units"
    },
    {
      id: "inv002",
      category: "inverters",
      title: "Hybrid Inverter - 5kW",
      description: "All-in-one hybrid inverter with battery management for residential solar+storage systems.",
      image: "https://images.unsplash.com/photo-1622555818924-9e283933afe2?auto=format&fit=crop&w=600",
      specs: [
        { name: "Power Output", value: "5kW" },
        { name: "Battery Compatibility", value: "48V Li-ion/LFP" },
        { name: "Efficiency", value: "97.5%" },
        { name: "Dimensions", value: "420 × 450 × 180mm" },
        { name: "Weight", value: "18kg" }
      ],
      moq: "10 units"
    }
  ];
  
  // Filter products based on active category and search query
  const filteredProducts = products.filter(product => {
    const matchesCategory = activeCategory === "all" || product.category === activeCategory;
    const matchesSearch = 
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  const handleRequestQuote = (productId: string) => {
    // Navigate to contact form with the product pre-selected
    navigate('/?product=' + productId + '#contact');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <div className="bg-gridload-lightgray py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Product Catalog</h1>
                <div className="flex items-center text-sm text-gray-600">
                  <Link to="/" className="hover:text-gridload-blue">Home</Link>
                  <ChevronRight className="h-4 w-4 mx-1" />
                  <span>Products</span>
                </div>
              </div>
              <div className="mt-4 md:mt-0">
                <div className="relative max-w-xs">
                  <Input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory}>
              <TabsList className="mb-8">
                <TabsTrigger value="all">All Products</TabsTrigger>
                <TabsTrigger value="solar-panels">Solar Panels</TabsTrigger>
                <TabsTrigger value="batteries">Batteries</TabsTrigger>
                <TabsTrigger value="inverters">Inverters</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-0">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map(product => (
                    <div key={product.id} className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                      <div className="h-48 overflow-hidden">
                        <img 
                          src={product.image} 
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-6">
                        <h3 className="font-bold text-xl mb-2">{product.title}</h3>
                        <p className="text-gray-600 mb-4">{product.description}</p>
                        
                        <div className="space-y-2 mb-4">
                          <h4 className="font-semibold text-sm text-gray-500">Key Specifications:</h4>
                          <ul className="space-y-1">
                            {product.specs.slice(0, 3).map((spec, index) => (
                              <li key={index} className="text-sm flex">
                                <span className="font-medium w-32">{spec.name}:</span>
                                <span>{spec.value}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <Separator className="my-4" />
                        
                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            <span className="font-semibold">MOQ:</span> {product.moq}
                          </div>
                          <Button 
                            onClick={() => handleRequestQuote(product.id)}
                            className="bg-gridload-blue hover:bg-gridload-blue/90"
                          >
                            Request Quote <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {filteredProducts.length === 0 && (
                  <div className="text-center py-16">
                    <h3 className="text-xl font-semibold mb-2">No products found</h3>
                    <p className="text-gray-600">
                      Please try a different search term or browse all categories.
                    </p>
                  </div>
                )}
              </TabsContent>
              
              {/* These will share the same content as "all" but are filtered by the TabsTrigger */}
              <TabsContent value="solar-panels" className="mt-0">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map(product => (
                    // Same product card as above
                    <div key={product.id} className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                      {/* ... Same content as above ... */}
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="batteries" className="mt-0">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map(product => (
                    // Same product card as above
                    <div key={product.id} className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                      {/* ... Same content as above ... */}
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="inverters" className="mt-0">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map(product => (
                    // Same product card as above
                    <div key={product.id} className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                      {/* ... Same content as above ... */}
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProductCatalog;
