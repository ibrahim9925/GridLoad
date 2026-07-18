// @ts-nocheck
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, MessageCircle } from "lucide-react";
import { SolarCalculatorForm } from "./SolarCalculatorForm";
import { SolarChatInterface } from "./SolarChatInterface";
import { SolarRecommendationCard } from "./SolarRecommendationCard";
import { useSolarCalculator } from "@/hooks/useSolarCalculator";

export const SolarCalculator = () => {
  const [activeTab, setActiveTab] = useState("form");
  const {
    formData,
    chatHistory,
    recommendations,
    isCalculating,
    isSubmitting,
    handleFormSubmit,
    handleChatMessage,
    handleInputChange,
    resetCalculator
  } = useSolarCalculator();

  return (
    <section className="section-padding bg-muted/30">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Find Your Perfect Solar System
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get personalized solar recommendations in minutes. Our AI-powered calculator 
            helps you determine the right system size, components, and costs for your needs.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Solar System Calculator
              </CardTitle>
              <CardDescription>
                Choose your preferred method to get solar recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="form" className="flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Quick Form
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    AI Assistant
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="form" className="mt-6">
                  <SolarCalculatorForm
                    formData={formData}
                    isSubmitting={isSubmitting}
                    onInputChange={handleInputChange}
                    onSubmit={handleFormSubmit}
                  />
                </TabsContent>

                <TabsContent value="chat" className="mt-6">
                  <SolarChatInterface
                    chatHistory={chatHistory}
                    isCalculating={isCalculating}
                    onSendMessage={handleChatMessage}
                  />
                </TabsContent>
              </Tabs>

              {recommendations && (
                <div className="mt-8">
                  <SolarRecommendationCard
                    recommendations={recommendations}
                    onReset={resetCalculator}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};