import type Parser from 'tree-sitter';
import type { ASTSymbol } from '../../types/index.js';
import type { LanguageConfig } from './index.js';

export const RubyConfig: LanguageConfig = {
  name: 'Ruby',
  extensions: ['.rb'],

  loadGrammar: async () => {
    const RubyLanguage = await import('tree-sitter-ruby');
    return RubyLanguage.default;
  },

  extractSymbols: (_tree: Parser.Tree, _sourceCode: string): ASTSymbol[] => {
    // TODO: Implement Ruby-specific symbol extraction
    return [];
  }
};
