/**
 * ContextCalc Library API
 * 
 * This module provides a programmatic interface for token counting
 * that can be imported and used by other tools and libraries.
 * 
 * @example
 * ```typescript
 * import { countTokens, isTiktokenAvailable } from 'contextcalc';
 * 
 * // Check if tiktoken is properly initialized
 * if (!isTiktokenAvailable()) {
 *   console.error('Tiktoken initialization failed');
 *   process.exit(1);
 * }
 * 
 * const tokens = countTokens("Hello, world!");
 * console.log(tokens); // 4
 * ```
 */

// Re-export all functions and types from tokenCounter
export {
  countTokens,
  countTokensWithOptions,
  countTokensBatch,
  countTokensFromFile,
  countTokensFromFileWithOptions,
  dispose,
  getTokenizerInfo,
  type TokenCountOptions,
  type TokenCountResult,
  type TokenInput
} from './tokenCounter.js';

// Import for internal use in convenience functions
import { countTokensWithOptions } from './tokenCounter.js';

// Also export core types that might be useful for library consumers
export type {
  FileStats,
  ScanResult
} from '../types/index.js';

/**
 * Version information for the library
 */
export const version = '1.1.0';

/**
 * Convenience function aliases for common use cases
 */

/**
 * Count tokens in a string (alias for countTokens)
 */
export { countTokens as count } from './tokenCounter.js';

/**
 * Count tokens in JSON object (alias for countTokens)
 */
export { countTokens as countJson } from './tokenCounter.js';

/**
 * Count tokens in text with line count
 */
export function countWithLines(input: string): { tokens: number; lines: number } {
  const result = countTokensWithOptions(input, { includeLines: true });
  return { tokens: result.tokens, lines: result.lines! };
}

/**
 * Count tokens with formatted output
 */
export function countFormatted(input: string): { tokens: number; formatted: string } {
  const result = countTokensWithOptions(input, { format: 'formatted' });
  return { tokens: result.tokens, formatted: result.formatted! };
}

/**
 * Quick token estimation for large objects
 * Useful for getting a rough estimate without full tokenization
 */
export function estimateTokens(input: string | object): number {
  const text = typeof input === 'string' ? input : JSON.stringify(input);
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

// Re-export tiktoken initialization utilities
export {
  isTiktokenAvailable,
  getTiktokenError,
  initializeTiktoken
} from '../utils/tiktokenInit.js';