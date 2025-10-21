import type Parser from 'tree-sitter';
import type { ASTSymbol } from '../../types/index.js';
import type { LanguageConfig } from './index.js';

export const PhpConfig: LanguageConfig = {
  name: 'PHP',
  extensions: ['.php'],

  loadGrammar: async () => {
    const PhpLanguage = await import('tree-sitter-php');
    return PhpLanguage.php;
  },

  extractSymbols: (_tree: Parser.Tree, _sourceCode: string): ASTSymbol[] => {
    // TODO: Implement PHP-specific symbol extraction
    return [];
  }
};
