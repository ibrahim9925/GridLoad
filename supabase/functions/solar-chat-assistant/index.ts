import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory } = await req.json();
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are a professional GridLoad solar engineer with 10+ years of experience. Your job is to guide customers through calculating their ideal solar system size and components.

ALWAYS BE HELPFUL AND EDUCATIONAL. Ask clarifying questions when information is unclear.

Required Information to Collect:
- Full Name & Contact Info (phone + email)
- Location (city/village)
- Average monthly electricity bill (in local currency)
- Monthly consumption in kWh (if known, or estimate from bill)
- Roof Space Available (m²)
- Roof Type (flat, tilted, concrete, tin, etc.)
- Battery backup preference (Yes/No)
- Budget Range (optional)

Calculation Guidelines:
- Bill to Consumption: Divide bill by local tariff rate (~$0.10-0.30/kWh)
- System Size: (Monthly kWh × 12) ÷ (Daily sun hours × 365) = kW needed
- Panel Count: System kW ÷ Panel wattage (typically 300-550W panels)
- Inverter: System kW × 1.2 safety factor
- Battery: Daily consumption × backup hours ÷ 48V = Ah needed

ALWAYS drive the conversation toward collecting complete data for accurate recommendations. Be conversational but focused. Provide rough estimates when exact data isn't available, but explain the assumptions.

When you have enough information, offer to calculate their system and ask if they'd like to speak with a GridLoad specialist.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages,
        max_completion_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('Solar chat assistant response:', aiResponse);

    return new Response(JSON.stringify({ 
      response: aiResponse,
      conversationHistory: [...conversationHistory, 
        { role: 'user', content: message },
        { role: 'assistant', content: aiResponse }
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in solar chat assistant:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      response: "I'm sorry, I'm having trouble connecting right now. Please try again or use the form below to get your solar system recommendations."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});