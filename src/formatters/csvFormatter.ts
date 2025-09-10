import type { Node, ScanResult, TreeOptions, FileNode } from '../types/index.js';
import { TreeSortBy } from '../types/index.js';

export function formatAsCsv(result: ScanResult, options: TreeOptions): string {
  if (result.nodes.length === 0) {
    return 'Path,Tokens,Lines,Size(bytes),Type,Percentage\n';
  }

  const lines: string[] = [];
  
  // Add CSV header
  lines.push('Path,Tokens,Lines,Size(bytes),Type,Percentage');
  
  // Collect all files recursively
  const allFiles = collectAllFiles(result.nodes);
  
  // Filter by minTokens if specified
  let filteredFiles = allFiles;
  if (options.minTokens != null) {
    filteredFiles = allFiles.filter(file => file.tokens >= options.minTokens!);
  }
  
  // Sort according to CLI option
  switch (options.sort) {
    case TreeSortBy.SIZE:
      filteredFiles.sort((a, b) => b.size - a.size);
      break;
    case TreeSortBy.NAME:
      filteredFiles.sort((a, b) => a.path.localeCompare(b.path));
      break;
    case TreeSortBy.TOKENS:
    default:
      filteredFiles.sort((a, b) => b.tokens - a.tokens);
      break;
  }
  // Add each file as a CSV row
  for (const file of filteredFiles) {
    lines.push(formatFileAsCsvRow(file));
  }

  // Add summary row
  const totalSize = filteredFiles.reduce((sum, file) => sum + file.size, 0);
  const totalLines = filteredFiles.reduce((sum, file) => sum + file.lines, 0);
  const totalTokens = filteredFiles.reduce((sum, file) => sum + file.tokens, 0);
  const summaryRow = `"Total",${totalTokens},${totalLines},${totalSize},"",100.0`;
  lines.push(summaryRow);

  return lines.join('\n');
}

function collectAllFiles(nodes: Node[]): FileNode[] {
  const files: FileNode[] = [];
  
  for (const node of nodes) {
    if (node.type === 'file') {
      files.push(node);
    } else {
      files.push(...collectAllFiles(node.children));
    }
  }
  
  return files;
}

function formatFileAsCsvRow(file: FileNode): string {
  const path = escapeCsvValue(file.path);
  const tokens = file.tokens;
  const lines = file.lines;
  const size = file.size;
  const type = file.filetype || '';
  const percentage = file.percentage !== undefined ? file.percentage.toFixed(1) : '';

  return `${path},${tokens},${lines},${size},"${type}",${percentage}`;
}

function escapeCsvValue(value: string): string {
  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}