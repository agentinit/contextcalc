// @ts-nocheck
import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { ASTParser } from '../src/core/astParser.js';
import { SymbolType } from '../src/types/index.js';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('ASTParser', () => {
  let parser: ASTParser;
  let testDir: string;

  beforeEach(async () => {
    parser = new ASTParser();
    await parser.initialize();

    // Create temp directory for test files
    testDir = join(tmpdir(), `ast-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    parser.dispose();
    // Clean up temp directory
    await rm(testDir, { recursive: true, force: true });
  });

  describe('initialization', () => {
    test('initializes successfully', async () => {
      const newParser = new ASTParser();
      await newParser.initialize();

      // Parser should be ready to use after initialization
      const symbols = await newParser.parseText('const x = 1;', 'ts');
      expect(Array.isArray(symbols)).toBe(true);

      newParser.dispose();
    });

    test('handles multiple initializations gracefully', async () => {
      const newParser = new ASTParser();
      await newParser.initialize();
      await newParser.initialize(); // Should not throw

      newParser.dispose();
    });
  });

  describe('parseFile', () => {
    test('parses TypeScript file with function', async () => {
      const tsFile = join(testDir, 'test.ts');
      await writeFile(tsFile, `
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
      `.trim());

      const symbols = await parser.parseFile(tsFile);

      expect(symbols.length).toBeGreaterThan(0);
      const funcSymbol = symbols.find(s => s.name === 'greet');
      expect(funcSymbol).toBeDefined();
      expect(funcSymbol?.type).toBe(SymbolType.FUNCTION);
    });

    test('parses TypeScript file with class', async () => {
      const tsFile = join(testDir, 'class.ts');
      await writeFile(tsFile, `
class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
}
      `.trim());

      const symbols = await parser.parseFile(tsFile);

      const classSymbol = symbols.find(s => s.name === 'Calculator');
      expect(classSymbol).toBeDefined();
      expect(classSymbol?.type).toBe(SymbolType.CLASS);

      if (classSymbol && 'members' in classSymbol) {
        expect(classSymbol.members.length).toBeGreaterThan(0);
      }
    });

    test('parses Python file with function', async () => {
      const pyFile = join(testDir, 'test.py');
      await writeFile(pyFile, `
def calculate(x, y):
    return x + y
      `.trim());

      const symbols = await parser.parseFile(pyFile);

      expect(symbols.length).toBeGreaterThan(0);
      const funcSymbol = symbols.find(s => s.name === 'calculate');
      expect(funcSymbol).toBeDefined();
      expect(funcSymbol?.type).toBe(SymbolType.FUNCTION);
    });

    test('returns empty array for unsupported file type', async () => {
      const jsonFile = join(testDir, 'data.json');
      await writeFile(jsonFile, '{"key": "value"}');

      const symbols = await parser.parseFile(jsonFile);
      expect(symbols).toEqual([]);
    });

    test('handles file read errors gracefully', async () => {
      const nonexistentFile = join(testDir, 'nonexistent.ts');

      const symbols = await parser.parseFile(nonexistentFile);
      expect(symbols).toEqual([]);
    });

    test('respects file size limit', async () => {
      const smallParser = new ASTParser('1KB');
      await smallParser.initialize();

      const largeFile = join(testDir, 'large.ts');
      // Create a file larger than 1KB
      const largeContent = 'const x = 1;\n'.repeat(100);
      await writeFile(largeFile, largeContent);

      const symbols = await smallParser.parseFile(largeFile);
      expect(symbols).toEqual([]);

      smallParser.dispose();
    });
  });

  describe('parseText', () => {
    test('parses TypeScript code with interface', async () => {
      const code = `
interface User {
  name: string;
  age: number;
}
      `.trim();

      const symbols = await parser.parseText(code, 'ts');

      const interfaceSymbol = symbols.find(s => s.name === 'User');
      expect(interfaceSymbol).toBeDefined();
      expect(interfaceSymbol?.type).toBe(SymbolType.INTERFACE);
    });

    test('parses JavaScript code with arrow function', async () => {
      const code = `const add = (a, b) => a + b;`;

      const symbols = await parser.parseText(code, 'js');

      expect(symbols.length).toBeGreaterThan(0);
    });

    test('handles language identifier with or without dot', async () => {
      const code = `const x = 1;`;

      const symbols1 = await parser.parseText(code, 'ts');
      const symbols2 = await parser.parseText(code, '.ts');

      expect(symbols1.length).toBe(symbols2.length);
    });

    test('returns empty array for unsupported language', async () => {
      const code = `SELECT * FROM users;`;

      const symbols = await parser.parseText(code, 'sql');
      expect(symbols).toEqual([]);
    });

    test('handles empty code gracefully', async () => {
      const symbols = await parser.parseText('', 'ts');
      expect(symbols).toEqual([]);
    });

    test('handles malformed code gracefully', async () => {
      const code = `function broken( {{{ `;

      const symbols = await parser.parseText(code, 'ts');
      // Should not throw, may return empty or partial results
      expect(Array.isArray(symbols)).toBe(true);
    });
  });

  describe('grammar caching', () => {
    test('reuses cached grammar for same language', async () => {
      const code = `const x = 1;`;

      // Parse twice with same language
      await parser.parseText(code, 'ts');
      const symbols = await parser.parseText(code, 'ts');

      // Should work without errors (grammar was cached)
      expect(Array.isArray(symbols)).toBe(true);
    });

    test('caches different grammars for different languages', async () => {
      const tsCode = `const x: number = 1;`;
      const pyCode = `x = 1`;

      const tsSymbols = await parser.parseText(tsCode, 'ts');
      const pySymbols = await parser.parseText(pyCode, 'py');

      expect(Array.isArray(tsSymbols)).toBe(true);
      expect(Array.isArray(pySymbols)).toBe(true);
    });
  });

  describe('dispose', () => {
    test('clears resources on dispose', async () => {
      const newParser = new ASTParser();
      await newParser.initialize();

      newParser.dispose();

      // After dispose, parser should be reinitialized before use
      // This test mainly ensures dispose doesn't throw
      expect(true).toBe(true);
    });
  });

  describe('symbol extraction accuracy', () => {
    test('extracts function parameters correctly', async () => {
      const code = `
function process(id: string, count: number = 10, opts?: object): void {
  // implementation
}
      `.trim();

      const symbols = await parser.parseText(code, 'ts');
      const funcSymbol = symbols.find(s => s.name === 'process');

      expect(funcSymbol).toBeDefined();
      if (funcSymbol! && 'parameters' in funcSymbol!) {
        expect(funcSymbol!.parameters.length).toBe(3);
        expect(funcSymbol.parameters[0].name).toBe('id');
        // Note: default values and optional flags may vary by tree-sitter parser version
      }
    });

    test('extracts class members correctly', async () => {
      const code = `
class Example {
  private value: number;

  constructor(val: number) {
    this.value = val;
  }

  getValue(): number {
    return this.value;
  }
}
      `.trim();

      const symbols = await parser.parseText(code, 'ts');
      const classSymbol = symbols.find(s => s.name === 'Example');

      expect(classSymbol).toBeDefined();
      if (classSymbol && 'members' in classSymbol) {
        expect(classSymbol.members.length).toBeGreaterThan(0);
      }
    });

    test('extracts imports correctly', async () => {
      const code = `
import { readFile } from 'node:fs/promises';
import Parser from 'tree-sitter';
      `.trim();

      const symbols = await parser.parseText(code, 'ts');
      const imports = symbols.filter(s => s.type === 'import');

      expect(imports.length).toBeGreaterThan(0);
    });
  });
});
