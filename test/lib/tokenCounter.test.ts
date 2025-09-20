import { test, expect, describe, beforeAll, afterAll } from 'bun:test';
import {
  countTokens,
  countTokensWithOptions,
  countTokensBatch,
  countTokensFromFile,
  countTokensFromFileWithOptions,
  getTokenizerInfo
} from '../../src/lib/tokenCounter.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('TokenCounter Library', () => {
  let tempDir: string;
  let testFilePath: string;

  beforeAll(async () => {
    // Create a temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'contextcalc-test-'));
    testFilePath = path.join(tempDir, 'test-file.txt');
    await fs.writeFile(testFilePath, 'Hello, world!\nThis is a test file with multiple lines.\n');
  });

  afterAll(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
    // Note: Not calling dispose() here as it interferes with concurrent test execution
  });

  describe('countTokens', () => {
    test('counts tokens in simple string', () => {
      const result = countTokens('Hello, world!');
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    test('counts tokens in empty string', () => {
      const result = countTokens('');
      expect(result).toBe(0);
    });

    test('counts tokens in JSON object', () => {
      const obj = { message: 'Hello', data: [1, 2, 3], nested: { key: 'value' } };
      const result = countTokens(obj);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    test('counts tokens in Buffer', () => {
      const buffer = Buffer.from('Hello, world!', 'utf-8');
      const result = countTokens(buffer);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    test('counts tokens in number', () => {
      const result = countTokens(42);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    test('counts tokens in boolean', () => {
      const result = countTokens(true);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    test('same content produces same token count across input types', () => {
      const text = 'Hello, world!';
      const stringTokens = countTokens(text);
      const bufferTokens = countTokens(Buffer.from(text, 'utf-8'));
      
      expect(stringTokens).toBe(bufferTokens);
    });

    test('throws error for unsupported input types', () => {
      expect(() => countTokens(undefined as any)).toThrow();
      expect(() => countTokens(null as any)).toThrow();
      expect(() => countTokens(Symbol('test') as any)).toThrow();
    });
  });

  describe('countTokensWithOptions', () => {
    test('returns basic token count with no options', () => {
      const result = countTokensWithOptions('Hello, world!');
      expect(result.tokens).toBeGreaterThan(0);
      expect(result.lines).toBeUndefined();
      expect(result.formatted).toBeUndefined();
    });

    test('includes line count when requested', () => {
      const result = countTokensWithOptions('Hello\nWorld\nTest', { includeLines: true });
      expect(result.tokens).toBeGreaterThan(0);
      expect(result.lines).toBe(3);
    });

    test('includes formatted output when requested', () => {
      const result = countTokensWithOptions('Hello, world!', { format: 'formatted' });
      expect(result.tokens).toBeGreaterThan(0);
      expect(result.formatted).toBeDefined();
      expect(typeof result.formatted).toBe('string');
    });

    test('includes both lines and formatted when both requested', () => {
      const result = countTokensWithOptions('Hello\nWorld', { 
        includeLines: true, 
        format: 'formatted' 
      });
      expect(result.tokens).toBeGreaterThan(0);
      expect(result.lines).toBe(2);
      expect(result.formatted).toBeDefined();
    });

    test('handles empty string correctly', () => {
      const result = countTokensWithOptions('', { includeLines: true });
      expect(result.tokens).toBe(0);
      expect(result.lines).toBe(0);
    });
  });

  describe('countTokensBatch', () => {
    test('processes multiple inputs correctly', () => {
      const inputs = ['Hello', 'World', { key: 'value' }, 42];
      const results = countTokensBatch(inputs);
      
      expect(results).toHaveLength(4);
      expect(results.every(r => typeof r === 'number')).toBe(true);
      expect(results.every(r => r >= 0)).toBe(true);
    });

    test('handles empty batch', () => {
      const results = countTokensBatch([]);
      expect(results).toHaveLength(0);
    });

    test('processes mixed content types', () => {
      const inputs = [
        'String content',
        { json: 'object' },
        Buffer.from('buffer content'),
        123,
        true
      ];
      const results = countTokensBatch(inputs);
      
      expect(results).toHaveLength(5);
      expect(results.every(r => typeof r === 'number' && r >= 0)).toBe(true);
    });
  });

  describe('countTokensFromFile', () => {
    test('counts tokens from file', async () => {
      const result = await countTokensFromFile(testFilePath);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    test('throws error for non-existent file', async () => {
      const nonExistentPath = path.join(tempDir, 'non-existent.txt');
      await expect(countTokensFromFile(nonExistentPath)).rejects.toThrow();
    });
  });

  describe('countTokensFromFileWithOptions', () => {
    test('counts tokens from file with options', async () => {
      const result = await countTokensFromFileWithOptions(testFilePath, {
        includeLines: true,
        format: 'formatted'
      });
      
      expect(result.tokens).toBeGreaterThan(0);
      expect(result.lines).toBeGreaterThan(0);
      expect(result.formatted).toBeDefined();
    });

    test('works with no options', async () => {
      const result = await countTokensFromFileWithOptions(testFilePath);
      expect(result.tokens).toBeGreaterThan(0);
      expect(result.lines).toBeUndefined();
      expect(result.formatted).toBeUndefined();
    });
  });

  describe('getTokenizerInfo', () => {
    test('returns tokenizer information', () => {
      const info = getTokenizerInfo();
      expect(info).toHaveProperty('encoding');
      expect(info.encoding).toBe('o200k_base');
    });
  });

  describe('Performance and Edge Cases', () => {
    test('handles large strings efficiently', () => {
      const largeString = 'Hello world! '.repeat(1000);
      const start = Date.now();
      const result = countTokens(largeString);
      const duration = Date.now() - start;
      
      expect(result).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('handles special characters and unicode', () => {
      const unicodeText = '🌟 Hello 世界! 🚀 Testing émojis and àccénts';
      const result = countTokens(unicodeText);
      expect(result).toBeGreaterThan(0);
    });

    test('handles very long lines', () => {
      const longLine = 'a'.repeat(10000);
      const result = countTokensWithOptions(longLine, { includeLines: true });
      expect(result.tokens).toBeGreaterThan(0);
      expect(result.lines).toBe(1);
    });

    test('consistent results across multiple calls', () => {
      const text = 'Consistency test text';
      const results = Array.from({ length: 5 }, () => countTokens(text));
      
      expect(results.every(r => r === results[0])).toBe(true);
    });
  });
});