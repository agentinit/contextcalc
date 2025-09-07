import { test, expect } from 'bun:test';
import { formatAsEnhancedTree } from '../src/formatters/enhancedTreeFormatter.js';
import type { Node, ScanResult, TreeOptions } from '../src/types/index.js';
import { AnalysisMode, TreeSortBy } from '../src/types/index.js';

// Helper function to create a test file node
function createTestFile(path: string, tokens = 100, lines = 10, filetype = 'js'): Node {
  return {
    path,
    hash: 'test-hash',
    tokens,
    size: 1000,
    lines,
    type: 'file',
    filetype,
    percentage: 10
  };
}

// Helper function to create a test folder node
function createTestFolder(path: string, tokens = 100, children: Node[] = []): Node {
  return {
    path,
    hash: 'test-hash',
    tokens,
    size: 1000,
    type: 'folder',
    children,
    percentage: 10
  };
}

// Helper function to create default tree options
function createTreeOptions(depth?: number): TreeOptions {
  return {
    mode: AnalysisMode.ALL,
    maxSize: '10M',
    gitignore: true,
    defaultIgnores: true,
    sort: TreeSortBy.TOKENS,
    depth,
    minTokens: undefined,
    metrics: {
      showTokens: true,
      showLines: true,
      showSize: true,
      showPercentages: true
    },
    absolutePercentages: true,
    showBars: false,
    colors: false,
    debug: false
  };
}

test('formatAsEnhancedTree with depth 0 shows only root', () => {
  const root = createTestFolder('.', 300, [
    createTestFile('file1.js', 100),
    createTestFolder('folder1', 200, [
      createTestFile('folder1/file2.js', 200)
    ])
  ]);

  const result: ScanResult = {
    nodes: [root],
    totalTokens: 300,
    totalFiles: 3,
    cacheHits: 0,
    cacheMisses: 0
  };

  const output = formatAsEnhancedTree(result, createTreeOptions(0));
  const lines = output.split('\n');
  
  // Should only show root line plus summary
  expect(lines.filter(line => line.trim() && !line.includes('Summary:') && !line.includes('Completed'))).toHaveLength(1);
  expect(output).toContain('. (300 tokens, 1000B) (10.0%)');
  expect(output).not.toContain('file1.js');
  expect(output).not.toContain('folder1');
});

test('formatAsEnhancedTree with depth 1 shows root plus immediate children', () => {
  const root = createTestFolder('.', 600, [
    createTestFile('file1.js', 100),
    createTestFolder('folder1', 500, [
      createTestFile('folder1/file2.js', 200),
      createTestFolder('folder1/nested', 300, [
        createTestFile('folder1/nested/file3.js', 300)
      ])
    ])
  ]);

  const result: ScanResult = {
    nodes: [root],
    totalTokens: 600,
    totalFiles: 4,
    cacheHits: 0,
    cacheMisses: 0
  };

  const output = formatAsEnhancedTree(result, createTreeOptions(1));
  const lines = output.split('\n').filter(line => line.trim() && !line.includes('Summary:') && !line.includes('Completed'));
  
  // Should show root + 2 immediate children (3 total)
  expect(lines).toHaveLength(3);
  expect(output).toContain('. (600 tokens, 1000B) (10.0%)');
  expect(output).toContain('file1.js');
  expect(output).toContain('folder1');
  // Should not show nested children
  expect(output).not.toContain('folder1/file2.js');
  expect(output).not.toContain('folder1/nested');
  expect(output).not.toContain('folder1/nested/file3.js');
});

test('formatAsEnhancedTree with depth 2 shows root plus two levels of children', () => {
  const root = createTestFolder('.', 600, [
    createTestFile('file1.js', 100),
    createTestFolder('folder1', 500, [
      createTestFile('folder1/file2.js', 200),
      createTestFolder('folder1/nested', 300, [
        createTestFile('folder1/nested/file3.js', 300)
      ])
    ])
  ]);

  const result: ScanResult = {
    nodes: [root],
    totalTokens: 600,
    totalFiles: 4,
    cacheHits: 0,
    cacheMisses: 0
  };

  const output = formatAsEnhancedTree(result, createTreeOptions(2));
  const lines = output.split('\n').filter(line => line.trim() && !line.includes('Summary:') && !line.includes('Completed'));
  
  // Should show root + immediate children + second level (5 total)
  expect(lines).toHaveLength(5);
  expect(output).toContain('. (600 tokens, 1000B) (10.0%)');
  expect(output).toContain('file1.js');
  expect(output).toContain('folder1');
  expect(output).toContain('folder1/file2.js');
  expect(output).toContain('folder1/nested');
  // Should not show third level
  expect(output).not.toContain('folder1/nested/file3.js');
});

test('formatAsEnhancedTree with unlimited depth shows full tree', () => {
  const root = createTestFolder('.', 600, [
    createTestFile('file1.js', 100),
    createTestFolder('folder1', 500, [
      createTestFile('folder1/file2.js', 200),
      createTestFolder('folder1/nested', 300, [
        createTestFile('folder1/nested/file3.js', 300)
      ])
    ])
  ]);

  const result: ScanResult = {
    nodes: [root],
    totalTokens: 600,
    totalFiles: 4,
    cacheHits: 0,
    cacheMisses: 0
  };

  const output = formatAsEnhancedTree(result, createTreeOptions(undefined));
  const lines = output.split('\n').filter(line => line.trim() && !line.includes('Summary:') && !line.includes('Completed'));
  
  // Should show all nodes (6 total)
  expect(lines).toHaveLength(6);
  expect(output).toContain('. (600 tokens, 1000B) (10.0%)');
  expect(output).toContain('file1.js');
  expect(output).toContain('folder1');
  expect(output).toContain('folder1/file2.js');
  expect(output).toContain('folder1/nested');
  expect(output).toContain('folder1/nested/file3.js');
});

test('formatAsEnhancedTree handles empty nodes array', () => {
  const result: ScanResult = {
    nodes: [],
    totalTokens: 0,
    totalFiles: 0,
    cacheHits: 0,
    cacheMisses: 0
  };

  const output = formatAsEnhancedTree(result, createTreeOptions(1));
  expect(output).toBe('No files found matching the criteria.');
});

test('formatAsEnhancedTree handles single file', () => {
  const file = createTestFile('single.js', 150);

  const result: ScanResult = {
    nodes: [file],
    totalTokens: 150,
    totalFiles: 1,
    cacheHits: 0,
    cacheMisses: 0
  };

  const output = formatAsEnhancedTree(result, createTreeOptions(1));
  const lines = output.split('\n').filter(line => line.trim() && !line.includes('Summary:') && !line.includes('Completed'));
  
  // Should show only the file
  expect(lines).toHaveLength(1);
  expect(output).toContain('single.js (150 tokens, 10 lines, 1000B) (10.0%)');
});

test('formatAsEnhancedTree depth boundary behavior is consistent', () => {
  // Create a deep nested structure to test exact boundaries
  const root = createTestFolder('.', 100, [
    createTestFolder('level1', 100, [
      createTestFolder('level1/level2', 100, [
        createTestFolder('level1/level2/level3', 100, [
          createTestFile('level1/level2/level3/file.js', 100)
        ])
      ])
    ])
  ]);

  const result: ScanResult = {
    nodes: [root],
    totalTokens: 100,
    totalFiles: 2,
    cacheHits: 0,
    cacheMisses: 0
  };

  // Test that depth n includes exactly n+1 levels (0-indexed)
  const depth3Output = formatAsEnhancedTree(result, createTreeOptions(3));
  expect(depth3Output).toContain('level1/level2/level3');
  expect(depth3Output).not.toContain('level1/level2/level3/file.js');

  const depth4Output = formatAsEnhancedTree(result, createTreeOptions(4));
  expect(depth4Output).toContain('level1/level2/level3');
  expect(depth4Output).toContain('level1/level2/level3/file.js');
});