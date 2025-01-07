import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Message, StreamingTextResponse } from 'ai';

// Check for API key
if (!process.env.GOOGLE_AI_API_KEY) {
  throw new Error("GOOGLE_AI_API_KEY is not set");
}

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export async function POST(req: Request) {
  try {
    // Authenticate user
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }), 
        { status: 401 }
      );
    }

    // Get messages from request
    const { messages }: { messages: Message[] } = await req.json();
    if (!messages?.length) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }), 
        { status: 400 }
      );
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        learningStyle: true,
        difficultyPreference: true,
        interests: true
      }
    });

    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found" }), 
        { status: 404 }
      );
    }

    // Create context-aware prompt
    const prompt = `
      Act as a knowledgeable and supportive AI tutor.
      
      User preferences:
      - Learning style: ${user.learningStyle || 'general'}
      - Difficulty level: ${user.difficultyPreference || 'moderate'}
      - Interests: ${user.interests?.join(', ') || 'general topics'}

      Previous context:
      ${messages.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}
      
      Current question:
      ${messages[messages.length - 1].content}
      
      Provide a response that:
      1. Directly answers the question
      2. Explains concepts clearly with examples when needed
      3. Uses a supportive and encouraging tone
      4. Checks for understanding
      5. Suggests next steps or related topics to explore
    `;

    // Generate response
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const response = result.response.text();

    // Save chat to database (non-blocking)
    prisma.chat.create({
      data: {
        userId: user.id,
        message: messages[messages.length - 1].content,
        response: response,
        metadata: {
          personalization: {
            learningStyle: user.learningStyle,
            difficulty: user.difficultyPreference,
            interests: user.interests
          }
        }
      },
    }).catch(error => {
      console.error("Error saving chat to database:", error);
    });

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(new TextEncoder().encode(response));
        controller.close();
      },
    });

    return new StreamingTextResponse(stream);

  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An error occurred" 
      }), 
      { status: 500 }
    );
  }
}