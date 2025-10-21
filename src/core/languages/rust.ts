import type Parser from 'tree-sitter';
import type { Symbol } from '../../types/index.js';
import type { LanguageConfig } from './index.js';

export const RustConfig: LanguageConfig = {
  name: 'Rust',
  extensions: ['.rs'],

  loadGrammar: async () => {
    const RustLanguage = await import('tree-sitter-rust');
    return RustLanguage.default;
  },

  extractSymbols: (tree: Parser.Tree, sourceCode: string): Symbol[] => {
    // TODO: Implement Rust-specific symbol extraction
    return [];
  }
};
