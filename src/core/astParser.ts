import Parser from 'tree-sitter';
import { readFile, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import type { ASTSymbol, ASTOptions } from '../types/index.js';
import { initializeLanguages, getLanguageByExtension } from './languages/index.js';
import { parseFileSize } from '../utils/pathUtils.js';

/**
 * AST Parser using tree-sitter for extracting code symbols from source files.
 * Supports multiple programming languages with lazy-loaded grammars and caching.
 */
export class ASTParser {
  private parser: Parser | null = null;
  private initialized = false;
  private grammarCache: Map<string, unknown> = new Map();
  private maxFileSize: number;

  /**
   * Creates a new AST Parser instance.
   * @param maxFileSize - Maximum file size to parse (default: 10MB)
   */
  constructor(maxFileSize: string | number = '10M') {
    this.maxFileSize = typeof maxFileSize === 'string' ? parseFileSize(maxFileSize) : maxFileSize;
  }

  /**
   * Initializes the parser and loads language configurations.
   * Must be called before parsing any files.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.parser = new Parser();
    await initializeLanguages();
    this.initialized = true;
  }

  /**
   * Parses a source file and extracts AST symbols.
   * @param filePath - Absolute path to the file to parse
   * @param options - Parsing options (currently unused, reserved for future use)
   * @returns Array of extracted symbols, empty array if language unsupported or parsing fails
   */
  async parseFile(filePath: string, options: ASTOptions = {}): Promise<ASTSymbol[]> {
    if (!this.initialized || !this.parser) {
      await this.initialize();
    }

    if (!this.parser) {
      throw new Error('Parser not initialized');
    }

    // Check file size to prevent OOM
    try {
      const fileStats = await stat(filePath);
      if (fileStats.size > this.maxFileSize) {
        // Silently skip files that are too large - this is expected behavior
        return [];
      }
    } catch (error) {
      // File doesn't exist or can't be read - return empty array
      return [];
    }

    // Detect language from file extension
    const ext = extname(filePath);

    // Read file content
    let sourceCode: string;
    try {
      sourceCode = await readFile(filePath, 'utf-8');
    } catch (error) {
      // File can't be read - return empty array
      return [];
    }

    // Parse using extracted helper
    return this.parseSourceCode(sourceCode, ext, filePath, options);
  }

  /**
   * Parses text content and extracts AST symbols.
   * @param text - Source code text to parse
   * @param language - Language identifier (file extension with or without dot, e.g., 'ts' or '.ts')
   * @param options - Parsing options (currently unused, reserved for future use)
   * @returns Array of extracted symbols, empty array if language unsupported or parsing fails
   */
  async parseText(text: string, language: string, options: ASTOptions = {}): Promise<ASTSymbol[]> {
    if (!this.initialized || !this.parser) {
      await this.initialize();
    }

    if (!this.parser) {
      throw new Error('Parser not initialized');
    }

    // Normalize language to extension format
    const ext = language.startsWith('.') ? language : `.${language}`;

    // Parse using extracted helper
    return this.parseSourceCode(text, ext, 'text input', options);
  }

  /**
   * Internal helper method to parse source code with a given language.
   * Handles grammar loading, caching, and symbol extraction.
   * @private
   */
  private async parseSourceCode(
    sourceCode: string,
    ext: string,
    sourceName: string,
    _options: ASTOptions
  ): Promise<ASTSymbol[]> {
    if (!this.parser) {
      throw new Error('Parser not initialized');
    }

    // Get language config
    const languageConfig = getLanguageByExtension(ext);
    if (!languageConfig) {
      // Silently return empty array for unsupported extensions (e.g., .json, .md)
      return [];
    }

    // Load grammar (with caching)
    let grammar = this.grammarCache.get(ext);
    if (!grammar) {
      try {
        grammar = await languageConfig.loadGrammar();
        this.grammarCache.set(ext, grammar);
      } catch (error) {
        // Failed to load grammar - return empty array
        return [];
      }
    }

    // Set language
    try {
      this.parser.setLanguage(grammar);
    } catch (error) {
      // Failed to set language - return empty array
      return [];
    }

    // Parse source code
    let tree: Parser.Tree;
    try {
      tree = this.parser.parse(sourceCode);
    } catch (error) {
      // Failed to parse - return empty array
      return [];
    }

    // Extract symbols
    try {
      const symbols = languageConfig.extractSymbols(tree, sourceCode);
      return symbols;
    } catch (error) {
      // Failed to extract symbols - return empty array
      return [];
    }
  }

  /**
   * Cleans up parser resources and clears caches.
   * Call this when done parsing to free memory.
   */
  dispose(): void {
    // Parser doesn't need explicit cleanup in JavaScript/TypeScript
    this.parser = null;
    this.grammarCache.clear();
    this.initialized = false;
  }
}
