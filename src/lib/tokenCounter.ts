import { Tokenizer } from '../core/tokenizer.js';

// Singleton tokenizer instance for performance
let tokenizerInstance: Tokenizer | null = null;

function getTokenizer(): Tokenizer {
  if (!tokenizerInstance) {
    tokenizerInstance = new Tokenizer();
  }
  return tokenizerInstance;
}

export interface TokenCountOptions {
  format?: 'raw' | 'formatted';
  includeLines?: boolean;
}

export interface TokenCountResult {
  tokens: number;
  lines?: number;
  formatted?: string;
}

export type TokenInput = string | object | Buffer | number | boolean;

/**
 * Convert various input types to string for tokenization
 */
function inputToString(input: TokenInput): string {
  if (typeof input === 'string') {
    return input;
  }
  
  if (typeof input === 'number' || typeof input === 'boolean') {
    return input.toString();
  }
  
  if (Buffer.isBuffer(input)) {
    return input.toString('utf-8');
  }
  
  if (typeof input === 'object' && input !== null) {
    return JSON.stringify(input, null, 2);
  }
  
  throw new Error(`Unsupported input type: ${typeof input}`);
}

/**
 * Count tokens in a string
 */
export function countTokens(input: TokenInput): number {
  const tokenizer = getTokenizer();
  const text = inputToString(input);
  return tokenizer.countTokensFromText(text);
}

/**
 * Count tokens with additional options and metadata
 */
export function countTokensWithOptions(
  input: TokenInput,
  options: TokenCountOptions = {}
): TokenCountResult {
  const tokenizer = getTokenizer();
  const text = inputToString(input);
  const tokens = tokenizer.countTokensFromText(text);
  
  const result: TokenCountResult = { tokens };
  
  if (options.includeLines) {
    result.lines = tokenizer.countLines(text);
  }
  
  if (options.format === 'formatted') {
    result.formatted = tokenizer.formatTokenCount(tokens);
  }
  
  return result;
}

/**
 * Count tokens for multiple inputs in batch
 */
export function countTokensBatch(inputs: TokenInput[]): number[] {
  const tokenizer = getTokenizer();
  return inputs.map(input => {
    const text = inputToString(input);
    return tokenizer.countTokensFromText(text);
  });
}

/**
 * Count tokens from a file (async)
 */
export async function countTokensFromFile(filePath: string): Promise<number> {
  const tokenizer = getTokenizer();
  const result = await tokenizer.countTokens(filePath);
  return result.tokens;
}

/**
 * Count tokens from a file with additional metadata (async)
 */
export async function countTokensFromFileWithOptions(
  filePath: string,
  options: TokenCountOptions = {}
): Promise<TokenCountResult> {
  const tokenizer = getTokenizer();
  const result = await tokenizer.countTokens(filePath);
  
  const tokenCountResult: TokenCountResult = { tokens: result.tokens };
  
  if (options.includeLines) {
    tokenCountResult.lines = result.lines;
  }
  
  if (options.format === 'formatted') {
    tokenCountResult.formatted = tokenizer.formatTokenCount(result.tokens);
  }
  
  return tokenCountResult;
}

/**
 * Dispose of the tokenizer instance (cleanup)
 */
export function dispose(): void {
  if (tokenizerInstance) {
    tokenizerInstance.dispose();
    tokenizerInstance = null;
  }
}

/**
 * Get information about the tokenizer being used
 */
export function getTokenizerInfo(): { encoding: string } {
  return {
    encoding: 'o200k_base'
  };
}