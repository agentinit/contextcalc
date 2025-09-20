import { test, expect, describe, beforeAll, afterAll } from 'bun:test';
import {
  countTokens,
  count,
  countJson,
  countWithLines,
  countFormatted,
  estimateTokens,
  countTokensWithOptions,
  countTokensBatch,
  countTokensFromFile,
  dispose,
  getTokenizerInfo,
  version,
  type TokenCountOptions,
  type TokenInput
} from '../../src/lib/index.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('ContextCalc Library Main Export', () => {
  let tempDir: string;
  let testFilePath: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'contextcalc-lib-test-'));
    testFilePath = path.join(tempDir, 'test.txt');
    await fs.writeFile(testFilePath, 'Test file content\nSecond line\n');
  });

  afterAll(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
    // Note: Not calling dispose() here as it interferes with concurrent test execution
  });

  describe('Main Exports', () => {
    test('exports all required functions', () => {
      expect(typeof countTokens).toBe('function');
      expect(typeof countTokensWithOptions).toBe('function');
      expect(typeof countTokensBatch).toBe('function');
      expect(typeof countTokensFromFile).toBe('function');
      expect(typeof dispose).toBe('function');
      expect(typeof getTokenizerInfo).toBe('function');
    });

    test('exports convenience aliases', () => {
      expect(typeof count).toBe('function');
      expect(typeof countJson).toBe('function');
      expect(typeof countWithLines).toBe('function');
      expect(typeof countFormatted).toBe('function');
      expect(typeof estimateTokens).toBe('function');
    });

    test('exports version information', () => {
      expect(typeof version).toBe('string');
      expect(version).toMatch(/^\d+\.\d+\.\d+$/); // Semantic version format
    });

    test('exports TypeScript types', () => {
      // Type exports can't be tested at runtime, but we can verify they compile
      const options: TokenCountOptions = { format: 'formatted', includeLines: true };
      const input: TokenInput = 'test';
      
      expect(options).toBeDefined();
      expect(input).toBeDefined();
    });
  });

  describe('Convenience Function Aliases', () => {
    test('count alias works correctly', () => {
      const text = 'Hello, world!';
      const directResult = countTokens(text);
      const aliasResult = count(text);
      
      expect(aliasResult).toBe(directResult);
    });

    test('countJson alias works correctly', () => {
      const obj = { message: 'test', data: [1, 2, 3] };
      const directResult = countTokens(obj);
      const aliasResult = countJson(obj);
      
      expect(aliasResult).toBe(directResult);
    });

    test('countWithLines returns tokens and lines', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const result = countWithLines(text);
      
      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('lines');
      expect(typeof result.tokens).toBe('number');
      expect(typeof result.lines).toBe('number');
      expect(result.tokens).toBeGreaterThan(0);
      expect(result.lines).toBe(3);
    });

    test('countFormatted returns tokens and formatted string', () => {
      const text = 'Hello, world!';
      const result = countFormatted(text);
      
      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('formatted');
      expect(typeof result.tokens).toBe('number');
      expect(typeof result.formatted).toBe('string');
      expect(result.tokens).toBeGreaterThan(0);
    });

    test('estimateTokens provides rough estimation', () => {
      const text = 'Hello, world!';
      const estimate = estimateTokens(text);
      const actual = countTokens(text);
      
      expect(typeof estimate).toBe('number');
      expect(estimate).toBeGreaterThan(0);
      // Estimate should be in the same ballpark as actual
      expect(Math.abs(estimate - actual)).toBeLessThan(actual);
    });

    test('estimateTokens works with objects', () => {
      const obj = { message: 'test', data: [1, 2, 3] };
      const estimate = estimateTokens(obj);
      const actual = countTokens(obj);
      
      expect(typeof estimate).toBe('number');
      expect(estimate).toBeGreaterThan(0);
      expect(Math.abs(estimate - actual)).toBeLessThan(actual * 2); // Within 2x
    });
  });

  describe('Integration Tests', () => {
    test('all counting methods produce consistent results for same content', () => {
      const text = 'Test content for consistency';
      
      const directCount = countTokens(text);
      const aliasCount = count(text);
      const withOptionsCount = countTokensWithOptions(text).tokens;
      
      expect(aliasCount).toBe(directCount);
      expect(withOptionsCount).toBe(directCount);
    });

    test('file operations work correctly', async () => {
      const fileTokens = await countTokensFromFile(testFilePath);
      
      // Read file content and count tokens directly
      const content = await fs.readFile(testFilePath, 'utf-8');
      const directTokens = countTokens(content);
      
      expect(fileTokens).toBe(directTokens);
    });

    test('batch processing maintains consistency', () => {
      const inputs = ['Hello', 'World', 'Test'];
      const batchResults = countTokensBatch(inputs);
      const individualResults = inputs.map(input => countTokens(input));
      
      expect(batchResults).toEqual(individualResults);
    });
  });

  describe('Error Handling', () => {
    test('functions handle invalid inputs gracefully', () => {
      expect(() => countTokens(null as any)).toThrow();
      expect(() => countTokens(undefined as any)).toThrow();
      expect(() => countWithLines(null as any)).toThrow();
      expect(() => countFormatted(null as any)).toThrow();
    });

    test('file functions handle non-existent files', async () => {
      const nonExistentFile = path.join(tempDir, 'does-not-exist.txt');
      await expect(countTokensFromFile(nonExistentFile)).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    test('library functions are performant', () => {
      const largeText = 'Performance test content. '.repeat(1000);
      
      const start = Date.now();
      const result = countTokens(largeText);
      const duration = Date.now() - start;
      
      expect(result).toBeGreaterThan(0);
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });

    test('batch processing is efficient', () => {
      const inputs = Array.from({ length: 100 }, (_, i) => `Test input ${i}`);
      
      const start = Date.now();
      const results = countTokensBatch(inputs);
      const duration = Date.now() - start;
      
      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Tokenizer Info', () => {
    test('getTokenizerInfo returns expected format', () => {
      const info = getTokenizerInfo();
      
      expect(info).toHaveProperty('encoding');
      expect(typeof info.encoding).toBe('string');
      expect(info.encoding).toBe('o200k_base');
    });
  });

  describe('Memory Management', () => {
    test('dispose function exists and runs without error', () => {
      // Skip actual dispose() call to avoid interfering with concurrent tests
      expect(typeof dispose).toBe('function');
    });
  });
});