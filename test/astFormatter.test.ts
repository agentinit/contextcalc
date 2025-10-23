import { test, expect, describe } from 'bun:test';
import { formatAsAST } from '../src/formatters/astFormatter.js';
import type { ScanResult, FileNode, FunctionSymbol, ClassSymbol, ImportSymbol, InterfaceSymbol, VariableSymbol, TreeOptions } from '../src/types/index.js';
import { SymbolType, AnalysisMode, TreeSortBy } from '../src/types/index.js';

describe('AST Formatter', () => {
  const createMockScanResult = (nodes: FileNode[]): ScanResult => ({
    nodes,
    totalTokens: 1000,
    totalFiles: nodes.length,
    cacheHits: 0,
    cacheMisses: nodes.length
  });

  const mockTreeOptions: TreeOptions = {
    mode: AnalysisMode.CODE,
    maxSize: '10M',
    gitignore: true,
    defaultIgnores: true,
    sort: TreeSortBy.TOKENS,
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

  describe('basic formatting', () => {
    test('formats file with no entities', () => {
      const fileNode: FileNode = {
        path: 'empty.ts',
        hash: 'abc123',
        tokens: 10,
        lines: 5,
        size: 100,
        type: 'file',
        filetype: 'typescript'
      };

      const result = createMockScanResult([fileNode]);
      const output = formatAsAST(result, mockTreeOptions);

      // Should show summary even with no symbols
      expect(output).toContain('Found 0 symbols');
      expect(output).toContain('1 files');
    });

    test('formats file with function', () => {
      const funcSymbol: FunctionSymbol = {
        name: 'greet',
        type: SymbolType.FUNCTION,
        location: {
          startLine: 1,
          startColumn: 0,
          endLine: 3,
          endColumn: 1,
          startByte: 0,
          endByte: 50
        },
        parameters: [
          { name: 'name', type: 'string' }
        ],
        returnType: 'string'
      };

      const fileNode: FileNode = {
        path: 'test.ts',
        hash: 'abc123',
        tokens: 50,
        lines: 10,
        size: 200,
        type: 'file',
        filetype: 'typescript',
        entities: [funcSymbol]
      };

      const result = createMockScanResult([fileNode]);
      const output = formatAsAST(result, mockTreeOptions);

      expect(output).toContain('test.ts');
      expect(output).toContain('greet');
      expect(output).toContain('lines 1-3');
      expect(output).toContain('Found 1 symbols');
    });

    test('formats file with class and methods', () => {
      const classSymbol: ClassSymbol = {
        name: 'Calculator',
        type: SymbolType.CLASS,
        location: {
          startLine: 1,
          startColumn: 0,
          endLine: 10,
          endColumn: 1,
          startByte: 0,
          endByte: 200
        },
        members: [
          {
            name: 'add',
            type: SymbolType.METHOD,
            location: {
              startLine: 2,
              startColumn: 2,
              endLine: 4,
              endColumn: 3,
              startByte: 20,
              endByte: 80
            },
            parameters: [
              { name: 'a', type: 'number' },
              { name: 'b', type: 'number' }
            ],
            returnType: 'number'
          } as FunctionSymbol
        ]
      };

      const fileNode: FileNode = {
        path: 'calc.ts',
        hash: 'abc123',
        tokens: 100,
        lines: 15,
        size: 300,
        type: 'file',
        filetype: 'typescript',
        entities: [classSymbol]
      };

      const result = createMockScanResult([fileNode]);
      const output = formatAsAST(result, mockTreeOptions);

      expect(output).toContain('Calculator');
      expect(output).toContain('add');
      // Should count both class and method as symbols
      expect(output).toContain('Found 2 symbols');
    });
  });

  describe('symbol icons', () => {
    test('uses correct icons for different symbol types', () => {
      const entities = [
        {
          name: 'myFunc',
          type: SymbolType.FUNCTION,
          location: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 10, startByte: 0, endByte: 10 },
          parameters: []
        } as FunctionSymbol,
        {
          name: 'MyClass',
          type: SymbolType.CLASS,
          location: { startLine: 2, startColumn: 0, endLine: 2, endColumn: 10, startByte: 20, endByte: 30 },
          members: []
        } as ClassSymbol,
        {
          name: 'IService',
          type: SymbolType.INTERFACE,
          location: { startLine: 3, startColumn: 0, endLine: 3, endColumn: 10, startByte: 40, endByte: 50 },
          members: []
        } as InterfaceSymbol,
        {
          name: 'fs',
          type: SymbolType.IMPORT,
          location: { startLine: 4, startColumn: 0, endLine: 4, endColumn: 10, startByte: 60, endByte: 70 },
          from: 'node:fs',
          imports: []
        } as ImportSymbol
      ];

      const fileNode: FileNode = {
        path: 'symbols.ts',
        hash: 'abc123',
        tokens: 200,
        lines: 20,
        size: 400,
        type: 'file',
        filetype: 'typescript',
        entities
      };

      const result = createMockScanResult([fileNode]);
      const output = formatAsAST(result, { ...mockTreeOptions, colors: false });

      // Without colors, should use plain characters
      expect(output).toContain('f myFunc'); // function
      expect(output).toContain('C MyClass'); // class
      expect(output).toContain('I IService'); // interface
      expect(output).toContain('< from "node:fs"'); // import
    });
  });

  describe('parameter formatting', () => {
    test('formats function parameters correctly', () => {
      const funcSymbol: FunctionSymbol = {
        name: 'process',
        type: SymbolType.FUNCTION,
        location: {
          startLine: 1,
          startColumn: 0,
          endLine: 3,
          endColumn: 1,
          startByte: 0,
          endByte: 100
        },
        parameters: [
          { name: 'id', type: 'string' },
          { name: 'count', type: 'number', defaultValue: '10' },
          { name: 'opts', type: 'object', optional: true }
        ],
        returnType: 'void'
      };

      const fileNode: FileNode = {
        path: 'test.ts',
        hash: 'abc123',
        tokens: 50,
        lines: 10,
        size: 200,
        type: 'file',
        filetype: 'typescript',
        entities: [funcSymbol]
      };

      const result = createMockScanResult([fileNode]);
      const output = formatAsAST(result, mockTreeOptions);

      expect(output).toContain('id: string');
      expect(output).toContain('count: number = 10');
      expect(output).toContain('opts: object?'); // Optional marker comes after type
    });

    test('formats async function', () => {
      const funcSymbol: FunctionSymbol = {
        name: 'fetchData',
        type: SymbolType.FUNCTION,
        location: {
          startLine: 1,
          startColumn: 0,
          endLine: 3,
          endColumn: 1,
          startByte: 0,
          endByte: 100
        },
        parameters: [],
        returnType: 'Promise<string>',
        async: true
      };

      const fileNode: FileNode = {
        path: 'async.ts',
        hash: 'abc123',
        tokens: 50,
        lines: 10,
        size: 200,
        type: 'file',
        filetype: 'typescript',
        entities: [funcSymbol]
      };

      const result = createMockScanResult([fileNode]);
      const output = formatAsAST(result, mockTreeOptions);

      expect(output).toContain('async fetchData');
    });
  });

  describe('class formatting', () => {
    test('formats class with extends and implements', () => {
      const classSymbol: ClassSymbol = {
        name: 'MyService',
        type: SymbolType.CLASS,
        location: {
          startLine: 1,
          startColumn: 0,
          endLine: 10,
          endColumn: 1,
          startByte: 0,
          endByte: 200
        },
        extends: 'BaseService',
        implements: ['IService', 'ILogger'],
        members: []
      };

      const fileNode: FileNode = {
        path: 'service.ts',
        hash: 'abc123',
        tokens: 100,
        lines: 15,
        size: 300,
        type: 'file',
        filetype: 'typescript',
        entities: [classSymbol]
      };

      const result = createMockScanResult([fileNode]);
      const output = formatAsAST(result, mockTreeOptions);

      expect(output).toContain('MyService extends BaseService');
      expect(output).toContain('implements IService, ILogger');
    });

    test('formats abstract class', () => {
      const classSymbol: ClassSymbol = {
        name: 'BaseClass',
        type: SymbolType.CLASS,
        location: {
          startLine: 1,
          startColumn: 0,
          endLine: 5,
          endColumn: 1,
          startByte: 0,
          endByte: 100
        },
        abstract: true,
        members: []
      };

      const fileNode: FileNode = {
        path: 'base.ts',
        hash: 'abc123',
        tokens: 50,
        lines: 10,
        size: 150,
        type: 'file',
        filetype: 'typescript',
        entities: [classSymbol]
      };

      const result = createMockScanResult([fileNode]);
      const output = formatAsAST(result, mockTreeOptions);

      expect(output).toContain('abstract BaseClass');
    });
  });

  describe('import/export formatting', () => {
    test('formats import with named imports', () => {
      const importSymbol: ImportSymbol = {
        name: 'node:fs/promises',
        type: SymbolType.IMPORT,
        location: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 50,
          startByte: 0,
          endByte: 50
        },
        from: 'node:fs/promises',
        imports: ['readFile', 'writeFile']
      };

      const fileNode: FileNode = {
        path: 'io.ts',
        hash: 'abc123',
        tokens: 20,
        lines: 5,
        size: 100,
        type: 'file',
        filetype: 'typescript',
        entities: [importSymbol]
      };

      const result = createMockScanResult([fileNode]);
      const output = formatAsAST(result, mockTreeOptions);

      expect(output).toContain('from "node:fs/promises"');
      expect(output).toContain('{ readFile, writeFile }');
    });

    test('formats import with default', () => {
      const importSymbol: ImportSymbol = {
        name: 'tree-sitter',
        type: SymbolType.IMPORT,
        location: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 30,
          startByte: 0,
          endByte: 30
        },
        from: 'tree-sitter',
        imports: [],
        default: 'Parser'
      };

      const fileNode: FileNode = {
        path: 'parser.ts',
        hash: 'abc123',
        tokens: 20,
        lines: 5,
        size: 100,
        type: 'file',
        filetype: 'typescript',
        entities: [importSymbol]
      };

      const result = createMockScanResult([fileNode]);
      const output = formatAsAST(result, mockTreeOptions);

      expect(output).toContain('Parser from "tree-sitter"');
    });
  });

  describe('metrics display', () => {
    test('includes file metrics when enabled', () => {
      const funcSymbol: FunctionSymbol = {
        name: 'test',
        type: SymbolType.FUNCTION,
        location: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 10,
          startByte: 0,
          endByte: 10
        },
        parameters: []
      };

      const fileNode: FileNode = {
        path: 'test.ts',
        hash: 'abc123',
        tokens: 150,
        lines: 25,
        size: 2048,
        type: 'file',
        filetype: 'typescript',
        entities: [funcSymbol]
      };

      const result = createMockScanResult([fileNode]);
      const output = formatAsAST(result, mockTreeOptions);

      expect(output).toContain('150 tokens');
      expect(output).toContain('25 lines');
      expect(output).toContain('2.0KB');
    });

    test('excludes metrics when disabled', () => {
      const fileNode: FileNode = {
        path: 'test.ts',
        hash: 'abc123',
        tokens: 150,
        lines: 25,
        size: 2048,
        type: 'file',
        filetype: 'typescript',
        entities: []
      };

      const result = createMockScanResult([fileNode]);
      const optionsWithoutMetrics = {
        ...mockTreeOptions,
        metrics: {
          showTokens: false,
          showLines: false,
          showSize: false,
          showPercentages: false
        }
      };
      const output = formatAsAST(result, optionsWithoutMetrics);

      expect(output).not.toContain('150 tokens');
      expect(output).not.toContain('25 lines');
    });
  });

  describe('summary', () => {
    test('counts all symbols including nested ones', () => {
      const classSymbol: ClassSymbol = {
        name: 'Example',
        type: SymbolType.CLASS,
        location: {
          startLine: 1,
          startColumn: 0,
          endLine: 20,
          endColumn: 1,
          startByte: 0,
          endByte: 500
        },
        members: [
          {
            name: 'method1',
            type: SymbolType.METHOD,
            location: {
              startLine: 2,
              startColumn: 2,
              endLine: 5,
              endColumn: 3,
              startByte: 20,
              endByte: 100
            },
            parameters: []
          } as FunctionSymbol,
          {
            name: 'method2',
            type: SymbolType.METHOD,
            location: {
              startLine: 7,
              startColumn: 2,
              endLine: 10,
              endColumn: 3,
              startByte: 120,
              endByte: 200
            },
            parameters: []
          } as FunctionSymbol
        ]
      };

      const fileNode: FileNode = {
        path: 'example.ts',
        hash: 'abc123',
        tokens: 200,
        lines: 30,
        size: 600,
        type: 'file',
        filetype: 'typescript',
        entities: [classSymbol]
      };

      const result = createMockScanResult([fileNode]);
      const output = formatAsAST(result, mockTreeOptions);

      // Should count class + 2 methods = 3 symbols
      expect(output).toContain('Found 3 symbols');
    });

    test('shows correct file count', () => {
      const file1: FileNode = {
        path: 'file1.ts',
        hash: 'abc123',
        tokens: 100,
        lines: 15,
        size: 200,
        type: 'file',
        filetype: 'typescript',
        entities: []
      };

      const file2: FileNode = {
        path: 'file2.ts',
        hash: 'def456',
        tokens: 150,
        lines: 20,
        size: 300,
        type: 'file',
        filetype: 'typescript',
        entities: []
      };

      const result = createMockScanResult([file1, file2]);
      const output = formatAsAST(result, mockTreeOptions);

      expect(output).toContain('2 files');
    });
  });

  describe('location display', () => {
    test('shows single line for symbols on one line', () => {
      const constSymbol: VariableSymbol = {
        name: 'API_KEY',
        type: SymbolType.CONSTANT,
        location: {
          startLine: 5,
          startColumn: 0,
          endLine: 5,
          endColumn: 25,
          startByte: 100,
          endByte: 125
        },
        variableType: 'string'
      };

      const fileNode: FileNode = {
        path: 'config.ts',
        hash: 'abc123',
        tokens: 50,
        lines: 10,
        size: 150,
        type: 'file',
        filetype: 'typescript',
        entities: [constSymbol]
      };

      const result = createMockScanResult([fileNode]);
      const output = formatAsAST(result, mockTreeOptions);

      expect(output).toContain('line 5');
      expect(output).not.toContain('lines 5-5');
    });

    test('shows line range for multi-line symbols', () => {
      const funcSymbol: FunctionSymbol = {
        name: 'process',
        type: SymbolType.FUNCTION,
        location: {
          startLine: 10,
          startColumn: 0,
          endLine: 15,
          endColumn: 1,
          startByte: 200,
          endByte: 350
        },
        parameters: []
      };

      const fileNode: FileNode = {
        path: 'utils.ts',
        hash: 'abc123',
        tokens: 100,
        lines: 20,
        size: 400,
        type: 'file',
        filetype: 'typescript',
        entities: [funcSymbol]
      };

      const result = createMockScanResult([fileNode]);
      const output = formatAsAST(result, mockTreeOptions);

      expect(output).toContain('lines 10-15');
    });
  });

  describe('summary statistics - filesWithSymbols vs filesProcessed', () => {
    test('uses filesWithSymbols count which includes cache hits', () => {
      const fileWithSymbols: FileNode = {
        path: 'service.ts',
        hash: 'abc123',
        tokens: 100,
        lines: 20,
        size: 400,
        type: 'file',
        filetype: 'typescript',
        entities: [{
          name: 'Service',
          type: SymbolType.CLASS,
          location: {
            startLine: 1,
            startColumn: 0,
            endLine: 10,
            endColumn: 1,
            startByte: 0,
            endByte: 200
          },
          members: []
        } as ClassSymbol]
      };

      const result: ScanResult = {
        nodes: [fileWithSymbols],
        totalTokens: 100,
        totalFiles: 1,
        cacheHits: 1,  // This file was cached
        cacheMisses: 0,
        astStats: {
          filesProcessed: 0,  // No files freshly parsed
          filesSkipped: 0,
          skippedReasons: new Map()
        }
      };

      const output = formatAsAST(result, mockTreeOptions);

      // Should show 1 file with symbols, not 0 (filesProcessed)
      expect(output).toContain('Found 1 symbols across 1 file');
      expect(output).not.toContain('0 file');
    });

    test('counts all files with symbols regardless of cache status', () => {
      const file1: FileNode = {
        path: 'cached.ts',
        hash: 'abc123',
        tokens: 50,
        lines: 10,
        size: 150,
        type: 'file',
        filetype: 'typescript',
        entities: [{
          name: 'cachedFunc',
          type: SymbolType.FUNCTION,
          location: {
            startLine: 1,
            startColumn: 0,
            endLine: 3,
            endColumn: 1,
            startByte: 0,
            endByte: 50
          },
          parameters: []
        } as FunctionSymbol]
      };

      const file2: FileNode = {
        path: 'fresh.ts',
        hash: 'def456',
        tokens: 75,
        lines: 15,
        size: 200,
        type: 'file',
        filetype: 'typescript',
        entities: [{
          name: 'freshFunc',
          type: SymbolType.FUNCTION,
          location: {
            startLine: 1,
            startColumn: 0,
            endLine: 5,
            endColumn: 1,
            startByte: 0,
            endByte: 80
          },
          parameters: []
        } as FunctionSymbol]
      };

      const result: ScanResult = {
        nodes: [file1, file2],
        totalTokens: 125,
        totalFiles: 2,
        cacheHits: 1,   // file1 was cached
        cacheMisses: 1, // file2 was freshly parsed
        astStats: {
          filesProcessed: 1,  // Only file2 was freshly parsed
          filesSkipped: 0,
          skippedReasons: new Map()
        }
      };

      const output = formatAsAST(result, mockTreeOptions);

      // Should show 2 files with symbols (both cached and fresh)
      expect(output).toContain('Found 2 symbols across 2 files');
    });

    test('correctly counts symbols in nested structures', () => {
      const classWithMethods: ClassSymbol = {
        name: 'ComplexClass',
        type: SymbolType.CLASS,
        location: {
          startLine: 1,
          startColumn: 0,
          endLine: 20,
          endColumn: 1,
          startByte: 0,
          endByte: 500
        },
        members: [
          {
            name: 'method1',
            type: SymbolType.METHOD,
            location: {
              startLine: 2,
              startColumn: 2,
              endLine: 5,
              endColumn: 3,
              startByte: 20,
              endByte: 100
            },
            parameters: []
          } as FunctionSymbol,
          {
            name: 'method2',
            type: SymbolType.METHOD,
            location: {
              startLine: 7,
              startColumn: 2,
              endLine: 10,
              endColumn: 3,
              startByte: 120,
              endByte: 200
            },
            parameters: []
          } as FunctionSymbol,
          {
            name: 'method3',
            type: SymbolType.METHOD,
            location: {
              startLine: 12,
              startColumn: 2,
              endLine: 15,
              endColumn: 3,
              startByte: 220,
              endByte: 300
            },
            parameters: []
          } as FunctionSymbol
        ]
      };

      const fileNode: FileNode = {
        path: 'complex.ts',
        hash: 'abc123',
        tokens: 200,
        lines: 30,
        size: 600,
        type: 'file',
        filetype: 'typescript',
        entities: [classWithMethods]
      };

      const result: ScanResult = {
        nodes: [fileNode],
        totalTokens: 200,
        totalFiles: 1,
        cacheHits: 0,
        cacheMisses: 1,
        astStats: {
          filesProcessed: 1,
          filesSkipped: 0,
          skippedReasons: new Map()
        }
      };

      const output = formatAsAST(result, mockTreeOptions);

      // Should count class + 3 methods = 4 symbols total
      expect(output).toContain('Found 4 symbols');
      expect(output).toContain('1 file');
    });

    test('handles files with no symbols correctly', () => {
      const fileWithNoSymbols: FileNode = {
        path: 'empty.ts',
        hash: 'abc123',
        tokens: 10,
        lines: 5,
        size: 50,
        type: 'file',
        filetype: 'typescript',
        entities: []  // Empty array - no symbols
      };

      const fileWithSymbols: FileNode = {
        path: 'withSymbols.ts',
        hash: 'def456',
        tokens: 50,
        lines: 10,
        size: 150,
        type: 'file',
        filetype: 'typescript',
        entities: [{
          name: 'test',
          type: SymbolType.FUNCTION,
          location: {
            startLine: 1,
            startColumn: 0,
            endLine: 3,
            endColumn: 1,
            startByte: 0,
            endByte: 50
          },
          parameters: []
        } as FunctionSymbol]
      };

      const result: ScanResult = {
        nodes: [fileWithNoSymbols, fileWithSymbols],
        totalTokens: 60,
        totalFiles: 2,
        cacheHits: 0,
        cacheMisses: 2,
        astStats: {
          filesProcessed: 2,
          filesSkipped: 0,
          skippedReasons: new Map()
        }
      };

      const output = formatAsAST(result, mockTreeOptions);

      // Should show 1 symbol in 1 file (only the file with symbols)
      expect(output).toContain('Found 1 symbols across 1 file');
    });

    test('uses singular "file" for single file with symbols', () => {
      const fileNode: FileNode = {
        path: 'single.ts',
        hash: 'abc123',
        tokens: 50,
        lines: 10,
        size: 150,
        type: 'file',
        filetype: 'typescript',
        entities: [{
          name: 'singleFunc',
          type: SymbolType.FUNCTION,
          location: {
            startLine: 1,
            startColumn: 0,
            endLine: 3,
            endColumn: 1,
            startByte: 0,
            endByte: 50
          },
          parameters: []
        } as FunctionSymbol]
      };

      const result: ScanResult = {
        nodes: [fileNode],
        totalTokens: 50,
        totalFiles: 1,
        cacheHits: 0,
        cacheMisses: 1,
        astStats: {
          filesProcessed: 1,
          filesSkipped: 0,
          skippedReasons: new Map()
        }
      };

      const output = formatAsAST(result, mockTreeOptions);

      expect(output).toContain('1 file');
      expect(output).not.toContain('1 files');
    });

    test('uses plural "files" for multiple files with symbols', () => {
      const file1: FileNode = {
        path: 'first.ts',
        hash: 'abc123',
        tokens: 50,
        lines: 10,
        size: 150,
        type: 'file',
        filetype: 'typescript',
        entities: [{
          name: 'func1',
          type: SymbolType.FUNCTION,
          location: { startLine: 1, startColumn: 0, endLine: 3, endColumn: 1, startByte: 0, endByte: 50 },
          parameters: []
        } as FunctionSymbol]
      };

      const file2: FileNode = {
        path: 'second.ts',
        hash: 'def456',
        tokens: 60,
        lines: 12,
        size: 180,
        type: 'file',
        filetype: 'typescript',
        entities: [{
          name: 'func2',
          type: SymbolType.FUNCTION,
          location: { startLine: 1, startColumn: 0, endLine: 4, endColumn: 1, startByte: 0, endByte: 60 },
          parameters: []
        } as FunctionSymbol]
      };

      const result: ScanResult = {
        nodes: [file1, file2],
        totalTokens: 110,
        totalFiles: 2,
        cacheHits: 0,
        cacheMisses: 2,
        astStats: {
          filesProcessed: 2,
          filesSkipped: 0,
          skippedReasons: new Map()
        }
      };

      const output = formatAsAST(result, mockTreeOptions);

      expect(output).toContain('2 files');
      expect(output).not.toContain('2 file');
    });

    test('correctly distinguishes between filesProcessed and filesWithSymbols when some cached files have symbols', () => {
      // Scenario: 3 files total
      // - 1 freshly processed with symbols (filesProcessed = 1)
      // - 2 cached files, both with symbols
      // filesWithSymbols should be 3, filesProcessed should be 1

      const freshFile: FileNode = {
        path: 'fresh.ts',
        hash: 'fresh123',
        tokens: 100,
        lines: 20,
        size: 300,
        type: 'file',
        filetype: 'typescript',
        entities: [{
          name: 'FreshClass',
          type: SymbolType.CLASS,
          location: { startLine: 1, startColumn: 0, endLine: 10, endColumn: 1, startByte: 0, endByte: 200 },
          members: []
        } as ClassSymbol]
      };

      const cached1: FileNode = {
        path: 'cached1.ts',
        hash: 'cached123',
        tokens: 80,
        lines: 15,
        size: 250,
        type: 'file',
        filetype: 'typescript',
        entities: [{
          name: 'cachedFunc1',
          type: SymbolType.FUNCTION,
          location: { startLine: 1, startColumn: 0, endLine: 5, endColumn: 1, startByte: 0, endByte: 100 },
          parameters: []
        } as FunctionSymbol]
      };

      const cached2: FileNode = {
        path: 'cached2.ts',
        hash: 'cached456',
        tokens: 90,
        lines: 18,
        size: 280,
        type: 'file',
        filetype: 'typescript',
        entities: [{
          name: 'cachedFunc2',
          type: SymbolType.FUNCTION,
          location: { startLine: 1, startColumn: 0, endLine: 6, endColumn: 1, startByte: 0, endByte: 120 },
          parameters: []
        } as FunctionSymbol]
      };

      const result: ScanResult = {
        nodes: [freshFile, cached1, cached2],
        totalTokens: 270,
        totalFiles: 3,
        cacheHits: 2,    // cached1 and cached2
        cacheMisses: 1,  // freshFile
        astStats: {
          filesProcessed: 1,  // Only freshFile was freshly processed
          filesSkipped: 0,
          skippedReasons: new Map()
        }
      };

      const output = formatAsAST(result, mockTreeOptions);

      // Should show 3 symbols across 3 files (not just 1 file from filesProcessed)
      expect(output).toContain('Found 3 symbols across 3 files');
    });
  });
});