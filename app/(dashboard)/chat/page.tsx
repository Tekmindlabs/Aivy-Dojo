'use client';

import { useChat } from 'ai/react';
import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat/chat-message";
import ErrorBoundary from '@/components/ErrorBoundary';
import { toast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    initialMessages: [{
      id: crypto.randomUUID(),
      content: 'Hello! I\'m your AI tutor. How can I help you learn today?',
      role: 'assistant',
    }],
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred while processing your message",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <ErrorBoundary>
      <div className="container mx-auto max-w-4xl p-4">
        <Card className="flex h-[600px] flex-col">
          <ScrollArea className="flex-1 p-4" id="chat-container">
            <AnimatePresence>
              <div className="space-y-4" ref={scrollRef}>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChatMessage 
                      message={message}
                      isLoading={isLoading && message === messages[messages.length - 1]}
                    />
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          </ScrollArea>

          <div className="border-t p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder="Ask your question..."
                disabled={isLoading}
                className="flex-1"
                autoComplete="off"
                minLength={2}
              />
              <Button 
                type="submit" 
                disabled={isLoading || !input.trim() || input.length < 2}
                className="bg-blue-500 hover:bg-blue-600 text-white disabled:bg-blue-300"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Processing...
                  </div>
                ) : (
                  'Send'
                )}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </ErrorBoundary>
  );
}