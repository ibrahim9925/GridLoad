// @ts-nocheck
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Bot, User } from "lucide-react";
import { ChatMessage } from "@/types/solar";

interface SolarChatInterfaceProps {
  chatHistory: ChatMessage[];
  isCalculating: boolean;
  onSendMessage: (message: string) => void;
}

export const SolarChatInterface: React.FC<SolarChatInterfaceProps> = ({
  chatHistory,
  isCalculating,
  onSendMessage,
}) => {
  const [inputMessage, setInputMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && !isCalculating) {
      onSendMessage(inputMessage.trim());
      setInputMessage("");
    }
  };

  const initialMessage: ChatMessage = {
    role: "assistant",
    content: "👋 Hi! I'm your GridLoad solar engineer assistant. I'll help you find the perfect solar system for your needs. Let's start with some basic information - what's your name and where are you located?"
  };

  const displayMessages = chatHistory.length === 0 ? [initialMessage] : chatHistory;

  return (
    <div className="space-y-4">
      <ScrollArea className="h-96 w-full border rounded-lg p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {displayMessages.map((message, index) => (
            <div key={index} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary text-secondary-foreground'
                }`}>
                  {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={`rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            </div>
          ))}
          {isCalculating && (
            <div className="flex gap-3 justify-start">
              <div className="flex gap-3 max-w-[80%]">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-lg px-4 py-2 bg-secondary text-secondary-foreground">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p className="text-sm">Thinking...</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message here..."
          disabled={isCalculating}
          className="flex-1"
        />
        <Button 
          type="submit" 
          disabled={!inputMessage.trim() || isCalculating}
          className="bg-primary hover:bg-primary/90"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>

      <div className="text-xs text-muted-foreground text-center">
        💡 I can help you determine your system size, recommend components, and connect you with our sales team
      </div>
    </div>
  );
};