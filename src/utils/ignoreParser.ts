import ignore from 'ignore';
import { join, relative, resolve } from 'node:path';
import { normalizePathSeparators } from './pathUtils.js';

const DEFAULT_IGNORES = [
  // Version control
  '.git',
  '.svn',
  '.hg',
  
  // Dependencies
  'node_modules',
  'venv',
  'env',
  '__pycache__',
  '.Python',
  'pip-wheel-metadata',
  'wheels',
  
  // Build artifacts
  'dist',
  'build',
  'out',
  'target',
  '.next',
  '.nuxt',
  
  // IDE and editor files
  '.vscode',
  '.idea',
  '*.swp',
  '*.swo',
  '*~',
  '.DS_Store',
  'Thumbs.db',
  
  // Logs and temporary files
  '*.log',
  '.tmp',
  '.temp',
  '.cache',
  
  // OS specific
  'desktop.ini',
  '.directory',
  
  // Common config/cache directories
  '.pytest_cache',
  '.coverage',
  '.nyc_output',
  '.sass-cache'
];

export class IgnoreManager {
  private ig: ReturnType<typeof ignore>;
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = resolve(projectRoot);
    this.ig = ignore();
  }

  async initialize(useGitignore: boolean = true, useDefaultIgnores: boolean = true): Promise<void> {
    if (useDefaultIgnores) {
      this.ig.add(DEFAULT_IGNORES);
    }

    if (useGitignore) {
      await this.loadGitignore();
    }
  }

  private async loadGitignore(): Promise<void> {
    try {
      const gitignorePath = join(this.projectRoot, '.gitignore');
      const fs = await import('node:fs/promises');
      
      try {
        await fs.access(gitignorePath);
      } catch {
        return;
      }
      
      const content = await fs.readFile(gitignorePath, 'utf8');
      const lines = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
      
      if (lines.length > 0) {
        this.ig.add(lines);
      }
    } catch (error) {
      console.warn('Warning: Could not read .gitignore file:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  shouldIgnore(filePath: string): boolean {
    const relativePath = relative(this.projectRoot, resolve(filePath));
    const normalizedPath = normalizePathSeparators(relativePath);
    
    if (normalizedPath.startsWith('../')) {
      return false;
    }
    
    return this.ig.ignores(normalizedPath);
  }

  filter(paths: string[]): string[] {
    return paths.filter(path => !this.shouldIgnore(path));
  }

  getIgnorePatterns(): string[] {
    return DEFAULT_IGNORES.slice();
  }
}