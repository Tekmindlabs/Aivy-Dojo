import { getMilvusClient } from './client';
import { v4 as uuidv4 } from 'uuid';
import { VectorResult } from '../knowledge/types';

/**
 * Inserts a vector into the Milvus database with enhanced logging and error handling
 */
export async function insertVector({
  userId,
  contentType,
  contentId,
  embedding,
  metadata = {}
}: {
  userId: string;
  contentType: string;
  contentId: string;
  embedding: number[];
  metadata?: Record<string, any>;
}): Promise<VectorResult> {
  try {
    // Initial logging of vector insertion attempt
    console.log('Starting vector insertion:', {
      userId,
      contentType,
      contentId,
      embeddingDimension: embedding.length,
      metadataKeys: Object.keys(metadata)
    });

    // Get Milvus client
    const client = await getMilvusClient();
    console.log('Milvus client connected successfully');

    // Verify embedding dimension
    if (embedding.length !== 1024) {
      const error = new Error(`Invalid embedding dimension: ${embedding.length}, expected 1024`);
      console.error('Embedding dimension validation failed:', error);
      throw error;
    }

    // Generate vector ID
    const vectorId = uuidv4();
    console.log('Generated vector ID:', vectorId);

    // Prepare insertion data
    const insertData = {
      id: vectorId,
      user_id: userId,
      content_type: contentType,
      content_id: contentId,
      embedding: embedding,
      metadata: JSON.stringify(metadata)
    };

    console.log('Preparing to insert vector data:', {
      vectorId,
      userId,
      contentType,
      contentId,
      metadataSize: JSON.stringify(metadata).length
    });

    // Perform insertion
    const insertResult = await client.insert({
      collection_name: 'content_vectors',
      data: [insertData]
    });

    console.log('Vector inserted successfully:', {
      vectorId,
      status: insertResult.status,
      timestamp: new Date().toISOString()
    });

    // Return vector result
    return {
      id: vectorId,
      user_id: userId,
      content_type: contentType,
      content_id: contentId,
      metadata: JSON.stringify(metadata)
    };

  } catch (error: unknown) {
    console.error('Vector insertion failed:', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      contentId,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

/**
 * Searches for similar content in the Milvus database with enhanced logging
 */
export async function searchSimilarContent({
  userId,
  embedding,
  limit = 5,
  contentTypes = ['document', 'url', 'note']
}: {
  userId: string;
  embedding: number[];
  limit?: number;
  contentTypes?: string[];
}) {
  try {
    console.log('Starting similarity search:', {
      userId,
      embeddingDimension: embedding.length,
      limit,
      contentTypes
    });

    // Get Milvus client
    const client = await getMilvusClient();
    console.log('Milvus client connected for search');

    // Verify embedding dimension
    if (embedding.length !== 1024) {
      const error = new Error(`Invalid search embedding dimension: ${embedding.length}`);
      console.error('Search embedding validation failed:', error);
      throw error;
    }

    // Prepare search filter
    const filter = `user_id == "${userId}" && content_type in ${JSON.stringify(contentTypes)}`;
    console.log('Applying search filter:', filter);

    // Perform search
    const results = await client.search({
      collection_name: 'content_vectors',
      vector: embedding,
      filter: filter,
      limit,
      output_fields: ['content_type', 'content_id', 'metadata'],
      params: { 
        nprobe: 10,
        metric_type: 'L2'
      }
    });

    console.log('Search completed successfully:', {
      resultCount: results.length,
      timestamp: new Date().toISOString()
    });

    return results;

  } catch (error: unknown) {
    console.error('Similarity search failed:', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

/**
 * Utility function to validate embedding dimension
 */
function validateEmbedding(embedding: number[]): boolean {
  if (!Array.isArray(embedding)) {
    console.error('Invalid embedding format: not an array');
    return false;
  }
  
  if (embedding.length !== 1024) {
    console.error(`Invalid embedding dimension: ${embedding.length}`);
    return false;
  }
  
  return true;
}