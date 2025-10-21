import type Parser from 'tree-sitter';
import type { ASTSymbol } from '../../types/index.js';

export interface LanguageConfig {
  name: string;
  extensions: string[];
  loadGrammar: () => Promise<any>;
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
  const { TypeScriptConfig } = await import('./typescript.js');
  const { JavaScriptConfig } = await import('./javascript.js');
  const { PythonConfig } = await import('./python.js');
  const { GoConfig } = await import('./go.js');
  const { RustConfig } = await import('./rust.js');
  const { JavaConfig } = await import('./java.js');
  const { CppConfig } = await import('./cpp.js');
  const { CSharpConfig } = await import('./csharp.js');
  const { RubyConfig } = await import('./ruby.js');
  const { PhpConfig } = await import('./php.js');
  const { SwiftConfig } = await import('./swift.js');

  // Register all languages
  registerLanguage(TypeScriptConfig);
  registerLanguage(JavaScriptConfig);
  registerLanguage(PythonConfig);
  registerLanguage(GoConfig);
  registerLanguage(RustConfig);
  registerLanguage(JavaConfig);
  registerLanguage(CppConfig);
  registerLanguage(CSharpConfig);
  registerLanguage(RubyConfig);
  registerLanguage(PhpConfig);
  registerLanguage(SwiftConfig);
}
