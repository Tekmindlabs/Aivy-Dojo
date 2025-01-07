import { GoogleGenerativeAI } from "@google/generative-ai";
import { Message } from "@/types/chat";

// Core interfaces
interface TutorState {
  messages: Message[];
  currentStep: string;
  context: {
    topic?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  };
}

interface TutorResponse {
  success: boolean;
  response: string;
  timestamp: string;
  metadata?: {
    processingTime: number;
    confidence: number;
    topic?: string;
    suggestedNextSteps?: string[];
  };
}

export class TutorAgent {
  private model: any;

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: "gemini-pro" });
  }

  private async generateResponse(messages: Message[]): Promise<string> {
    const lastMessage = messages[messages.length - 1];
    
    const prompt = `
      Act as a knowledgeable and supportive AI tutor.
      
      Previous messages:
      ${messages.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}
      
      Current question:
      ${lastMessage.content}
      
      Provide a response that:
      1. Directly answers the question
      2. Explains concepts clearly with examples when needed
      3. Uses a supportive and encouraging tone
      4. Checks for understanding
      5. Suggests next steps or related topics to explore
    `;

    const result = await this.model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    return result.response.text();
  }

  public async process(state: TutorState): Promise<TutorResponse> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!state.messages.length) {
        throw new Error("No messages provided");
      }

      const lastMessage = state.messages[state.messages.length - 1];
      if (!lastMessage?.content) {
        throw new Error("Invalid message format");
      }

      // Generate response
      const response = await this.generateResponse(state.messages);

      // Extract suggested next steps (if any are mentioned in the response)
      const suggestedNextSteps = response
        .split('\n')
        .filter(line => line.includes('- ') || line.includes('* '))
        .map(step => step.replace(/^[-*]\s+/, ''))
        .slice(0, 3);

      return {
        success: true,
        response,
        timestamp: new Date().toISOString(),
        metadata: {
          processingTime: Date.now() - startTime,
          confidence: 0.9,
          suggestedNextSteps
        }
      };

    } catch (error) {
      console.error("Tutor agent error:", error);
      return {
        success: false,
        response: "I apologize, but I encountered an error. Could you please rephrase your question?",
        timestamp: new Date().toISOString(),
        metadata: {
          processingTime: Date.now() - startTime,
          confidence: 0
        }
      };
    }
  }
}

// Utility function to create initial state
export const createInitialTutorState = (messages: Message[]): TutorState => ({
  messages,
  currentStep: 'initial',
  context: {
    difficulty: 'beginner'
  }
});

// Usage example:
/*
const tutor = new TutorAgent(process.env.GOOGLE_AI_API_KEY!);

const response = await tutor.process({
  messages: [
    { role: 'user', content: 'Can you explain what is machine learning?' }
  ],
  currentStep: 'initial',
  context: {
    difficulty: 'beginner'
  }
});

or import { TutorAgent, createInitialTutorState } from './lib/ai/tutor-agent';

// Initialize the tutor
const tutor = new TutorAgent(process.env.GOOGLE_AI_API_KEY!);

// Example usage in an async function
async function handleUserQuestion(question: string) {
  const state = createInitialTutorState([
    { role: 'user', content: question }
  ]);
  
  const response = await tutor.process(state);
  
  if (response.success) {
    console.log(response.response);
    console.log('Suggested next steps:', response.metadata?.suggestedNextSteps);
  } else {
    console.error('Error:', response.response);
  }
}
*/