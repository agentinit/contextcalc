import type Parser from 'tree-sitter';
import type { Symbol } from '../../types/index.js';
import type { LanguageConfig } from './index.js';

export const JavaScriptConfig: LanguageConfig = {
  name: 'JavaScript',
  extensions: ['.js', '.jsx', '.mjs', '.cjs'],

  loadGrammar: async () => {
    const JSLanguage = await import('tree-sitter-javascript');
    return JSLanguage.default;
  },

  extractSymbols: (tree: Parser.Tree, sourceCode: string): Symbol[] => {
    // Reuse TypeScript extractor since JavaScript is a subset
    // We'll import the TypeScript config and use its extractor
    const { TypeScriptConfig } = require('./typescript.js');
    return TypeScriptConfig.extractSymbols(tree, sourceCode);
  }
};
