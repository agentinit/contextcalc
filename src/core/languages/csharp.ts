import type Parser from 'tree-sitter';
import type { ASTSymbol } from '../../types/index.js';
import type { LanguageConfig } from './index.js';

export const CSharpConfig: LanguageConfig = {
  name: 'C#',
  extensions: ['.cs'],

  loadGrammar: async () => {
    const CSharpLanguage = await import('tree-sitter-c-sharp');
    return CSharpLanguage.default;
  },

  extractSymbols: (_tree: Parser.Tree, _sourceCode: string): ASTSymbol[] => {
    // TODO: Implement C#-specific symbol extraction
    return [];
  }
};
