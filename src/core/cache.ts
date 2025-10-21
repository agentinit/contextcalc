import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import type { Cache, CacheEntry } from '../types/index.js';
import { getCacheDir } from '../utils/pathUtils.js';
import { hashPath } from './hasher.js';

const CACHE_VERSION = '1.1';

export class CacheManager {
  private cacheDir: string;
  private cache: Cache | null = null;
  private cacheFilePath: string;

  constructor(private projectPath: string) {
    this.cacheDir = getCacheDir();
    const projectHash = hashPath(this.projectPath);
    this.cacheFilePath = join(this.cacheDir, `${projectHash}.json`);
  }

  async load(): Promise<void> {
    try {
      await mkdir(this.cacheDir, { recursive: true });
      
      const fs = await import('node:fs/promises');
      
      try {
        await fs.access(this.cacheFilePath);
      } catch {
        this.cache = this.createEmptyCache();
        return;
      }

      const content = JSON.parse(await fs.readFile(this.cacheFilePath, 'utf8')) as Cache;
      
      if (content.version !== CACHE_VERSION || content.projectPath !== this.projectPath) {
        this.cache = this.createEmptyCache();
        return;
      }

      this.cache = content;
    } catch (error) {
      console.warn('Failed to load cache, starting fresh:', error instanceof Error ? error.message : 'Unknown error');
      this.cache = this.createEmptyCache();
    }
  }

  async save(): Promise<void> {
    if (!this.cache) {
      return;
    }

    try {
      await mkdir(this.cacheDir, { recursive: true });
      const fs = await import('node:fs/promises');
      await fs.writeFile(this.cacheFilePath, JSON.stringify(this.cache, null, 2), 'utf8');
    } catch (error) {
      console.warn('Failed to save cache:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  get(relativePath: string, contentHash: string): CacheEntry | null {
    if (!this.cache) {
      return null;
    }

    const entry = this.cache.files[relativePath];
    if (!entry || entry.hash !== contentHash) {
      return null;
    }

    return entry;
  }

  set(relativePath: string, entry: CacheEntry): void {
    if (!this.cache) {
      this.cache = this.createEmptyCache();
    }

    this.cache.files[relativePath] = entry;
  }

  remove(relativePath: string): void {
    if (!this.cache) {
      return;
    }

    delete this.cache.files[relativePath];
  }

  clear(): void {
    this.cache = this.createEmptyCache();
  }

  getStats(): { totalEntries: number; hitRate?: number } {
    if (!this.cache) {
      return { totalEntries: 0 };
    }

    return {
      totalEntries: Object.keys(this.cache.files).length
    };
  }

  private createEmptyCache(): Cache {
    return {
      version: CACHE_VERSION,
      projectPath: this.projectPath,
      files: {}
    };
  }
}