import ignore from 'ignore';
import { join, relative, resolve } from 'node:path';
import { normalizePathSeparators } from './pathUtils.js';

const DEFAULT_IGNORES = [
  // Python
  '*.pyc',
  '__pycache__',
  '.pytest_cache',
  '.coverage',
  '.tox',
  '.mypy_cache',
  '.ruff_cache',
  'poetry.lock',
  'Pipfile.lock',
  '.Python',
  'pip-wheel-metadata',
  'wheels',
  
  // JavaScript/Node
  'node_modules',
  'bower_components',
  'package-lock.json',
  'yarn.lock',
  '.npm',
  '.pnpm-store',
  'bun.lockb',
  '.next',
  '.nuxt',
  
  // Java / Rust
  'target/',
  '*.class',
  '*.jar',
  
  // Go / .NET / C#
  'bin/',
  'pkg/',
  'obj/',
  
  // Version control
  '.git',
  '.svn',
  '.hg',
  '.gitignore',
  '.gitattributes',
  '.gitmodules',
  
  // Virtual environments
  'venv',
  '.venv',
  'env',
  '.env',
  
  // IDEs and editors
  '.idea',
  '.vscode',
  '*.swo',
  '*.swp',
  '*~',
  
  // Build directories and artifacts
  'build',
  'dist',
  'out',
  '*.egg-info',
  '*.egg',
  '*.whl',
  
  // OS generated files
  '.DS_Store',
  'Thumbs.db',
  'desktop.ini',
  '.directory',
  
  // Logs and cache
  '*.log',
  '.cache',
  '.eslintcache',
  '.tmp',
  '.temp',
  '.nyc_output',
  '.sass-cache',
  
  // Common Binary/Media files
  '*.png',
  '*.jpg',
  '*.jpeg',
  '*.gif',
  '*.svg',
  '*.ico',
  '*.pdf',
  '*.mp4',
  '*.mov',
  '*.db',
  '*.sqlite',
  
  // Minified files
  '*.min.js',
  '*.min.css'
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