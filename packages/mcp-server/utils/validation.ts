import { z } from 'zod';
import { ValidationError } from '../types';

/**
 * Validates input parameters against a Zod schema
 */
export async function validateParams<T>(
  schema: z.ZodSchema<T>,
  params: unknown
): Promise<T> {
  try {
    return await schema.parseAsync(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid parameters', {
        errors: error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      });
    }
    throw error;
  }
}

/**
 * Validates a JSON-RPC request object
 */
export const jsonRpcRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.string(),
  params: z.any().optional(),
  id: z.union([z.string(), z.number()]).optional(),
});

/**
 * Validates server configuration
 */
export const serverConfigSchema = z.object({
  name: z.string(),
  version: z.string(),
  baseUrl: z.instanceof(URL).optional(),
  serviceDocumentationUrl: z.instanceof(URL).optional(),
});

/**
 * Validates content block structure
 */
export const contentBlockSchema = z.object({
  type: z.enum(['text', 'json', 'binary']),
  text: z.string().optional(),
  json: z.any().optional(),
  binary: z.instanceof(Buffer).optional(),
  mimeType: z.string().optional(),
});

/**
 * Validates resource content structure
 */
export const resourceContentSchema = z.object({
  uri: z.string(),
  text: z.string().optional(),
  binary: z.instanceof(Buffer).optional(),
  mimeType: z.string().optional(),
});

/**
 * Validates message structure
 */
export const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: contentBlockSchema,
});

/**
 * Validates tool response structure
 */
export const toolResponseSchema = z.object({
  content: z.array(contentBlockSchema),
  metadata: z.record(z.any()).optional(),
});

/**
 * Validates resource response structure
 */
export const resourceResponseSchema = z.object({
  contents: z.array(resourceContentSchema),
  metadata: z.record(z.any()).optional(),
});

/**
 * Validates prompt response structure
 */
export const promptResponseSchema = z.object({
  messages: z.array(messageSchema),
  metadata: z.record(z.any()).optional(),
});
