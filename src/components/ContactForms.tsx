// @ts-nocheck
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BuyerForm } from "./contact/BuyerForm";
import { SupplierForm } from "./contact/SupplierForm";
import { FormData } from "./contact/types";
import { useSiteContent } from "@/hooks/useSiteContent";

const ContactForms = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("buyer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    company: "",
    country: "",
    productType: "",
    volume: "",
    message: "",
    certifications: "",
    capacity: "",
  });
  const { content } = useSiteContent("contact_forms");

  // Fixed handleChange function with proper type handling
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string,
    field?: string
  ) => {
    if (typeof e === "string" && field) {
      // Handle case where the first parameter is a string (from Select)
      setFormData({
        ...formData,
        [field]: e,
      });
    } else if (typeof e === "object" && 'target' in e) {
      // Handle case where e is an event (from Input or Textarea)
      const { name, value } = e.target;
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const validateForm = () => {
    const requiredFields = ['name', 'email', 'company', 'productType', 'message'];
    
    if (!formData.email.includes('@') || !formData.email.includes('.')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return false;
    }
    
    for (const field of requiredFields) {
      if (!formData[field as keyof FormData]) {
        toast({
          title: "Missing information",
          description: `Please fill in all required fields`,
          variant: "destructive",
        });
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Form submitted successfully",
        description: activeTab === "buyer" 
          ? "We'll get back to you with product options soon." 
          : "Thank you for your interest in becoming a supplier.",
      });
      
      setIsSubmitting(false);
      setFormData({
        name: "",
        email: "",
        company: "",
        country: "",
        productType: "",
        volume: "",
        message: "",
        certifications: "",
        capacity: "",
      });
    }, 1500);
  };

  return (
    <section id="contact" className="section-padding bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {content?.sectionTitle || "Contact GridLoad"}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {content?.sectionSubtitle ||
              "Whether you're looking to source renewable energy products or become a supplier, we're here to help. Fill out the appropriate form below and our team will get back to you promptly."}
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
          <Tabs defaultValue="buyer" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 w-full h-auto rounded-none">
              <TabsTrigger 
                value="buyer" 
                className="py-3 rounded-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-gridload-blue"
              >
                {content?.buyerTab || "Request a Quote"}
              </TabsTrigger>
              <TabsTrigger 
                value="supplier" 
                className="py-3 rounded-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-gridload-green"
                id="supplier-form"
              >
                {content?.supplierTab || "Become a Supplier"}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="buyer" className="p-6 focus-visible:outline-none">
              <BuyerForm 
                formData={formData}
                handleChange={handleChange}
                handleSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            </TabsContent>
            
            <TabsContent value="supplier" className="p-6 focus-visible:outline-none">
              <SupplierForm
                formData={formData}
                handleChange={handleChange}
                handleSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
};

export default ContactForms;
