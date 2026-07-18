// @ts-nocheck

import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/site/Logo";
import { 
  Menu,
  X,
} from "lucide-react";

const Navbar = () => {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToSection = (sectionId: string) => {
    setIsMobileMenuOpen(false);
    if (location.pathname !== '/') {
      window.location.href = `/#${sectionId}`;
      return;
    }
    
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white shadow-md py-2' : 'bg-transparent py-4'
      }`}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link to="/" className="flex items-center" aria-label="GridLoad home">
              <Logo heightClass="h-9" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/products"
              className="text-gray-700 hover:text-gridload-blue transition-colors"
            >
              Products
            </Link>
            <button
              onClick={() => scrollToSection('why-us')}
              className="text-gray-700 hover:text-gridload-blue transition-colors"
            >
              Why Us
            </button>
            <Link
              to="/contact"
              className="text-gray-700 hover:text-gridload-blue transition-colors"
            >
              Contact
            </Link>
            <Button
              variant="outline"
              className="border-gridload-blue text-gridload-blue hover:bg-gridload-blue hover:text-white"
              onClick={() => scrollToSection('contact')}
            >
              Request a Quote
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 py-4 bg-white rounded-lg shadow-lg">
            <nav className="flex flex-col space-y-4">
              <Link
                to="/products"
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-gridload-blue"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Products
              </Link>
              <button
                onClick={() => scrollToSection('why-us')}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-gridload-blue w-full text-left"
              >
                Why Us
              </button>
              <Link
                to="/contact"
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-gridload-blue"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Contact
              </Link>
              <div className="px-4">
                <Button
                  className="w-full bg-gridload-yellow text-gridload-black hover:bg-gridload-yellow/90"
                  onClick={() => scrollToSection('contact')}
                >
                  Request a Quote
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
