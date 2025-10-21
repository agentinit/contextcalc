import type Parser from 'tree-sitter';
import type { ASTSymbol } from '../../types/index.js';
import type { LanguageConfig } from './index.js';

export const GoConfig: LanguageConfig = {
  name: 'Go',
  extensions: ['.go'],

  loadGrammar: async () => {
    const GoLanguage = await import('tree-sitter-go');
    return GoLanguage.default;
  },

  extractSymbols: (_tree: Parser.Tree, _sourceCode: string): ASTSymbol[] => {
    // TODO: Implement Go-specific symbol extraction
    return [];
  }
};
