// @ts-nocheck
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SolarFormData, ChatMessage, SolarRecommendations, SolarCalculationData } from "@/types/solar";
import { calculateSolarSystem } from "@/utils/solarCalculations";

export const useSolarCalculator = () => {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<SolarFormData>({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    monthlyBill: "",
    monthlyConsumption: "",
    roofSpace: "",
    roofType: "",
    batteryBackup: false,
    budgetRange: "",
    additionalNotes: "",
    currency: "USD",
  });

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [recommendations, setRecommendations] = useState<SolarRecommendations | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateRecommendations = (data: SolarCalculationData, customerData: { name: string; location: string; currency: string }): SolarRecommendations => {
    const calculations = calculateSolarSystem(data);
    
    return {
      customerName: customerData.name,
      location: customerData.location,
      systemSizeKw: calculations.systemSizeKw,
      panelCount: calculations.panelCount,
      panelDetails: `${calculations.panelCount}x 450W monocrystalline solar panels (${calculations.panelWattage}W each)`,
      inverterSize: calculations.inverterSizeKw,
      inverterDetails: `${calculations.inverterCount}x ${calculations.inverterSizeKw / calculations.inverterCount}kW string inverter${calculations.inverterCount > 1 ? 's' : ''}`,
      batteryDetails: data.batteryBackup ? `${calculations.batteryAh}Ah 48V lithium battery bank (${Math.ceil(calculations.batteryAh / 100)} x 100Ah batteries)` : undefined,
      estimatedCost: calculations.totalCost,
      monthlySavings: calculations.monthlySavings,
      paybackYears: calculations.paybackYears,
      co2ReductionTons: calculations.co2ReductionTons,
      currency: customerData.currency,
    };
  };

  const saveLead = async (leadData: any) => {
    try {
      const { error } = await supabase
        .from('leads')
        .insert({
          lead_type: 'solar_calculator',
          full_name: leadData.fullName,
          email: leadData.email,
          phone: leadData.phone,
          location: leadData.location,
          monthly_bill: leadData.monthlyBill ? parseFloat(leadData.monthlyBill) : null,
          monthly_consumption_kwh: leadData.monthlyConsumption ? parseFloat(leadData.monthlyConsumption) : null,
          roof_space_m2: leadData.roofSpace ? parseFloat(leadData.roofSpace) : null,
          roof_type: leadData.roofType,
          battery_preference: leadData.batteryBackup,
          budget_range: leadData.budgetRange,
          notes: leadData.additionalNotes,
          calculator_data: leadData.calculatorData || {},
          source: 'Solar Calculator',
          status: 'new',
        });

      if (error) throw error;
      
      toast({
        title: "Lead Saved",
        description: "Your information has been saved. Our team will contact you soon!",
      });
    } catch (error) {
      console.error('Error saving lead:', error);
      toast({
        title: "Save Error",
        description: "Failed to save your information, but your recommendations are still valid.",
        variant: "destructive",
      });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const calculationData: SolarCalculationData = {
        monthlyBill: parseFloat(formData.monthlyBill),
        monthlyConsumption: formData.monthlyConsumption ? parseFloat(formData.monthlyConsumption) : 0,
        roofSpace: parseFloat(formData.roofSpace),
        roofType: formData.roofType,
        batteryBackup: formData.batteryBackup,
        location: formData.location,
        currency: formData.currency,
      };

      const recs = generateRecommendations(calculationData, {
        name: formData.fullName,
        location: formData.location,
        currency: formData.currency
      });

      setRecommendations(recs);

      // Save lead to database
      await saveLead({
        ...formData,
        calculatorData: {
          ...calculationData,
          ...recs
        }
      });

    } catch (error) {
      console.error('Error calculating solar system:', error);
      toast({
        title: "Calculation Error",
        description: "Failed to calculate your solar system. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChatMessage = async (message: string) => {
    if (!message.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: message };
    setChatHistory(prev => [...prev, userMessage]);
    setIsCalculating(true);

    try {
      const { data, error } = await supabase.functions.invoke('solar-chat-assistant', {
        body: {
          message,
          conversationHistory: chatHistory
        }
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = { 
        role: 'assistant', 
        content: data.response 
      };
      
      setChatHistory(prev => [...prev, assistantMessage]);

      // Check if the conversation has enough data to generate recommendations
      // This is a simplified check - in a real implementation, you'd parse the conversation more intelligently
      const allMessages = [...chatHistory, userMessage, assistantMessage].join(' ').toLowerCase();
      
      if (allMessages.includes('calculate') || allMessages.includes('recommend') || allMessages.includes('system size')) {
        // Try to extract data from conversation and generate recommendations
        // This would need more sophisticated NLP in production
      }

    } catch (error) {
      console.error('Error in chat:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting right now. Please try again or use the form below to get your solar system recommendations."
      };
      setChatHistory(prev => [...prev, errorMessage]);
      
      toast({
        title: "Chat Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const resetCalculator = () => {
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      location: "",
      monthlyBill: "",
      monthlyConsumption: "",
      roofSpace: "",
      roofType: "",
      batteryBackup: false,
      budgetRange: "",
      additionalNotes: "",
      currency: "USD",
    });
    setChatHistory([]);
    setRecommendations(null);
  };

  return {
    formData,
    chatHistory,
    recommendations,
    isCalculating,
    isSubmitting,
    handleFormSubmit,
    handleChatMessage,
    handleInputChange,
    resetCalculator,
  };
};