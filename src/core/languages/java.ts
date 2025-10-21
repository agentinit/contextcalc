import type Parser from 'tree-sitter';
import type { ASTSymbol } from '../../types/index.js';
import type { LanguageConfig } from './index.js';

export const JavaConfig: LanguageConfig = {
  name: 'Java',
  extensions: ['.java'],

  loadGrammar: async () => {
    const JavaLanguage = await import('tree-sitter-java');
    return JavaLanguage.default;
  },

  extractSymbols: (_tree: Parser.Tree, _sourceCode: string): ASTSymbol[] => {
    // TODO: Implement Java-specific symbol extraction
    return [];
  }
};
