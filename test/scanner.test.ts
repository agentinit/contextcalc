import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { DirectoryScanner } from '../src/core/scanner.js';
import { AnalysisMode } from '../src/types/index.js';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('DirectoryScanner - AST Cache Refresh Logic', () => {
  let testDir: string;
  let scanner: DirectoryScanner;

  beforeEach(async () => {
    // Create a unique temporary directory for each test
    testDir = join(tmpdir(), `scanner-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('AST enablement and cache invalidation', () => {
    test('scanner initializes without AST parsing when disabled', async () => {
      const testFile = join(testDir, 'test.ts');
      await writeFile(testFile, 'function hello() { return "world"; }');

      scanner = new DirectoryScanner(testDir, AnalysisMode.CODE, 10 * 1024 * 1024, false, false);
      await scanner.initialize(false, false);

      const result = await scanner.scan();

      expect(result.nodes.length).toBeGreaterThan(0);
      expect(result.totalFiles).toBe(1);
      expect(result.astStats).toBeUndefined();
    });

    test('scanner initializes with AST parsing when enabled', async () => {
      const testFile = join(testDir, 'test.ts');
      await writeFile(testFile, 'function hello() { return "world"; }');

      scanner = new DirectoryScanner(testDir, AnalysisMode.CODE, 10 * 1024 * 1024, true, false);
      await scanner.initialize(false, false);

      const result = await scanner.scan();

      expect(result.nodes.length).toBeGreaterThan(0);
      expect(result.totalFiles).toBe(1);
      expect(result.astStats).toBeDefined();
      
      if (result.astStats) {
        expect(result.astStats.filesProcessed).toBeGreaterThanOrEqual(0);
        expect(result.astStats.filesSkipped).toBeGreaterThanOrEqual(0);
      }
    });

    test('files are re-parsed when switching to AST mode with existing cache', async () => {
      const testFile = join(testDir, 'function.ts');
      await writeFile(testFile, 'export function add(a: number, b: number): number { return a + b; }');

      // First scan without AST
      scanner = new DirectoryScanner(testDir, AnalysisMode.CODE, 10 * 1024 * 1024, false, false);
      await scanner.initialize(false, false);
      const firstResult = await scanner.scan();

      expect(firstResult.totalFiles).toBe(1);
      expect(firstResult.astStats).toBeUndefined();
      // Cache should be populated with token/line counts but no entities

      // Second scan with AST enabled on the same directory
      scanner = new DirectoryScanner(testDir, AnalysisMode.CODE, 10 * 1024 * 1024, true, false);
      await scanner.initialize(false, false);
      const secondResult = await scanner.scan();

      expect(secondResult.totalFiles).toBe(1);
      expect(secondResult.astStats).toBeDefined();

      // Check that entities were extracted
      const fileNode = secondResult.nodes[0];
      if (fileNode && fileNode.type === 'file') {
        expect(fileNode.entities).toBeDefined();
        // Should have at least the function declaration
        if (fileNode.entities) {
          expect(fileNode.entities.length).toBeGreaterThan(0);
        }
      }
    });

    test('cache with empty entity array is not invalidated', async () => {
      const testFile = join(testDir, 'empty.ts');
      // File with no top-level symbols
      await writeFile(testFile, '// Just a comment\n/* Another comment */\n');

      // First scan with AST
      scanner = new DirectoryScanner(testDir, AnalysisMode.CODE, 10 * 1024 * 1024, true, false);
      await scanner.initialize(false, false);
      const firstResult = await scanner.scan();

      expect(firstResult.totalFiles).toBe(1);
      const firstFileNode = firstResult.nodes[0];
      if (firstFileNode && firstFileNode.type === 'file') {
        // Empty array is valid - no symbols found
        expect(firstFileNode.entities).toBeDefined();
        expect(firstFileNode.entities?.length).toBe(0);
      }

      // Second scan should use cache
      scanner = new DirectoryScanner(testDir, AnalysisMode.CODE, 10 * 1024 * 1024, true, false);
      await scanner.initialize(false, false);
      const secondResult = await scanner.scan();

      expect(secondResult.cacheHits).toBe(1);
      expect(secondResult.cacheMisses).toBe(0);

      const secondFileNode = secondResult.nodes[0];
      if (secondFileNode && secondFileNode.type === 'file') {
        expect(secondFileNode.entities).toBeDefined();
        expect(secondFileNode.entities?.length).toBe(0);
      }
    });

    test('cache with undefined entities is invalidated when AST enabled', async () => {
      const testFile = join(testDir, 'class.ts');
      await writeFile(testFile, 'export class Calculator { add(a: number, b: number) { return a + b; } }');

      // First scan without AST - entities will be undefined in cache
      scanner = new DirectoryScanner(testDir, AnalysisMode.CODE, 10 * 1024 * 1024, false, false);
      await scanner.initialize(false, false);
      const firstResult = await scanner.scan();

      expect(firstResult.totalFiles).toBe(1);
      expect(firstResult.cacheHits).toBe(0);
      expect(firstResult.cacheMisses).toBe(1);

      // Second scan with AST - should trigger re-parse due to undefined entities
      scanner = new DirectoryScanner(testDir, AnalysisMode.CODE, 10 * 1024 * 1024, true, false);
      await scanner.initialize(false, false);
      const secondResult = await scanner.scan();

      expect(secondResult.totalFiles).toBe(1);
      
      // The file should be parsed for AST
      const fileNode = secondResult.nodes[0];
      if (fileNode && fileNode.type === 'file') {
        expect(fileNode.entities).toBeDefined();
        if (fileNode.entities) {
          expect(fileNode.entities.length).toBeGreaterThan(0);
          // Should have class symbol
          expect(fileNode.entities.some(e => e.name === 'Calculator')).toBe(true);
        }
      }
    });

    test('needsASTRefresh logic distinguishes undefined from empty array', async () => {
      const testFile1 = join(testDir, 'has-symbols.ts');
      const testFile2 = join(testDir, 'no-symbols.ts');
      
      await writeFile(testFile1, 'export function test() {}');
      await writeFile(testFile2, '// Only comments');

      // Scan with AST enabled
      scanner = new DirectoryScanner(testDir, AnalysisMode.CODE, 10 * 1024 * 1024, true, false);
      await scanner.initialize(false, false);
      const firstResult = await scanner.scan();

      expect(firstResult.totalFiles).toBe(2);

      const fileWithSymbols = firstResult.nodes[0]?.type === 'folder' 
        ? firstResult.nodes[0].children.find(n => n.path.includes('has-symbols'))
        : null;
      const fileWithoutSymbols = firstResult.nodes[0]?.type === 'folder'
        ? firstResult.nodes[0].children.find(n => n.path.includes('no-symbols'))
        : null;

      if (fileWithSymbols && fileWithSymbols.type === 'file') {
        expect(fileWithSymbols.entities).toBeDefined();
        expect(fileWithSymbols.entities!.length).toBeGreaterThan(0);
      }

      if (fileWithoutSymbols && fileWithoutSymbols.type === 'file') {
        expect(fileWithoutSymbols.entities).toBeDefined();
        expect(fileWithoutSymbols.entities!.length).toBe(0);
      }

      // Second scan should use cache for both files
      scanner = new DirectoryScanner(testDir, AnalysisMode.CODE, 10 * 1024 * 1024, true, false);
      await scanner.initialize(false, false);
      const secondResult = await scanner.scan();

      // Both files should be cache hits
      expect(secondResult.cacheHits).toBe(2);
      expect(secondResult.cacheMisses).toBe(0);
    });
  });

  describe('file processing with different modes', () => {
    test('processes code files in CODE mode', async () => {
      const testFile = join(testDir, 'code.ts');
      await writeFile(testFile, 'const x = 1;');

      scanner = new DirectoryScanner(testDir, AnalysisMode.CODE, 10 * 1024 * 1024, false, false);
      await scanner.initialize(false, false);
      const result = await scanner.scan();

      expect(result.totalFiles).toBe(1);
    });

    test('processes documentation files in DOCS mode', async () => {
      const testFile = join(testDir, 'readme.md');
      await writeFile(testFile, '# Documentation\n\nSome content.');

      scanner = new DirectoryScanner(testDir, AnalysisMode.DOCS, 10 * 1024 * 1024, false, false);
      await scanner.initialize(false, false);
      const result = await scanner.scan();

      expect(result.totalFiles).toBe(1);
    });

    test('processes all files in ALL mode', async () => {
      await writeFile(join(testDir, 'code.ts'), 'const x = 1;');
      await writeFile(join(testDir, 'doc.md'), '# Documentation');
      await writeFile(join(testDir, 'data.json'), '{}');

      scanner = new DirectoryScanner(testDir, AnalysisMode.ALL, 10 * 1024 * 1024, false, false);
      await scanner.initialize(false, false);
      const result = await scanner.scan();

      expect(result.totalFiles).toBeGreaterThanOrEqual(3);
    });
  });

  describe('cache statistics', () => {
    test('reports cache hits and misses correctly', async () => {
      const testFile = join(testDir, 'cached.ts');
      await writeFile(testFile, 'function test() {}');

      // First scan - should be cache miss
      scanner = new DirectoryScanner(testDir, AnalysisMode.CODE, 10 * 1024 * 1024, false, false);
      await scanner.initialize(false, false);
      const firstResult = await scanner.scan();

      expect(firstResult.cacheHits).toBe(0);
      expect(firstResult.cacheMisses).toBe(1);

      // Second scan - should be cache hit
      scanner = new DirectoryScanner(testDir, AnalysisMode.CODE, 10 * 1024 * 1024, false, false);
      await scanner.initialize(false, false);
      const secondResult = await scanner.scan();

      expect(secondResult.cacheHits).toBe(1);
      expect(secondResult.cacheMisses).toBe(0);
    });

    test('cache miss when file content changes', async () => {
      const testFile = join(testDir, 'changing.ts');
      await writeFile(testFile, 'function v1() {}');

      // First scan
      scanner = new DirectoryScanner(testDir, AnalysisMode.CODE, 10 * 1024 * 1024, false, false);
      await scanner.initialize(false, false);
      await scanner.scan();

      // Modify file
      await writeFile(testFile, 'function v2() { return "updated"; }');

      // Second scan - should be cache miss due to changed hash
      scanner = new DirectoryScanner(testDir, AnalysisMode.CODE, 10 * 1024 * 1024, false, false);
      await scanner.initialize(false, false);
      const secondResult = await scanner.scan();

      expect(secondResult.cacheHits).toBe(0);
      expect(secondResult.cacheMisses).toBe(1);
    });
  });

  describe('max file size handling', () => {
    test('skips files larger than maxFileSize', async () => {
      const largeContent = 'x'.repeat(1024 * 1024 * 2); // 2MB
      await writeFile(join(testDir, 'large.ts'), largeContent);
      await writeFile(join(testDir, 'small.ts'), 'const x = 1;');

      // Set max file size to 1MB
      scanner = new DirectoryScanner(testDir, AnalysisMode.CODE, 1024 * 1024, false, false);
      await scanner.initialize(false, false);
      const result = await scanner.scan();

      // Should only process the small file
      expect(result.totalFiles).toBe(1);
    });

    test('processes files under maxFileSize', async () => {
      const content = 'x'.repeat(1024 * 100); // 100KB
      await writeFile(join(testDir, 'medium.ts'), content);

      // Set max file size to 1MB
      scanner = new DirectoryScanner(testDir, AnalysisMode.CODE, 1024 * 1024, false, false);
      await scanner.initialize(false, false);
      const result = await scanner.scan();

      expect(result.totalFiles).toBe(1);
      expect(result.totalTokens).toBeGreaterThan(0);
    });
  });

  describe('directory structure handling', () => {
    test('scans nested directories', async () => {
      const subDir = join(testDir, 'src', 'utils');
      await mkdir(subDir, { recursive: true });
      await writeFile(join(subDir, 'helper.ts'), 'export function helper() {}');

      scanner = new DirectoryScanner(testDir, AnalysisMode.CODE, 10 * 1024 * 1024, false, false);
      await scanner.initialize(false, false);
      const result = await scanner.scan();

      expect(result.totalFiles).toBe(1);
      expect(result.nodes.length).toBeGreaterThan(0);
    });

    test('handles empty directories', async () => {
      const emptyDir = join(testDir, 'empty');
      await mkdir(emptyDir, { recursive: true });

      scanner = new DirectoryScanner(testDir, AnalysisMode.CODE, 10 * 1024 * 1024, false, false);
      await scanner.initialize(false, false);
      const result = await scanner.scan();

      expect(result.totalFiles).toBe(0);
    });

    test('aggregates token counts from nested files', async () => {
      await mkdir(join(testDir, 'src'), { recursive: true });
      await writeFile(join(testDir, 'src', 'a.ts'), 'const a = 1;');
      await writeFile(join(testDir, 'src', 'b.ts'), 'const b = 2;');

      scanner = new DirectoryScanner(testDir, AnalysisMode.CODE, 10 * 1024 * 1024, false, false);
      await scanner.initialize(false, false);
      const result = await scanner.scan();

      expect(result.totalFiles).toBe(2);
      expect(result.totalTokens).toBeGreaterThan(0);
    });
  });

  describe('gitignore and default ignores', () => {
    test('respects gitignore when enabled', async () => {
      await writeFile(join(testDir, '.gitignore'), 'ignored.ts\n');
      await writeFile(join(testDir, 'ignored.ts'), 'const ignored = true;');
      await writeFile(join(testDir, 'included.ts'), 'const included = true;');

      scanner = new DirectoryScanner(testDir, AnalysisMode.CODE, 10 * 1024 * 1024, false, false);
      await scanner.initialize(true, false);
      const result = await scanner.scan();

      expect(result.totalFiles).toBe(1);
    });

    test('ignores node_modules by default', async () => {
      const nodeModules = join(testDir, 'node_modules');
      await mkdir(nodeModules, { recursive: true });
      await writeFile(join(nodeModules, 'package.ts'), 'export const pkg = true;');
      await writeFile(join(testDir, 'index.ts'), 'import { pkg } from "./node_modules/package";');

      scanner = new DirectoryScanner(testDir, AnalysisMode.CODE, 10 * 1024 * 1024, false, false);
      await scanner.initialize(false, true);
      const result = await scanner.scan();

      expect(result.totalFiles).toBe(1);
    });
  });

  describe('percentage calculation', () => {
    test('calculates percentages for nodes', async () => {
      await writeFile(join(testDir, 'large.ts'), 'x'.repeat(1000));
      await writeFile(join(testDir, 'small.ts'), 'x'.repeat(100));

      scanner = new DirectoryScanner(testDir, AnalysisMode.CODE, 10 * 1024 * 1024, false, false);
      await scanner.initialize(false, false);
      const result = await scanner.scan();

      const nodesWithPercentages = DirectoryScanner.calculatePercentages(result.nodes, false);

      expect(nodesWithPercentages.length).toBeGreaterThan(0);
      
      if (nodesWithPercentages[0]?.type === 'folder') {
        const children = nodesWithPercentages[0].children;
        children.forEach(child => {
          expect(child.percentage).toBeDefined();
          expect(child.percentage).toBeGreaterThanOrEqual(0);
          expect(child.percentage).toBeLessThanOrEqual(100);
        });
      }
    });

    test('percentages sum to approximately 100% in relative mode', async () => {
      await writeFile(join(testDir, 'a.ts'), 'const a = 1;');
      await writeFile(join(testDir, 'b.ts'), 'const b = 2;');

      scanner = new DirectoryScanner(testDir, AnalysisMode.CODE, 10 * 1024 * 1024, false, false);
      await scanner.initialize(false, false);
      const result = await scanner.scan();

      const nodesWithPercentages = DirectoryScanner.calculatePercentages(result.nodes, false);

      if (nodesWithPercentages[0]?.type === 'folder') {
        const totalPercentage = nodesWithPercentages[0].children.reduce(
          (sum, child) => sum + (child.percentage || 0),
          0
        );
        expect(totalPercentage).toBeGreaterThan(99);
        expect(totalPercentage).toBeLessThanOrEqual(100);
      }
    });
  });
});