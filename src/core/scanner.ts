import { join, relative } from 'node:path';
import type { Node, FileNode, FolderNode, AnalysisMode, ScanResult, FileStats } from '../types/index.js';
import { CacheManager } from './cache.js';
import { Tokenizer } from './tokenizer.js';
import { IgnoreManager } from '../utils/ignoreParser.js';
import { shouldIncludeFile, getFileTypeFromExtension } from '../utils/fileDetector.js';
import { hashFile, hashChildren } from './hasher.js';
import { parseFileSize } from '../utils/pathUtils.js';

export class DirectoryScanner {
  private cache: CacheManager;
  private tokenizer: Tokenizer;
  private ignoreManager: IgnoreManager;
  private stats = { cacheHits: 0, cacheMisses: 0 };

  constructor(
    private projectPath: string,
    private mode: AnalysisMode,
    private maxFileSize: number = parseFileSize('10M')
  ) {
    this.cache = new CacheManager(projectPath);
    this.tokenizer = new Tokenizer();
    this.ignoreManager = new IgnoreManager(projectPath);
  }

  async initialize(useGitignore: boolean, useDefaultIgnores: boolean): Promise<void> {
    await Promise.all([
      this.cache.load(),
      this.ignoreManager.initialize(useGitignore, useDefaultIgnores)
    ]);
  }

  async scan(): Promise<ScanResult> {
    try {
      this.stats = { cacheHits: 0, cacheMisses: 0 };
      
      const rootNode = await this.scanDirectory(this.projectPath);
      const nodes = rootNode ? [rootNode] : [];
      
      await this.cache.save();

      return {
        nodes,
        totalTokens: nodes.reduce((sum, node) => sum + node.tokens, 0),
        totalFiles: this.countFiles(nodes),
        cacheHits: this.stats.cacheHits,
        cacheMisses: this.stats.cacheMisses
      };
    } finally {
      this.tokenizer.dispose();
    }
  }

  private async scanDirectory(dirPath: string): Promise<FolderNode | null> {
    try {
      const entries = await this.readDirectory(dirPath);
      if (entries.length === 0) {
        return null;
      }

      const children: Node[] = [];
      const tasks = entries.map(async (entry): Promise<Node | null> => {
        const entryPath = entry.path;
        
        if (this.ignoreManager.shouldIgnore(entryPath)) {
          return null;
        }

        if (entry.isDirectory) {
          return this.scanDirectory(entryPath);
        }

        if (!shouldIncludeFile(entryPath, this.mode)) {
          return null;
        }

        if (entry.size > this.maxFileSize) {
          return null;
        }

        const stats: FileStats = {
          path: entryPath,
          hash: await hashFile(entryPath),
          tokens: 0,
          lines: 0,
          size: entry.size,
          isDirectory: false,
          filetype: getFileTypeFromExtension(entryPath)
        };

        return this.processFile(entryPath, stats);
      });

      const results = await Promise.all(tasks);
      children.push(...results.filter((node): node is Node => node !== null));

      if (children.length === 0) {
        return null;
      }

      const childHashes = children.map(child => child.hash);
      const folderHash = hashChildren(childHashes);

      return {
        path: relative(this.projectPath, dirPath) || '.',
        hash: folderHash,
        tokens: children.reduce((sum, child) => sum + child.tokens, 0),
        size: children.reduce((sum, child) => sum + child.size, 0),
        type: 'folder',
        children
      };
    } catch (error) {
      console.warn(`Warning: Failed to scan directory ${dirPath}:`, error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  private async processFile(filePath: string, stats: FileStats): Promise<FileNode | null> {
    try {
      const relativePath = relative(this.projectPath, filePath);
      const fileHash = stats.hash;
      
      const cachedEntry = this.cache.get(relativePath, fileHash);
      
      let tokens: number;
      let lines: number;
      
      if (cachedEntry) {
        tokens = cachedEntry.tokens;
        lines = cachedEntry.lines;
        this.stats.cacheHits++;
      } else {
        const result = await this.tokenizer.countTokens(filePath);
        tokens = result.tokens;
        lines = result.lines;
        
        this.cache.set(relativePath, {
          hash: fileHash,
          tokens,
          lines
        });
        this.stats.cacheMisses++;
      }

      return {
        path: relativePath,
        hash: fileHash,
        tokens,
        lines,
        size: stats.size,
        type: 'file',
        filetype: getFileTypeFromExtension(filePath)
      };
    } catch (error) {
      console.warn(`Warning: Failed to process file ${filePath}:`, error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  private async readDirectory(dirPath: string): Promise<Array<{path: string, isDirectory: boolean, size: number}>> {
    try {
      const fs = await import('node:fs/promises');
      const dirents = await fs.readdir(dirPath, { withFileTypes: true });
      
      const entries = await Promise.all(
        dirents.map(async (dirent) => {
          const fullPath = join(dirPath, dirent.name);
          let size = 0;
          
          if (!dirent.isDirectory()) {
            try {
              const stat = await fs.stat(fullPath);
              size = stat.size;
            } catch (error) {
              console.warn(`Warning: Cannot stat file ${fullPath}:`, error instanceof Error ? error.message : 'Unknown error');
            }
          }
          
          return {
            path: fullPath,
            isDirectory: dirent.isDirectory(),
            size
          };
        })
      );
      
      return entries;
    } catch (error) {
      console.warn(`Warning: Cannot read directory ${dirPath}:`, error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }


  private countFiles(nodes: Node[]): number {
    return nodes.reduce((count, node) => {
      if (node.type === 'file') {
        return count + 1;
      } else {
        return count + this.countFiles(node.children);
      }
    }, 0);
  }

  static calculatePercentages(nodes: Node[], absoluteMode: boolean = false, projectTotal?: number): Node[] {
    const totalTokens = nodes.reduce((sum, node) => sum + node.tokens, 0);
    const denominatorTokens = absoluteMode && projectTotal ? projectTotal : totalTokens;
    
    return nodes.map(node => {
      const percentage = denominatorTokens > 0 ? (node.tokens / denominatorTokens) * 100 : 0;
      
      if (node.type === 'folder') {
        return {
          ...node,
          percentage,
          children: this.calculatePercentages(node.children, absoluteMode, projectTotal || totalTokens)
        };
      } else {
        return {
          ...node,
          percentage
        };
      }
    });
  }
}