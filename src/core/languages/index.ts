import type Parser from 'tree-sitter';
import type { ASTSymbol } from '../../types/index.js';

export interface LanguageConfig {
  name: string;
  extensions: string[];
  loadGrammar: () => Promise<unknown>;
  extractSymbols: (tree: Parser.Tree, sourceCode: string) => ASTSymbol[];
}

export interface LanguageRegistry {
  [key: string]: LanguageConfig;
}

// Language registry - lazy load to avoid loading all grammars upfront
const languages: LanguageRegistry = {};

export function registerLanguage(config: LanguageConfig): void {
  for (const ext of config.extensions) {
    languages[ext] = config;
  }
}

export function getLanguageByExtension(extension: string): LanguageConfig | undefined {
  return languages[extension];
}

export function getSupportedExtensions(): string[] {
  return Object.keys(languages);
}

export async function initializeLanguages(): Promise<void> {
  // Dynamically import language configs
  const { TypeScriptConfig, TSXConfig } = await import('./typescript.js');
  const { JavaScriptConfig } = await import('./javascript.js');
  const { PythonConfig } = await import('./python.js');

  // Register all languages
  registerLanguage(TypeScriptConfig);
  registerLanguage(TSXConfig);
  registerLanguage(JavaScriptConfig);
  registerLanguage(PythonConfig);
}
