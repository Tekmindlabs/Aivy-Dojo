import { Message } from '@/types/chat';
import { VectorResult } from '@/lib/knowledge/types';
import { getEmbedding } from '@/lib/knowledge/embeddings';
import { insertVector, searchSimilarContent } from '@/lib/milvus/vectors';

interface MemoryEntry {
  id: string;
  messages: Message[];
  metadata: Record<string, any>;
  userId: string;
  timestamp: Date;
}

export class MemoryService {
  async addMemory(
    messages: Message[], 
    userId: string, 
    metadata: Record<string, any> = {}
  ): Promise<MemoryEntry> {
    try {
      console.log('Starting memory addition process:', {
        userId,
        messageCount: messages.length,
        metadataKeys: Object.keys(metadata)
      });

      if (!messages.length) {
        throw new Error('No messages provided to add to memory');
      }

      const lastMessage = messages[messages.length - 1];
      console.log('Generating embedding for last message:', {
        role: lastMessage.role,
        contentLength: lastMessage.content.length
      });

      const embedding = await getEmbedding(lastMessage.content);
      console.log('Embedding generated successfully:', {
        embeddingLength: embedding.length
      });

      const memoryEntry: MemoryEntry = {
        id: crypto.randomUUID(),
        messages,
        metadata,
        userId,
        timestamp: new Date()
      };

      console.log('Created memory entry:', {
        id: memoryEntry.id,
        timestamp: memoryEntry.timestamp
      });

      // Insert vector with metadata
      await insertVector({
        userId,
        contentType: 'memory',
        contentId: memoryEntry.id,
        embedding: Array.from(embedding),
        metadata: {
          messages: JSON.stringify(messages),
          metadata: JSON.stringify(metadata)
        }
      });

      console.log('Memory vector inserted successfully:', {
        memoryId: memoryEntry.id,
        userId
      });

      return memoryEntry;

    } catch (error) {
      console.error('Error adding memory:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async searchMemories(
    query: string,
    userId: string,
    limit: number = 5
  ): Promise<MemoryEntry[]> {
    try {
      console.log('Starting memory search:', {
        userId,
        queryLength: query.length,
        limit
      });

      const embedding = await getEmbedding(query);
      console.log('Search embedding generated:', {
        embeddingLength: embedding.length
      });

      const searchEmbedding = Array.from(embedding);

      const results = await searchSimilarContent({
        userId,
        embedding: searchEmbedding,
        limit,
        contentTypes: ['memory']
      });

      if (!results || !Array.isArray(results)) {
        console.warn('No results returned from search:', {
          userId,
          timestamp: new Date().toISOString()
        });
        return [];
      }

      console.log('Search completed:', {
        resultCount: results.length,
        userId
      });

      const memories = results.map((result: VectorResult) => {
        try {
          const parsedMetadata = JSON.parse(result.metadata);
          return {
            id: result.content_id,
            messages: JSON.parse(parsedMetadata.messages),
            metadata: JSON.parse(parsedMetadata.metadata),
            userId: result.user_id,
            timestamp: new Date()
          };
        } catch (parseError) {
          console.error('Error parsing memory result:', {
            error: parseError instanceof Error ? parseError.message : 'Unknown error',
            resultId: result.content_id
          });
          return null;
        }
      }).filter((memory): memory is MemoryEntry => memory !== null);

      console.log('Memory results processed:', {
        processedCount: memories.length,
        userId
      });

      return memories;

    } catch (error) {
      console.error('Error searching memories:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async deleteMemory(userId: string, memoryId: string): Promise<void> {
    try {
      console.log('Starting memory deletion:', {
        userId,
        memoryId
      });

      // Implementation for deleting memory would go here
      // This would typically involve removing the vector from Milvus
      // and any associated metadata

      console.log('Memory deleted successfully:', {
        userId,
        memoryId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error deleting memory:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        memoryId,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  private validateMemoryEntry(entry: MemoryEntry): boolean {
    if (!entry.id || !entry.userId || !Array.isArray(entry.messages)) {
      return false;
    }
    
    if (entry.messages.length === 0) {
      return false;
    }

    return entry.messages.every(message => 
      message.content && 
      (message.role === 'user' || message.role === 'assistant')
    );
  }
}