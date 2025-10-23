import { test, expect, describe } from 'bun:test';
import { JavaScriptConfig } from '../../src/core/languages/javascript.js';
import Parser from 'tree-sitter';
import { SymbolType } from '../../src/types/index.js';

describe('JavaScript Language Config', () => {
  let parser: Parser;
  let grammar: any;

  // Initialize parser before tests
  const initParser = async () => {
    if (!parser) {
      parser = new Parser();
      grammar = await JavaScriptConfig.loadGrammar();
      parser.setLanguage(grammar);
    }
  };

  describe('loadGrammar', () => {
    test('loads grammar successfully', async () => {
      const grammar = await JavaScriptConfig.loadGrammar();
      expect(grammar).toBeDefined();
      expect(grammar).not.toBeNull();
    });

    test('loaded grammar can be used with Parser', async () => {
      await initParser();
      expect(parser).toBeDefined();
      
      // Test that we can parse a simple JavaScript file
      const code = 'const x = 1;';
      const tree = parser.parse(code);
      expect(tree).toBeDefined();
      expect(tree.rootNode).toBeDefined();
    });

    test('handles both ESM and CJS module formats', async () => {
      // This test verifies the fallback logic: JSLanguage.default || JSLanguage
      const grammar = await JavaScriptConfig.loadGrammar();
      expect(grammar).toBeDefined();
      
      // Verify it's a valid tree-sitter grammar by checking for expected properties
      expect(typeof grammar).toBe('object');
    });
  });

  describe('function extraction', () => {
    test('extracts simple function', async () => {
      await initParser();
      const code = `function greet(name) {
  return "Hello, " + name;
}`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

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

    test('extracts arrow function', async () => {
      await initParser();
      const code = `const add = (a, b) => a + b;`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      const func = symbols.find(s => s.name === 'add');
      expect(func).toBeDefined();
      expect(func?.type).toBe(SymbolType.FUNCTION);
    });

    test('extracts async function', async () => {
      await initParser();
      const code = `async function fetchData() {
  return "data";
}`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      const func = symbols.find(s => s.name === 'fetchData');
      expect(func).toBeDefined();
      expect(func?.type).toBe(SymbolType.FUNCTION);
      
      if (func && 'async' in func) {
        expect(func.async).toBe(true);
      }
    });

    test('extracts function with default parameters', async () => {
      await initParser();
      const code = `function process(id, count = 10) {
  return id + count;
}`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      const func = symbols.find(s => s.name === 'process');
      expect(func).toBeDefined();

      if (func && 'parameters' in func) {
        expect(func.parameters.length).toBe(2);
      }
    });

    test('extracts generator function', async () => {
      await initParser();
      const code = `function* generateNumbers() {
  yield 1;
  yield 2;
}`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      const func = symbols.find(s => s.name === 'generateNumbers');
      expect(func).toBeDefined();
      
      if (func && 'generator' in func) {
        expect(func.generator).toBe(true);
      }
    });
  });

  describe('class extraction', () => {
    test('extracts simple class', async () => {
      await initParser();
      const code = `class Calculator {
  add(a, b) {
    return a + b;
  }
}`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      const cls = symbols.find(s => s.name === 'Calculator');
      expect(cls).toBeDefined();
      expect(cls?.type).toBe(SymbolType.CLASS);

      if (cls && 'members' in cls) {
        expect(cls.members.length).toBeGreaterThan(0);
        const method = cls.members[0];
        if (method) {
          expect(method.name).toBe('add');
        }
      }
    });

    test('extracts class with constructor', async () => {
      await initParser();
      const code = `class User {
  constructor(name) {
    this.name = name;
  }
  
  greet() {
    return "Hello, " + this.name;
  }
}`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      const cls = symbols.find(s => s.name === 'User');
      expect(cls).toBeDefined();

      if (cls && 'members' in cls) {
        expect(cls.members.length).toBe(2);
        expect(cls.members.some(m => m.name === 'constructor')).toBe(true);
        expect(cls.members.some(m => m.name === 'greet')).toBe(true);
      }
    });

    test('extracts class with extends', async () => {
      await initParser();
      const code = `class Child extends Parent {
  method() {}
}`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      const cls = symbols.find(s => s.name === 'Child');
      expect(cls).toBeDefined();

      if (cls && 'extends' in cls) {
        expect(cls.extends).toBeDefined();
        expect(cls.extends).toContain('Parent');
      }
    });

    test('extracts class properties', async () => {
      await initParser();
      const code = `class Config {
  apiUrl = "https://api.example.com";
  timeout = 5000;
}`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      const cls = symbols.find(s => s.name === 'Config');
      expect(cls).toBeDefined();

      if (cls && 'members' in cls) {
        expect(cls.members.length).toBe(2);
      }
    });
  });

  describe('import/export extraction', () => {
    test('extracts named imports', async () => {
      await initParser();
      const code = `import { readFile, writeFile } from 'fs/promises';`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      const importSym = symbols.find(s => s.type === SymbolType.IMPORT);
      expect(importSym).toBeDefined();

      if (importSym && 'imports' in importSym) {
        expect(importSym.imports.length).toBe(2);
        expect(importSym.imports).toContain('readFile');
        expect(importSym.imports).toContain('writeFile');
      }
    });

    test('extracts default import', async () => {
      await initParser();
      const code = `import React from 'react';`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      const importSym = symbols.find(s => s.type === SymbolType.IMPORT);
      expect(importSym).toBeDefined();

      if (importSym && 'default' in importSym) {
        expect(importSym.default).toBe('React');
      }
    });

    test('extracts namespace import', async () => {
      await initParser();
      const code = `import * as fs from 'fs';`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      const importSym = symbols.find(s => s.type === SymbolType.IMPORT);
      expect(importSym).toBeDefined();

      if (importSym && 'namespace' in importSym) {
        expect(importSym.namespace).toBe('fs');
      }
    });

    test('extracts named exports', async () => {
      await initParser();
      const code = `export { foo, bar };`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      const exportSym = symbols.find(s => s.type === SymbolType.EXPORT);
      expect(exportSym).toBeDefined();

      if (exportSym && 'exports' in exportSym) {
        expect(exportSym.exports.length).toBeGreaterThan(0);
      }
    });

    test('extracts exported function', async () => {
      await initParser();
      const code = `export function helper() {
  return true;
}`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      const func = symbols.find(s => s.name === 'helper');
      expect(func).toBeDefined();
      expect(func?.type).toBe(SymbolType.FUNCTION);
    });

    test('extracts exported class', async () => {
      await initParser();
      const code = `export class Service {
  execute() {}
}`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      const cls = symbols.find(s => s.name === 'Service');
      expect(cls).toBeDefined();
      expect(cls?.type).toBe(SymbolType.CLASS);
    });
  });

  describe('variable extraction', () => {
    test('extracts const declaration', async () => {
      await initParser();
      const code = `const API_KEY = "secret";`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      const variable = symbols.find(s => s.name === 'API_KEY');
      expect(variable).toBeDefined();
      expect(variable?.type).toBe(SymbolType.CONSTANT);
    });

    test('extracts let declaration', async () => {
      await initParser();
      const code = `let counter = 0;`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      const variable = symbols.find(s => s.name === 'counter');
      expect(variable).toBeDefined();
      expect(variable?.type).toBe(SymbolType.VARIABLE);
    });

    test('extracts var declaration', async () => {
      await initParser();
      const code = `var oldStyle = "legacy";`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      const variable = symbols.find(s => s.name === 'oldStyle');
      expect(variable).toBeDefined();
    });
  });

  describe('top-level only extraction', () => {
    test('extracts only top-level declarations', async () => {
      await initParser();
      const code = `
function outer() {
  function inner() {
    return 1;
  }
  return inner();
}

const topLevel = 1;
`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      // Should extract 'outer' and 'topLevel', but not 'inner'
      expect(symbols.some(s => s.name === 'outer')).toBe(true);
      expect(symbols.some(s => s.name === 'topLevel')).toBe(true);
      expect(symbols.some(s => s.name === 'inner')).toBe(false);
    });

    test('extracts class methods but not nested functions', async () => {
      await initParser();
      const code = `
class MyClass {
  method() {
    function helper() {
      return 1;
    }
    return helper();
  }
}
`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      const cls = symbols.find(s => s.name === 'MyClass');
      expect(cls).toBeDefined();

      if (cls && 'members' in cls) {
        // Should extract 'method' but not 'helper'
        expect(cls.members.some(m => m.name === 'method')).toBe(true);
        expect(cls.members.some(m => m.name === 'helper')).toBe(false);
      }
    });
  });

  describe('JSX support', () => {
    test('extracts function component', async () => {
      await initParser();
      const code = `function Button(props) {
  return <button>{props.text}</button>;
}`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      const func = symbols.find(s => s.name === 'Button');
      expect(func).toBeDefined();
      expect(func?.type).toBe(SymbolType.FUNCTION);
    });

    test('extracts arrow function component', async () => {
      await initParser();
      const code = `const Card = ({ title }) => {
  return <div>{title}</div>;
};`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      const func = symbols.find(s => s.name === 'Card');
      expect(func).toBeDefined();
    });
  });

  describe('location information', () => {
    test('includes accurate location data', async () => {
      await initParser();
      const code = `function test() {
  return 1;
}`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      const func = symbols[0];
      expect(func).toBeDefined();
      if (func) {
        expect(func.location).toBeDefined();
        expect(func.location.startLine).toBe(1);
        expect(func.location.endLine).toBeGreaterThan(1);
      }
    });

    test('location spans multiple lines for complex functions', async () => {
      await initParser();
      const code = `function complex() {
  const x = 1;
  const y = 2;
  return x + y;
}`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      const func = symbols[0];
      if (func) {
        expect(func.location.endLine).toBe(5);
      }
    });
  });

  describe('edge cases', () => {
    test('handles empty file', async () => {
      await initParser();
      const code = '';

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      expect(symbols).toBeDefined();
      expect(symbols.length).toBe(0);
    });

    test('handles comments only', async () => {
      await initParser();
      const code = `// This is a comment
/* Another comment */`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      expect(symbols.length).toBe(0);
    });

    test('handles multiple declarations', async () => {
      await initParser();
      const code = `
const a = 1;
const b = 2;
function foo() {}
class Bar {}
`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      expect(symbols.length).toBe(4);
      expect(symbols.some(s => s.name === 'a')).toBe(true);
      expect(symbols.some(s => s.name === 'b')).toBe(true);
      expect(symbols.some(s => s.name === 'foo')).toBe(true);
      expect(symbols.some(s => s.name === 'Bar')).toBe(true);
    });

    test('handles destructuring in parameters', async () => {
      await initParser();
      const code = `function process({ id, name }) {
  return { id, name };
}`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      const func = symbols.find(s => s.name === 'process');
      expect(func).toBeDefined();
      expect(func?.type).toBe(SymbolType.FUNCTION);
    });

    test('handles rest parameters', async () => {
      await initParser();
      const code = `function sum(...numbers) {
  return numbers.reduce((a, b) => a + b, 0);
}`;

      const tree = parser.parse(code);
      const symbols = JavaScriptConfig.extractSymbols(tree, code);

      const func = symbols.find(s => s.name === 'sum');
      expect(func).toBeDefined();
    });
  });

  describe('configuration', () => {
    test('has correct name', () => {
      expect(JavaScriptConfig.name).toBe('JavaScript');
    });

    test('has correct extensions', () => {
      expect(JavaScriptConfig.extensions).toContain('.js');
      expect(JavaScriptConfig.extensions).toContain('.jsx');
      expect(JavaScriptConfig.extensions).toContain('.mjs');
      expect(JavaScriptConfig.extensions).toContain('.cjs');
    });

    test('has loadGrammar function', () => {
      expect(JavaScriptConfig.loadGrammar).toBeDefined();
      expect(typeof JavaScriptConfig.loadGrammar).toBe('function');
    });

    test('has extractSymbols function', () => {
      expect(JavaScriptConfig.extractSymbols).toBeDefined();
      expect(typeof JavaScriptConfig.extractSymbols).toBe('function');
    });
  });
});