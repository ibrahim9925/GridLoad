// @ts-nocheck

import React from "react";
import { 
  Shield, 
  Package, 
  CheckCircle, 
  Users, 
  Globe 
} from "lucide-react";

const WhyUsSection = () => {
  const benefits = [
    {
      icon: <Shield className="h-12 w-12 text-gridload-green" />,
      title: "Quality Assurance",
      description: "All products are sourced from verified manufacturers with proper certifications and rigorous testing."
    },
    {
      icon: <Package className="h-12 w-12 text-gridload-blue" />,
      title: "Competitive Pricing",
      description: "Direct manufacturer relationships enable us to offer wholesale prices and favorable terms."
    },
    {
      icon: <CheckCircle className="h-12 w-12 text-gridload-yellow" />,
      title: "Reliable Delivery",
      description: "Streamlined logistics and shipping solutions to get your products delivered on schedule."
    },
    {
      icon: <Users className="h-12 w-12 text-gridload-green" />,
      title: "Expert Support",
      description: "Our team has extensive knowledge of renewable energy products and Chinese manufacturing."
    },
    {
      icon: <Globe className="h-12 w-12 text-gridload-blue" />,
      title: "Global Shipping",
      description: "We ship to over 120 countries worldwide with full tracking and insurance options."
    }
  ];
  
  return (
    <section id="why-us" className="section-padding bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose GridLoad</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We bridge the gap between international buyers and quality Chinese manufacturers of renewable energy products.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <div key={index} className="bg-gridload-lightgray p-6 rounded-lg hover:shadow-md transition-all">
              <div className="mb-4">{benefit.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
              <p className="text-gray-600">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUsSection;
