// @ts-nocheck

import React from "react";
import { Link } from "react-router-dom";
import Logo from "@/components/site/Logo";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Linkedin, 
  Twitter,
  ArrowUp,
  Shield
} from "lucide-react";

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-gridload-black text-white pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <Logo heightClass="h-9" className="mb-4" />
            <p className="text-gray-300 mb-4">
              The trusted connection between international buyers and quality Chinese manufacturers of renewable energy products.
            </p>
            <div className="flex space-x-4">
              <Link to="#" className="text-gray-300 hover:text-gridload-yellow">
                <Facebook size={20} />
              </Link>
              <Link to="#" className="text-gray-300 hover:text-gridload-yellow">
                <Twitter size={20} />
              </Link>
              <Link to="#" className="text-gray-300 hover:text-gridload-yellow">
                <Linkedin size={20} />
              </Link>
            </div>
          </div>
          
          <div>
            <h3 className="text-xl font-bold mb-4">Products</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/products" className="text-gray-300 hover:text-gridload-yellow">Solar Panels</Link>
              </li>
              <li>
                <Link to="/products" className="text-gray-300 hover:text-gridload-yellow">Battery Storage</Link>
              </li>
              <li>
                <Link to="/products" className="text-gray-300 hover:text-gridload-yellow">Inverters</Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-xl font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="text-gray-300 hover:text-gridload-yellow">Home</Link>
              </li>
              <li>
                <Link to="/products" className="text-gray-300 hover:text-gridload-yellow">Products</Link>
              </li>
              <li>
                <Link to="/#why-us" className="text-gray-300 hover:text-gridload-yellow">Why Us</Link>
              </li>
              <li>
                <Link to="/#contact" className="text-gray-300 hover:text-gridload-yellow">Contact</Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-xl font-bold mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <MapPin className="w-5 h-5 mr-2 text-gridload-yellow shrink-0 mt-0.5" />
                <span className="text-gray-300">
                  123 Business Center, Shanghai, China
                </span>
              </li>
              <li className="flex items-center">
                <Phone className="w-5 h-5 mr-2 text-gridload-yellow shrink-0" />
                <span className="text-gray-300">
                  +86 123 456 7890
                </span>
              </li>
              <li className="flex items-center">
                <Mail className="w-5 h-5 mr-2 text-gridload-yellow shrink-0" />
                <span className="text-gray-300">
                  info@gridload.com
                </span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-700 flex flex-col md:flex-row justify-between items-center">
          <div className="flex flex-col md:flex-row items-center gap-4 mb-4 md:mb-0">
            <p className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} GridLoad. All rights reserved.
            </p>
            <Link 
              to="/admin/login" 
              className="flex items-center text-gray-400 hover:text-gridload-yellow text-sm transition-colors"
            >
              <Shield className="h-4 w-4 mr-1" />
              Staff Portal
            </Link>
          </div>
          <button 
            onClick={scrollToTop}
            className="flex items-center text-gray-400 hover:text-gridload-yellow"
          >
            Back to top <ArrowUp className="ml-1 h-4 w-4" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
