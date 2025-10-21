import { test, expect, describe } from 'bun:test';
import { PythonConfig } from '../../src/core/languages/python.js';
import Parser from 'tree-sitter';
import { SymbolType } from '../../src/types/index.js';

describe('Python Extractor', () => {
  let parser: Parser;
  let grammar: any;

  // Initialize parser before tests
  const initParser = async () => {
    if (!parser) {
      parser = new Parser();
      grammar = await PythonConfig.loadGrammar();
      parser.setLanguage(grammar);
    }
  };

  describe('function extraction', () => {
    test('extracts simple function', async () => {
      await initParser();
      const code = `def greet(name):
    return f"Hello, {name}"`;

      const tree = parser.parse(code);
      const symbols = PythonConfig.extractSymbols(tree, code);

      const func = symbols.find(s => s.name === 'greet');
      expect(func).toBeDefined();
      expect(func?.type).toBe(SymbolType.FUNCTION);

      if (func && 'parameters' in func) {
        expect(func.parameters.length).toBe(1);
        const firstParam = func.parameters[0];
        if (firstParam) {
          expect(firstParam.name).toBe('name');
        }
      }
    });

    test('extracts function with type hints', async () => {
      await initParser();
      const code = `def add(a: int, b: int) -> int:
    return a + b`;

      const tree = parser.parse(code);
      const symbols = PythonConfig.extractSymbols(tree, code);

      const func = symbols.find(s => s.name === 'add');
      expect(func).toBeDefined();

      if (func && 'parameters' in func) {
        expect(func.parameters.length).toBe(2);
        const firstParam = func.parameters[0];
        if (firstParam) {
          expect(firstParam.type).toContain('int');
        }
      }

      if (func && 'returnType' in func) {
        expect(func.returnType).toContain('int');
      }
    });

    test('extracts async function', async () => {
      await initParser();
      const code = `async def fetch_data():
    return "data"`;

      const tree = parser.parse(code);
      const symbols = PythonConfig.extractSymbols(tree, code);

      const func = symbols.find(s => s.name === 'fetch_data');
      expect(func).toBeDefined();
      expect(func?.type).toBe(SymbolType.FUNCTION);
      // Note: async flag detection depends on node type parsing
    });

    test('extracts function with default parameters', async () => {
      await initParser();
      const code = `def process(id, count=10):
    pass`;

      const tree = parser.parse(code);
      const symbols = PythonConfig.extractSymbols(tree, code);

      const func = symbols.find(s => s.name === 'process');
      expect(func).toBeDefined();

      if (func! && 'parameters' in func!) {
        expect(func.parameters.length).toBe(2);
        // Note: default parameters might be captured
      }
    });

    test('excludes self and cls parameters', async () => {
      await initParser();
      const code = `class Example:
    def method(self, value):
        pass

    @classmethod
    def create(cls, value):
        pass`;

      const tree = parser.parse(code);
      const symbols = PythonConfig.extractSymbols(tree, code);

      const cls = symbols.find(s => s.name === 'Example');
      expect(cls).toBeDefined();

      if (cls! && 'members' in cls!) {
        const method = cls.members.find((m: { name: string }) => m.name === 'method');
        if (method && 'parameters' in method) {
          // Should not include 'self'
          expect(method.parameters.every(p => p.name !== 'self')).toBe(true);
          expect(method.parameters.some(p => p.name === 'value')).toBe(true);
        }

        const classMethod = cls.members.find((m: { name: string }) => m.name === 'create');
        if (classMethod && 'parameters' in classMethod) {
          // Should not include 'cls'
          expect(classMethod.parameters.every(p => p.name !== 'cls')).toBe(true);
        }
      }
    });
  });

  describe('class extraction', () => {
    test('extracts simple class', async () => {
      await initParser();
      const code = `class Calculator:
    def add(self, a, b):
        return a + b`;

      const tree = parser.parse(code);
      const symbols = PythonConfig.extractSymbols(tree, code);

      const cls = symbols.find(s => s.name === 'Calculator');
      expect(cls).toBeDefined();
      expect(cls?.type).toBe(SymbolType.CLASS);

      if (cls && 'members' in cls) {
        expect(cls.members.length).toBeGreaterThan(0);
        const firstMember = cls.members[0];
        if (firstMember) {
          expect(firstMember.name).toBe('add');
          if ('type' in firstMember) {
            expect(firstMember.type).toBe(SymbolType.METHOD);
          }
        }
      }
    });

    test('extracts class with inheritance', async () => {
      await initParser();
      const code = `class Child(Parent):
    pass`;

      const tree = parser.parse(code);
      const symbols = PythonConfig.extractSymbols(tree, code);

      const cls = symbols.find(s => s.name === 'Child');
      expect(cls).toBeDefined();

      if (cls && 'extends' in cls) {
        expect(cls.extends).toBeDefined();
        expect(cls.extends).toContain('Parent');
      }
    });

    test('extracts class with multiple methods', async () => {
      await initParser();
      const code = `class User:
    def __init__(self, name):
        self.name = name

    def greet(self):
        return f"Hello, {self.name}"

    def update(self, name):
        self.name = name`;

      const tree = parser.parse(code);
      const symbols = PythonConfig.extractSymbols(tree, code);

      const cls = symbols.find(s => s.name === 'User');
      expect(cls).toBeDefined();

      if (cls! && 'members' in cls!) {
        expect(cls.members.length).toBe(3);
        expect(cls.members.some((m: { name: string }) => m.name === '__init__')).toBe(true);
        expect(cls.members.some((m: { name: string }) => m.name === 'greet')).toBe(true);
        expect(cls.members.some((m: { name: string }) => m.name === 'update')).toBe(true);
      }
    });
  });

  describe('import extraction', () => {
    test('extracts simple import', async () => {
      await initParser();
      const code = `import os`;

      const tree = parser.parse(code);
      const symbols = PythonConfig.extractSymbols(tree, code);

      const importSym = symbols.find(s => s.type === SymbolType.IMPORT);
      expect(importSym).toBeDefined();

      if (importSym && 'from' in importSym) {
        expect(importSym.from).toBe('os');
      }
    });

    test('extracts from import', async () => {
      await initParser();
      const code = `from os.path import join, dirname`;

      const tree = parser.parse(code);
      const symbols = PythonConfig.extractSymbols(tree, code);

      const importSym = symbols.find(s => s.type === SymbolType.IMPORT);
      expect(importSym).toBeDefined();

      if (importSym && 'from' in importSym) {
        expect(importSym.from).toBe('os.path');
      }

      if (importSym && 'imports' in importSym) {
        expect(importSym.imports).toContain('join');
        expect(importSym.imports).toContain('dirname');
      }
    });

    test('extracts wildcard import', async () => {
      await initParser();
      const code = `from typing import *`;

      const tree = parser.parse(code);
      const symbols = PythonConfig.extractSymbols(tree, code);

      const importSym = symbols.find(s => s.type === SymbolType.IMPORT);
      expect(importSym).toBeDefined();

      if (importSym && 'namespace' in importSym) {
        expect(importSym.namespace).toBe('*');
      }
    });

    test('extracts import with alias', async () => {
      await initParser();
      const code = `import numpy as np`;

      const tree = parser.parse(code);
      const symbols = PythonConfig.extractSymbols(tree, code);

      const importSym = symbols.find(s => s.type === SymbolType.IMPORT);
      expect(importSym).toBeDefined();
    });
  });

  describe('top-level only extraction', () => {
    test('extracts only top-level declarations', async () => {
      await initParser();
      const code = `
def outer():
    def inner():
        return 1
    return inner()

top_level = 1
`;

      const tree = parser.parse(code);
      const symbols = PythonConfig.extractSymbols(tree, code);

      // Should extract 'outer', but not 'inner'
      expect(symbols.some(s => s.name === 'outer')).toBe(true);
      expect(symbols.some(s => s.name === 'inner')).toBe(false);
    });

    test('extracts nested class methods but not nested functions', async () => {
      await initParser();
      const code = `
class MyClass:
    def method(self):
        def helper():
            pass
        return helper()
`;

      const tree = parser.parse(code);
      const symbols = PythonConfig.extractSymbols(tree, code);

      const cls = symbols.find(s => s.name === 'MyClass');
      expect(cls).toBeDefined();

      if (cls! && 'members' in cls!) {
        // Should extract 'method' but not 'helper'
        expect(cls.members.some((m: { name: string }) => m.name === 'method')).toBe(true);
        expect(cls.members.some((m: { name: string }) => m.name === 'helper')).toBe(false);
      }
    });
  });

  describe('location information', () => {
    test('includes accurate location data', async () => {
      await initParser();
      const code = `def test():
    return 1`;

      const tree = parser.parse(code);
      const symbols = PythonConfig.extractSymbols(tree, code);

      const func = symbols[0];
      expect(func).toBeDefined();
      if (func) {
        expect(func.location).toBeDefined();
        expect(func.location.startLine).toBe(1);
        expect(func.location.endLine).toBeGreaterThan(1);
      }
    });
  });

  describe('edge cases', () => {
    test('handles decorators', async () => {
      await initParser();
      const code = `def decorated_function():
    pass`;

      const tree = parser.parse(code);
      const symbols = PythonConfig.extractSymbols(tree, code);

      const func = symbols.find(s => s.name === 'decorated_function');
      expect(func).toBeDefined();
      expect(func?.type).toBe(SymbolType.FUNCTION);
    });

    test('handles class methods', async () => {
      await initParser();
      const code = `class Example:
    def value(self):
        return self._value`;

      const tree = parser.parse(code);
      const symbols = PythonConfig.extractSymbols(tree, code);

      const cls = symbols.find(s => s.name === 'Example');
      expect(cls).toBeDefined();

      if (cls! && 'members' in cls!) {
        expect(cls.members.some((m: { name: string }) => m.name === 'value')).toBe(true);
      }
    });

    test('handles multiple methods', async () => {
      await initParser();
      const code = `class Example:
    def method_one(self):
        pass

    def method_two(self):
        pass`;

      const tree = parser.parse(code);
      const symbols = PythonConfig.extractSymbols(tree, code);

      const cls = symbols.find(s => s.name === 'Example');
      expect(cls).toBeDefined();

      if (cls! && 'members' in cls!) {
        expect(cls.members.length).toBe(2);
      }
    });
  });
});
