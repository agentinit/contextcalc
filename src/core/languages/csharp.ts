import type Parser from 'tree-sitter';
import type { Symbol } from '../../types/index.js';
import type { LanguageConfig } from './index.js';

export const CSharpConfig: LanguageConfig = {
  name: 'C#',
  extensions: ['.cs'],

  loadGrammar: async () => {
    const CSharpLanguage = await import('tree-sitter-c-sharp');
    return CSharpLanguage.default;
  },

  extractSymbols: (tree: Parser.Tree, sourceCode: string): Symbol[] => {
    // TODO: Implement C#-specific symbol extraction
    return [];
  }
};
