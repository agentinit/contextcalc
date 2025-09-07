import { extname } from 'node:path';
import { AnalysisMode } from '../types/index.js';

const CODE_EXTENSIONS = new Set([
  // Web
  '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
  '.html', '.htm', '.css', '.scss', '.sass', '.less',
  '.json', '.jsonc', '.xml', '.yaml', '.yml',
  
  // Backend
  '.py', '.pyx', '.pyi',
  '.java', '.class', '.jar',
  '.php', '.phtml',
  '.rb', '.rake', '.gemspec',
  '.go', '.mod', '.sum',
  '.rs', '.toml',
  '.c', '.h', '.cpp', '.hpp', '.cc', '.cxx',
  '.cs', '.vb',
  '.swift', '.kt', '.kts',
  '.scala', '.clj', '.cljs',
  '.dart', '.jl',
  '.r', '.R',
  '.m', '.mm',
  '.f', '.f90', '.f95',
  '.pl', '.pm',
  '.lua', '.elixir', '.ex', '.exs',
  '.nim', '.crystal', '.cr',
  '.zig', '.odin',
  
  // Shell and scripts
  '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
  
  // Config files
  '.ini', '.cfg', '.conf', '.env', '.properties',
  '.dockerfile', '.dockerignore',
  '.gitignore', '.gitattributes',
  '.editorconfig', '.eslintrc', '.prettierrc',
  
  // Data serialization
  '.proto', '.avro', '.thrift',
  
  // SQL and databases
  '.sql', '.sqlite', '.db',
  
  // Other development files
  '.makefile', '.cmake', '.gradle', '.mvn',
  '.lock', '.sum', '.mod'
]);

const DOCS_EXTENSIONS = new Set([
  '.md', '.markdown', '.mdx',
  '.txt', '.text',
  '.rst', '.adoc', '.asciidoc',
  '.tex', '.latex',
  '.org',
  '.wiki'
]);

export function getFileExtension(filePath: string): string {
  return extname(filePath).toLowerCase();
}

export function isTextFile(filePath: string): boolean {
  const ext = getFileExtension(filePath);
  return CODE_EXTENSIONS.has(ext) || DOCS_EXTENSIONS.has(ext);
}

export function isCodeFile(filePath: string): boolean {
  const ext = getFileExtension(filePath);
  return CODE_EXTENSIONS.has(ext);
}

export function isDocumentationFile(filePath: string): boolean {
  const ext = getFileExtension(filePath);
  return DOCS_EXTENSIONS.has(ext);
}

export function shouldIncludeFile(filePath: string, mode: AnalysisMode): boolean {
  switch (mode) {
    case AnalysisMode.ALL:
      return true;
    case AnalysisMode.CODE:
      return isCodeFile(filePath);
    case AnalysisMode.DOCS:
      return isDocumentationFile(filePath);
    default:
      return false;
  }
}

export async function isBinaryFile(filePath: string): Promise<boolean> {
  try {
    const fs = await import('node:fs/promises');
    const buffer = Buffer.alloc(1024);
    const fd = await fs.open(filePath, 'r');
    
    try {
      const { bytesRead } = await fd.read(buffer, 0, 1024, 0);
      
      for (let i = 0; i < bytesRead; i++) {
        const byte = buffer[i]!;
        if (byte === 0 || (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13)) {
          return true;
        }
      }
      
      return false;
    } finally {
      await fd.close();
    }
  } catch {
    return true;
  }
}

export function estimateBinaryTokens(sizeInBytes: number): number {
  return Math.ceil(sizeInBytes / 4);
}

export function getFileTypeFromExtension(filePath: string): string {
  const ext = getFileExtension(filePath);
  return ext || 'unknown';
}