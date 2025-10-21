import type Parser from 'tree-sitter';
import type { Symbol } from '../../types/index.js';
import type { LanguageConfig } from './index.js';

export const GoConfig: LanguageConfig = {
  name: 'Go',
  extensions: ['.go'],

  loadGrammar: async () => {
    const GoLanguage = await import('tree-sitter-go');
    return GoLanguage.default;
  },

  extractSymbols: (tree: Parser.Tree, sourceCode: string): Symbol[] => {
    // TODO: Implement Go-specific symbol extraction
    return [];
  }
};
