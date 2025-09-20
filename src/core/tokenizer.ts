import { isBinaryFile, estimateBinaryTokens } from '../utils/fileDetector.js';
import { getTiktoken } from '../utils/tiktokenInit.js';

export class Tokenizer {
  private tiktokenWrapper;

  constructor() {
    this.tiktokenWrapper = getTiktoken();
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
    if (!this.tiktokenWrapper.isInitialized) {
      throw new Error('Tiktoken is not properly initialized. Cannot provide accurate token counts.');
    }
    
    try {
      const tokens = this.tiktokenWrapper.encoding.encode(text);
      return tokens.length;
    } catch (error) {
      throw new Error(`Failed to encode text for token counting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  countLines(text: string): number {
    if (text.length === 0) return 0;
    
    const lines = text.split('\n').length;
    return text.endsWith('\n') ? lines - 1 : lines;
  }

  dispose(): void {
    try {
      if (this.tiktokenWrapper.isInitialized) {
        this.tiktokenWrapper.encoding.free();
      }
    } catch {
      // Silently handle disposal errors as they don't affect functionality
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