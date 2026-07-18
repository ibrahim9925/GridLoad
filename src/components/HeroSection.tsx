// @ts-nocheck

import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useSiteContent } from "@/hooks/useSiteContent";

const HeroSection = () => {
  const { content } = useSiteContent("hero_section");
  if (!content) return null;
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-white to-gridload-lightgray">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
          <div className="flex-1 space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              {content.title}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl">
              {content.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="bg-gridload-yellow text-gridload-black hover:bg-gridload-yellow/90"
                onClick={() => {
                  const contactSection = document.getElementById('contact');
                  if (contactSection) {
                    contactSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                {content.primaryButtonText || "Request a Quote"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-gridload-black hover:bg-gridload-black hover:text-white"
                onClick={() => {
                  const productSection = document.getElementById('products');
                  if (productSection) {
                    productSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                {content.secondaryButtonText || "Explore Products"}
              </Button>
            </div>
          </div>
          <div className="flex-1 mt-8 md:mt-0">
            <img 
              src={content.imageUrl}
              alt={content.title}
              className="rounded-lg shadow-xl w-full max-w-md mx-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
export default HeroSection;
