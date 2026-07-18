// @ts-nocheck

import React from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import { SolarCalculator } from "@/components/solar/SolarCalculator";
import ProductsSection from "@/components/ProductsSection";
import WhyUsSection from "@/components/WhyUsSection";
import ContactForms from "@/components/ContactForms";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <HeroSection />
        <SolarCalculator />
        <ProductsSection />
        <WhyUsSection />
        <ContactForms />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
