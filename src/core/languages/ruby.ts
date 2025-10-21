import type Parser from 'tree-sitter';
import type { Symbol } from '../../types/index.js';
import type { LanguageConfig } from './index.js';

export const RubyConfig: LanguageConfig = {
  name: 'Ruby',
  extensions: ['.rb'],

  loadGrammar: async () => {
    const RubyLanguage = await import('tree-sitter-ruby');
    return RubyLanguage.default;
  },

  extractSymbols: (tree: Parser.Tree, sourceCode: string): Symbol[] => {
    // TODO: Implement Ruby-specific symbol extraction
    return [];
  }
};
