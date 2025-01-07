// /components/chat/chat-interface.tsx
import { useChat } from 'ai/react';
import { ChatMessage } from './chat-message';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useRef, useEffect } from 'react';

export function ChatInterface() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage 
            key={message.id} 
            message={message} 
            isLoading={isLoading && message.role === "assistant"}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <Card className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-4">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask me anything..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}