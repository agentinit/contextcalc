import { test, expect } from 'bun:test';
import { formatAsCsv } from '../src/formatters/csvFormatter.js';
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

test('formatAsCsv with empty result returns header only', () => {
  const result: ScanResult = {
    nodes: [],
    totalTokens: 0,
    totalFiles: 0,
    cacheHits: 0,
    cacheMisses: 0
  };

  const output = formatAsCsv(result, createTreeOptions());
  expect(output).toBe('Path,Tokens,Lines,Size(bytes),Type,Percentage\n');
});

test('formatAsCsv with single file', () => {
  const file = createTestFile('test.js', 150, 20, 'js');
  file.percentage = 100.0;

  const result: ScanResult = {
    nodes: [file],
    totalTokens: 150,
    totalFiles: 1,
    cacheHits: 0,
    cacheMisses: 0
  };

  const output = formatAsCsv(result, createTreeOptions());
  const lines = output.split('\n');
  
  expect(lines[0]).toBe('Path,Tokens,Lines,Size(bytes),Type,Percentage');
  expect(lines[1]).toBe('test.js,150,20,1000,"js",100.0');
  expect(lines[2]).toBe('"Total",150,20,1000,"",100.0');
});

test('formatAsCsv with multiple files sorted by tokens', () => {
  const file1 = createTestFile('small.js', 50, 10, 'js');
  file1.percentage = 25.0;
  const file2 = createTestFile('large.ts', 150, 30, 'ts');
  file2.percentage = 75.0;

  const result: ScanResult = {
    nodes: [file1, file2],
    totalTokens: 200,
    totalFiles: 2,
    cacheHits: 0,
    cacheMisses: 0
  };

  const output = formatAsCsv(result, createTreeOptions());
  const lines = output.split('\n');
  
  expect(lines[0]).toBe('Path,Tokens,Lines,Size(bytes),Type,Percentage');
  // Should be sorted by tokens (descending), so large.ts comes first
  expect(lines[1]).toBe('large.ts,150,30,1000,"ts",75.0');
  expect(lines[2]).toBe('small.js,50,10,1000,"js",25.0');
  expect(lines[3]).toBe('"Total",200,40,2000,"",100.0');
});

test('formatAsCsv with nested folder structure', () => {
  const file1 = createTestFile('src/main.js', 100, 20, 'js');
  file1.percentage = 50.0;
  const file2 = createTestFile('src/utils/helper.ts', 100, 15, 'ts');  
  file2.percentage = 50.0;
  
  const utilsFolder = createTestFolder('src/utils', 100, [file2]);
  const srcFolder = createTestFolder('src', 200, [file1, utilsFolder]);

  const result: ScanResult = {
    nodes: [srcFolder],
    totalTokens: 200,
    totalFiles: 2,
    cacheHits: 0,
    cacheMisses: 0
  };

  const output = formatAsCsv(result, createTreeOptions());
  const lines = output.split('\n');
  
  expect(lines[0]).toBe('Path,Tokens,Lines,Size(bytes),Type,Percentage');
  expect(lines[1]).toBe('src/main.js,100,20,1000,"js",50.0');
  expect(lines[2]).toBe('src/utils/helper.ts,100,15,1000,"ts",50.0');
  expect(lines[3]).toBe('"Total",200,35,2000,"",100.0');
});

test('formatAsCsv handles special characters in paths', () => {
  const file1 = createTestFile('file with spaces.js', 100, 10, 'js');
  file1.percentage = 50.0;
  const file2 = createTestFile('file,with,commas.js', 100, 10, 'js');
  file2.percentage = 50.0;
  const file3 = createTestFile('file"with"quotes.js', 100, 10, 'js');
  file3.percentage = 50.0;

  const result: ScanResult = {
    nodes: [file1, file2, file3],
    totalTokens: 300,
    totalFiles: 3,
    cacheHits: 0,
    cacheMisses: 0
  };

  const output = formatAsCsv(result, createTreeOptions());
  const lines = output.split('\n');
  
  expect(lines[1]).toBe('file with spaces.js,100,10,1000,"js",50.0');
  expect(lines[2]).toBe('"file,with,commas.js",100,10,1000,"js",50.0');
  expect(lines[3]).toBe('"file""with""quotes.js",100,10,1000,"js",50.0');
});

test('formatAsCsv respects minTokens filter', () => {
  const file1 = createTestFile('small.js', 50, 10, 'js');
  const file2 = createTestFile('large.js', 200, 20, 'js');
  
  const result: ScanResult = {
    nodes: [file1, file2],
    totalTokens: 250,
    totalFiles: 2,
    cacheHits: 0,
    cacheMisses: 0
  };

  const options = createTreeOptions();
  options.minTokens = 100; // Filter out file1

  const output = formatAsCsv(result, options);
  const lines = output.split('\n');
  
  expect(lines.length).toBe(3); // header + 1 file + total
  expect(lines[1]).toBe('large.js,200,20,1000,"js",10.0');
});

test('formatAsCsv handles files without percentage', () => {
  const file = createTestFile('test.js', 100, 10, 'js');
  file.percentage = undefined;

  const result: ScanResult = {
    nodes: [file],
    totalTokens: 100,
    totalFiles: 1,
    cacheHits: 0,
    cacheMisses: 0
  };

  const output = formatAsCsv(result, createTreeOptions());
  const lines = output.split('\n');
  
  expect(lines[1]).toBe('test.js,100,10,1000,"js",');
});