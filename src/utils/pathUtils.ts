import { resolve, join, relative, dirname } from 'node:path';
import { homedir } from 'node:os';

export function getCacheDir(): string {
  const platform = process.platform;
  
  if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local');
    return join(localAppData, 'contextcalc', 'Cache');
  }
  
  const xdgCache = process.env.XDG_CACHE_HOME || join(homedir(), '.cache');
  return join(xdgCache, 'contextcalc');
}

export function resolveProjectPath(inputPath: string): string {
  return resolve(inputPath);
}

export function getRelativePath(from: string, to: string): string {
  return relative(from, to);
}

export function normalizePathSeparators(path: string): string {
  return path.replace(/\\/g, '/');
}

export function parseFileSize(sizeStr: string): number {
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*([KMGT]?)B?$/i);
  if (!match) {
    throw new Error(`Invalid size format: ${sizeStr}. Use format like '10M', '500k', '1G'`);
  }
  
  const value = parseFloat(match[1]!);
  const unit = match[2]?.toUpperCase() || '';
  
  const multipliers: Record<string, number> = {
    '': 1,
    'K': 1024,
    'M': 1024 * 1024,
    'G': 1024 * 1024 * 1024,
    'T': 1024 * 1024 * 1024 * 1024
  };
  
  const multiplier = multipliers[unit];
  if (multiplier === undefined) {
    throw new Error(`Unknown size unit: ${unit}`);
  }
  
  return Math.floor(value * multiplier);
}