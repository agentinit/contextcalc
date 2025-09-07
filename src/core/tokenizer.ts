import { get_encoding } from 'tiktoken';
import { isBinaryFile, estimateBinaryTokens } from '../utils/fileDetector.js';

const ENCODING_NAME = 'o200k_base';

export class Tokenizer {
  private encoding;

  constructor() {
    try {
      this.encoding = get_encoding(ENCODING_NAME);
    } catch (error) {
      throw new Error(`Failed to initialize tokenizer with encoding '${ENCODING_NAME}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async countTokens(filePath: string): Promise<{ tokens: number; lines: number }> {
    try {
      const fs = await import('node:fs/promises');
      const stats = await fs.stat(filePath);
      
      if (await isBinaryFile(filePath)) {
        return {
          tokens: estimateBinaryTokens(stats.size),
          lines: 0
        };
      }

      const content = await fs.readFile(filePath, 'utf8');
      const tokens = this.countTokensFromText(content);
      const lines = this.countLines(content);

      return { tokens, lines };
    } catch (error) {
      throw new Error(`Failed to count tokens for ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  countTokensFromText(text: string): number {
    try {
      const tokens = this.encoding.encode(text, { disallowed_special: new Set() });
      return tokens.length;
    } catch (error) {
      console.warn(`Warning: Failed to encode text, returning character-based estimate:`, error instanceof Error ? error.message : 'Unknown error');
      return Math.ceil(text.length / 4);
    }
  }

  countLines(text: string): number {
    if (text.length === 0) return 0;
    
    const lines = text.split('\n').length;
    return text.endsWith('\n') ? lines - 1 : lines;
  }

  dispose(): void {
    try {
      this.encoding.free();
    } catch (error) {
      console.warn('Warning: Failed to free tokenizer encoding:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  formatTokenCount(count: number): string {
    const thresholds = [
      { value: 1000000, suffix: 'M' },
      { value: 1000, suffix: 'k' }
    ];

    for (const { value, suffix } of thresholds) {
      if (count >= value) {
        return `${(count / value).toFixed(1)}${suffix}`;
      }
    }

    return count.toString();
  }
}