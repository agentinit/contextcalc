import { createHash } from 'node:crypto';

export function hashContent(content: string): string {
  return createHash('md5').update(content, 'utf8').digest('hex');
}

export function hashPath(absolutePath: string): string {
  return createHash('md5').update(absolutePath, 'utf8').digest('hex');
}

export async function hashFile(filePath: string): Promise<string> {
  try {
    const fs = await import('node:fs/promises');
    const content = await fs.readFile(filePath, 'utf8');
    return hashContent(content);
  } catch (error) {
    throw new Error(`Failed to hash file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function hashChildren(childrenHashes: string[]): string {
  const combined = childrenHashes.sort().join('');
  return hashContent(combined);
}