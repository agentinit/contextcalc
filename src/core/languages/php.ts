import type Parser from 'tree-sitter';
import type { Symbol } from '../../types/index.js';
import type { LanguageConfig } from './index.js';

export const PhpConfig: LanguageConfig = {
  name: 'PHP',
  extensions: ['.php'],

  loadGrammar: async () => {
    const PhpLanguage = await import('tree-sitter-php');
    return PhpLanguage.php;
  },

  extractSymbols: (tree: Parser.Tree, sourceCode: string): Symbol[] => {
    // TODO: Implement PHP-specific symbol extraction
    return [];
  }
};
