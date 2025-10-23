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
  private debug: boolean;
  private stats = {
    filesProcessed: 0,
    filesSkipped: 0,
    skippedReasons: new Map<string, number>()
  };

  /**
   * Creates a new AST Parser instance.
   * @param maxFileSize - Maximum file size to parse (default: 10MB)
   * @param debug - Enable debug logging (default: false)
   */
  constructor(maxFileSize: string | number = '10M', debug: boolean = false) {
    this.maxFileSize = typeof maxFileSize === 'string' ? parseFileSize(maxFileSize) : maxFileSize;
    this.debug = debug;
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
        if (this.debug) {
          console.error(`[AST Debug] Skipping ${filePath}: file size ${fileStats.size} exceeds max size ${this.maxFileSize}`);
        }
        this.recordSkip('file too large');
        return [];
      }
    } catch (error) {
      if (this.debug) {
        console.error(`[AST Debug] Cannot read file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      this.recordSkip('file read error');
      return [];
    }

    // Detect language from file extension
    const ext = extname(filePath);

    // Read file content
    let sourceCode: string;
    try {
      sourceCode = await readFile(filePath, 'utf-8');
    } catch (error) {
      if (this.debug) {
        console.error(`[AST Debug] Failed to read ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      this.recordSkip('file read error');
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
      if (this.debug) {
        console.error(`[AST Debug] Unsupported language for ${sourceName}: extension ${ext}`);
      }
      this.recordSkip(`unsupported: ${ext}`);
      return [];
    }

    // Load grammar (with caching)
    let grammar = this.grammarCache.get(ext);
    if (!grammar) {
      try {
        if (this.debug) {
          console.error(`[AST Debug] Loading grammar for ${languageConfig.name} (${ext})`);
        }
        grammar = await languageConfig.loadGrammar();
        this.grammarCache.set(ext, grammar);
      } catch (error) {
        if (this.debug) {
          console.error(`[AST Debug] Failed to load grammar for ${ext}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        return [];
      }
    }

    // Set language
    try {
      this.parser.setLanguage(grammar);
    } catch (error) {
      if (this.debug) {
        console.error(`[AST Debug] Failed to set language for ${sourceName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      return [];
    }

    // Parse source code
    let tree: Parser.Tree;
    try {
      tree = this.parser.parse(sourceCode);
    } catch (error) {
      if (this.debug) {
        console.error(`[AST Debug] Failed to parse ${sourceName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      return [];
    }

    // Extract symbols
    try {
      const symbols = languageConfig.extractSymbols(tree, sourceCode);
      if (this.debug) {
        console.error(`[AST Debug] Extracted ${symbols.length} symbols from ${sourceName}`);
      }
      // Count as processed if we successfully extracted symbols (even if 0 symbols)
      this.stats.filesProcessed++;
      return symbols;
    } catch (error) {
      if (this.debug) {
        console.error(`[AST Debug] Failed to extract symbols from ${sourceName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      this.recordSkip('extraction error');
      return [];
    }
  }

  /**
   * Gets the parsing statistics.
   * @returns Statistics object with files processed, skipped, and reasons
   */
  getStats() {
    return {
      filesProcessed: this.stats.filesProcessed,
      filesSkipped: this.stats.filesSkipped,
      skippedReasons: new Map(this.stats.skippedReasons)
    };
  }

  /**
   * Resets the parsing statistics.
   */
  resetStats(): void {
    this.stats.filesProcessed = 0;
    this.stats.filesSkipped = 0;
    this.stats.skippedReasons.clear();
  }

  /**
   * Records a skip reason in statistics.
   * @private
   */
  private recordSkip(reason: string): void {
    this.stats.filesSkipped++;
    const count = this.stats.skippedReasons.get(reason) || 0;
    this.stats.skippedReasons.set(reason, count + 1);
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
