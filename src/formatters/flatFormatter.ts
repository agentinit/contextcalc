import chalk from 'chalk';
import { Node, ScanResult, TreeOptions, FileNode } from '../types/index.js';

export function formatAsFlat(result: ScanResult, options: TreeOptions): string {
  if (result.nodes.length === 0) {
    return chalk.yellow('No files found matching the criteria.');
  }

  // Collect all files recursively
  const allFiles = collectAllFiles(result.nodes);
  
  // Filter by minTokens if specified
  let filteredFiles = allFiles;
  if (options.minTokens) {
    filteredFiles = allFiles.filter(file => file.tokens >= options.minTokens);
  }
  
  // Sort by token count (descending)
  filteredFiles.sort((a, b) => b.tokens - a.tokens);

  const lines: string[] = [];
  
  for (const file of filteredFiles) {
    lines.push(formatFile(file, options));
  }

  // Add summary
  const cacheHitRate = result.cacheHits + result.cacheMisses > 0 
    ? ((result.cacheHits / (result.cacheHits + result.cacheMisses)) * 100).toFixed(1)
    : '0';

  const totalSize = formatFileSize(result.nodes.reduce((sum, node) => sum + node.size, 0));
  
  lines.push('');
  lines.push(chalk.dim(`Summary: ${formatTokenCount(result.totalTokens, options.colors)} tokens, ${result.totalFiles} files, ${totalSize}`));
  lines.push(chalk.dim(`Cache: ${result.cacheHits} hits, ${result.cacheMisses} misses (${cacheHitRate}% hit rate)`));

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

function formatFile(file: FileNode, options: TreeOptions): string {
  const fileName = options.colors ? chalk.cyan(file.path) : file.path;
  const tokenCount = formatTokenCount(file.tokens, options.colors);
  const fileSize = formatFileSize(file.size);
  
  // Create weight bar if enabled
  let weightBar = '';
  if (options.showBars && file.percentage !== undefined) {
    weightBar = createWeightBar(file.percentage, options.colors) + ' ';
  }
  
  // Create percentage text if enabled
  let percentageText = '';
  if (options.showPercentages && file.percentage !== undefined) {
    const color = options.colors ? getPercentageColor(file.percentage) : (text: string) => text;
    percentageText = ` ${color(`(${file.percentage.toFixed(1)}%)`)}`;
  }
  
  const info = options.colors 
    ? chalk.dim(`${tokenCount} tokens, ${file.lines} lines, ${fileSize}`)
    : `${tokenCount} tokens, ${file.lines} lines, ${fileSize}`;
    
  return `${weightBar}${fileName} ${info}${percentageText}`;
}

function createWeightBar(percentage: number, useColors: boolean): string {
  const barLength = 10;
  const filledLength = Math.round((percentage / 100) * barLength);
  const emptyLength = barLength - filledLength;
  
  const filled = '█'.repeat(filledLength);
  const empty = '░'.repeat(emptyLength);
  
  const bar = `[${filled}${empty}]`;
  
  if (!useColors) {
    return bar;
  }
  
  // Color code the bar based on percentage
  if (percentage >= 50) {
    return chalk.red(bar);
  } else if (percentage >= 20) {
    return chalk.yellow(bar);
  } else if (percentage >= 5) {
    return chalk.blue(bar);
  } else {
    return chalk.gray(bar);
  }
}

function getPercentageColor(percentage: number): (text: string) => string {
  if (percentage >= 50) {
    return chalk.red;
  } else if (percentage >= 20) {
    return chalk.yellow;
  } else if (percentage >= 5) {
    return chalk.blue;
  } else {
    return chalk.gray;
  }
}

function formatTokenCount(count: number, useColors: boolean): string {
  let formatted: string;
  
  if (count >= 1000000) {
    formatted = `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    formatted = `${(count / 1000).toFixed(1)}k`;
  } else {
    formatted = count.toString();
  }
  
  if (!useColors) {
    return formatted;
  }
  
  if (count >= 1000000) {
    return chalk.magenta(formatted);
  } else if (count >= 1000) {
    return chalk.yellow(formatted);
  } else {
    return chalk.green(formatted);
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  if (i === 0) {
    return `${bytes}B`;
  }
  
  const size = (bytes / Math.pow(k, i)).toFixed(1);
  return `${size}${units[i]}`;
}