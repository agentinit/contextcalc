import Parser from 'tree-sitter';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import type { Symbol, ASTOptions } from '../types/index.js';
import { initializeLanguages, getLanguageByExtension } from './languages/index.js';

export class ASTParser {
  private parser: Parser | null = null;
  private initialized = false;
  private grammarCache: Map<string, any> = new Map();

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.parser = new Parser();
    await initializeLanguages();
    this.initialized = true;
  }

  async parseFile(filePath: string, options: ASTOptions = {}): Promise<Symbol[]> {
    if (!this.initialized || !this.parser) {
      await this.initialize();
    }

    if (!this.parser) {
      throw new Error('Parser not initialized');
    }

    // Detect language from file extension
    const ext = extname(filePath);
    const languageConfig = getLanguageByExtension(ext);

    if (!languageConfig) {
      // Language not supported, return empty array
      return [];
    }

    // Load grammar (with caching)
    let grammar = this.grammarCache.get(ext);
    if (!grammar) {
      try {
        grammar = await languageConfig.loadGrammar();
        this.grammarCache.set(ext, grammar);
      } catch (error) {
        console.warn(`Failed to load grammar for ${ext}:`, error instanceof Error ? error.message : 'Unknown error');
        return [];
      }
    }

    // Set language
    try {
      this.parser.setLanguage(grammar);
    } catch (error) {
      console.warn(`Failed to set language for ${ext}:`, error instanceof Error ? error.message : 'Unknown error');
      return [];
    }

    // Read and parse file
    let sourceCode: string;
    try {
      sourceCode = await readFile(filePath, 'utf-8');
    } catch (error) {
      console.warn(`Failed to read file ${filePath}:`, error instanceof Error ? error.message : 'Unknown error');
      return [];
    }

    let tree: Parser.Tree;
    try {
      tree = this.parser.parse(sourceCode);
    } catch (error) {
      console.warn(`Failed to parse file ${filePath}:`, error instanceof Error ? error.message : 'Unknown error');
      return [];
    }

    // Extract symbols
    try {
      const symbols = languageConfig.extractSymbols(tree, sourceCode);
      return symbols;
    } catch (error) {
      console.warn(`Failed to extract symbols from ${filePath}:`, error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  async parseText(text: string, language: string, options: ASTOptions = {}): Promise<Symbol[]> {
    if (!this.initialized || !this.parser) {
      await this.initialize();
    }

    if (!this.parser) {
      throw new Error('Parser not initialized');
    }

    // Get language config by extension
    const ext = language.startsWith('.') ? language : `.${language}`;
    const languageConfig = getLanguageByExtension(ext);

    if (!languageConfig) {
      return [];
    }

    // Load grammar (with caching)
    let grammar = this.grammarCache.get(ext);
    if (!grammar) {
      try {
        grammar = await languageConfig.loadGrammar();
        this.grammarCache.set(ext, grammar);
      } catch (error) {
        console.warn(`Failed to load grammar for ${ext}:`, error instanceof Error ? error.message : 'Unknown error');
        return [];
      }
    }

    // Set language
    try {
      this.parser.setLanguage(grammar);
    } catch (error) {
      console.warn(`Failed to set language for ${ext}:`, error instanceof Error ? error.message : 'Unknown error');
      return [];
    }

    // Parse text
    let tree: Parser.Tree;
    try {
      tree = this.parser.parse(text);
    } catch (error) {
      console.warn(`Failed to parse text:`, error instanceof Error ? error.message : 'Unknown error');
      return [];
    }

    // Extract symbols
    try {
      const symbols = languageConfig.extractSymbols(tree, text);
      return symbols;
    } catch (error) {
      console.warn(`Failed to extract symbols:`, error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  dispose(): void {
    // Parser doesn't need explicit cleanup in JavaScript/TypeScript
    this.parser = null;
    this.grammarCache.clear();
    this.initialized = false;
  }
}
