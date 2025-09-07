export interface FileNode {
  path: string;
  hash: string;
  tokens: number;
  lines: number;
  size: number;
  type: 'file';
  filetype: string;
  percentage?: number;
}

export interface FolderNode {
  path: string;
  hash: string;
  tokens: number;
  size: number;
  type: 'folder';
  children: Node[];
  percentage?: number;
}

export type Node = FileNode | FolderNode;

export interface CacheEntry {
  hash: string;
  tokens: number;
  lines: number;
}

export interface Cache {
  version: string;
  projectPath: string;
  files: Record<string, CacheEntry>;
}

export enum AnalysisMode {
  ALL = 'all',
  CODE = 'code',
  DOCS = 'docs'
}

export enum OutputFormat {
  TREE = 'tree',
  JSON = 'json'
}

export enum TreeSortBy {
  TOKENS = 'tokens',
  SIZE = 'size',
  NAME = 'name'
}

export interface CliOptions {
  mode: AnalysisMode;
  maxSize: string;
  output: OutputFormat;
  gitignore: boolean;
  defaultIgnores: boolean;
}

export interface TreeOptions {
  mode: AnalysisMode;
  maxSize: string;
  gitignore: boolean;
  defaultIgnores: boolean;
  sort: TreeSortBy;
  depth?: number;
  minTokens?: number;
  showPercentages: boolean;
  absolutePercentages: boolean;
  showBars: boolean;
  colors: boolean;
}

export interface FileStats {
  path: string;
  hash: string;
  tokens: number;
  lines: number;
  size: number;
  isDirectory: boolean;
  filetype?: string;
}

export interface ScanResult {
  nodes: Node[];
  totalTokens: number;
  totalFiles: number;
  cacheHits: number;
  cacheMisses: number;
}