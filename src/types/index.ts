export interface FileNode {
  path: string;
  hash: string;
  tokens: number;
  lines: number;
  size: number;
  type: 'file';
  filetype: string;
  percentage?: number;
  entities?: ASTSymbol[];
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
  JSON = 'json',
  FLAT = 'flat',
  CSV = 'csv',
  AST = 'ast'
}

export enum TreeSortBy {
  TOKENS = 'tokens',
  SIZE = 'size',
  NAME = 'name'
}

export enum MetricType {
  TOKENS = 'tokens',
  LINES = 'lines', 
  SIZE = 'size',
  PERCENTAGE = 'percentage'
}

export interface CliOptions {
  mode: AnalysisMode;
  maxSize: string;
  output: OutputFormat;
  gitignore: boolean;
  defaultIgnores: boolean;
}

export interface MetricSettings {
  showTokens: boolean;
  showLines: boolean;
  showSize: boolean;
  showPercentages: boolean;
}

export interface TreeOptions {
  mode: AnalysisMode;
  maxSize: string;
  gitignore: boolean;
  defaultIgnores: boolean;
  sort: TreeSortBy;
  depth?: number;
  minTokens?: number;
  metrics: MetricSettings;
  absolutePercentages: boolean;
  showBars: boolean;
  colors: boolean;
  debug: boolean;
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

// AST Symbol Types
export enum SymbolType {
  FUNCTION = 'function',
  METHOD = 'method',
  CLASS = 'class',
  INTERFACE = 'interface',
  TYPE = 'type',
  ENUM = 'enum',
  VARIABLE = 'variable',
  CONSTANT = 'constant',
  IMPORT = 'import',
  EXPORT = 'export',
  NAMESPACE = 'namespace',
  STRUCT = 'struct',
  TRAIT = 'trait'
}

export interface SourceLocation {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  startByte: number;
  endByte: number;
}

export interface Parameter {
  name: string;
  type?: string;
  optional?: boolean;
  defaultValue?: string;
}

export interface BaseSymbol {
  name: string;
  type: SymbolType;
  location: SourceLocation;
  tokens?: number;
  docComment?: string;
}

export interface FunctionSymbol extends BaseSymbol {
  type: SymbolType.FUNCTION | SymbolType.METHOD;
  parameters: Parameter[];
  returnType?: string;
  async?: boolean;
  generator?: boolean;
  signature?: string;
}

export interface ClassSymbol extends BaseSymbol {
  type: SymbolType.CLASS;
  extends?: string;
  implements?: string[];
  members: ASTSymbol[];
  abstract?: boolean;
}

export interface InterfaceSymbol extends BaseSymbol {
  type: SymbolType.INTERFACE;
  extends?: string[];
  members: ASTSymbol[];
}

export interface TypeSymbol extends BaseSymbol {
  type: SymbolType.TYPE;
  definition?: string;
}

export interface EnumSymbol extends BaseSymbol {
  type: SymbolType.ENUM;
  members: { name: string; value?: string }[];
}

export interface VariableSymbol extends BaseSymbol {
  type: SymbolType.VARIABLE | SymbolType.CONSTANT;
  variableType?: string;
  value?: string;
}

export interface ImportSymbol extends BaseSymbol {
  type: SymbolType.IMPORT;
  from: string;
  imports: string[];
  default?: string;
  namespace?: string;
}

export interface ExportSymbol extends BaseSymbol {
  type: SymbolType.EXPORT;
  exports: string[];
  default?: string;
}

export interface NamespaceSymbol extends BaseSymbol {
  type: SymbolType.NAMESPACE;
  members: ASTSymbol[];
}

export interface StructSymbol extends BaseSymbol {
  type: SymbolType.STRUCT;
  fields: { name: string; type?: string }[];
}

export interface TraitSymbol extends BaseSymbol {
  type: SymbolType.TRAIT;
  members: ASTSymbol[];
}

export type ASTSymbol =
  | FunctionSymbol
  | ClassSymbol
  | InterfaceSymbol
  | TypeSymbol
  | EnumSymbol
  | VariableSymbol
  | ImportSymbol
  | ExportSymbol
  | NamespaceSymbol
  | StructSymbol
  | TraitSymbol;

export interface ASTOptions {
  includeTokens?: boolean;
  includeLocations?: boolean;
  includeDocComments?: boolean;
  maxDepth?: number;
}