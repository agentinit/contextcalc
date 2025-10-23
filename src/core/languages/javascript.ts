import type Parser from 'tree-sitter';
import type { ASTSymbol } from '../../types/index.js';
import type { LanguageConfig } from './index.js';
import { TypeScriptConfig } from './typescript.js';

export const JavaScriptConfig: LanguageConfig = {
  name: 'JavaScript',
  extensions: ['.js', '.jsx', '.mjs', '.cjs'],

  loadGrammar: async () => {
    const JSLanguage = await import('tree-sitter-javascript');
    return JSLanguage.default;
  },

  extractSymbols: (tree: Parser.Tree, sourceCode: string): ASTSymbol[] => {
    // Reuse TypeScript extractor since JavaScript is a subset
    return TypeScriptConfig.extractSymbols(tree, sourceCode);
  }
};
