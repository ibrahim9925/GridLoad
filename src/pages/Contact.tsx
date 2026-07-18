// @ts-nocheck

import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactForms from "@/components/ContactForms";
import { MapPin, Phone, Mail, MessageSquare } from "lucide-react";

const Contact = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gridload-lightgray py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Have questions about our products or services? Get in touch with our team and we'll be happy to assist you.
              </p>
            </div>
          </div>
        </section>
        
        {/* Contact Information */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-gridload-lightgray p-6 rounded-lg text-center hover:shadow-md transition-all">
                <div className="mx-auto w-12 h-12 bg-gridload-blue rounded-full flex items-center justify-center mb-4">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Our Location</h3>
                <p className="text-gray-600">
                  123 Business Center<br />
                  Shanghai, China<br />
                  200000
                </p>
              </div>
              
              <div className="bg-gridload-lightgray p-6 rounded-lg text-center hover:shadow-md transition-all">
                <div className="mx-auto w-12 h-12 bg-gridload-green rounded-full flex items-center justify-center mb-4">
                  <Phone className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Phone</h3>
                <p className="text-gray-600">
                  Main: +86 123 456 7890<br />
                  Support: +86 098 765 4321<br />
                  <span className="text-sm">Mon-Fri, 9am-6pm CST</span>
                </p>
              </div>
              
              <div className="bg-gridload-lightgray p-6 rounded-lg text-center hover:shadow-md transition-all">
                <div className="mx-auto w-12 h-12 bg-gridload-yellow rounded-full flex items-center justify-center mb-4">
                  <Mail className="h-6 w-6 text-gridload-black" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Email</h3>
                <p className="text-gray-600">
                  General: info@gridload.com<br />
                  Sales: sales@gridload.com<br />
                  Support: support@gridload.com
                </p>
              </div>
              
              <div className="bg-gridload-lightgray p-6 rounded-lg text-center hover:shadow-md transition-all">
                <div className="mx-auto w-12 h-12 bg-gridload-blue rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Messaging Apps</h3>
                <p className="text-gray-600">
                  WeChat: GridLoad-Official<br />
                  WhatsApp: +86 123 456 7890<br />
                  Telegram: @GridLoad
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Contact Form */}
        <ContactForms />
        
        {/* Map Section */}
        <section className="bg-gridload-lightgray py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Find Us</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                We're located in the heart of Shanghai's business district, easily accessible by public transportation.
              </p>
            </div>
            
            <div className="aspect-w-16 aspect-h-9 max-w-5xl mx-auto">
              {/* Placeholder for a map - in a real implementation, you would integrate with a maps API */}
              <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                <p className="text-gray-600">Interactive Map Would Go Here</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
