import chalk from 'chalk';
import { Node, ScanResult, TreeOptions, TreeSortBy } from '../types/index.js';

interface TreeContext {
  isLast: boolean[];
  depth: number;
  maxDepth?: number;
}

export function formatAsEnhancedTree(result: ScanResult, options: TreeOptions): string {
  if (result.nodes.length === 0) {
    return chalk.yellow('No files found matching the criteria.');
  }

  const lines: string[] = [];
  
  // Sort and filter nodes
  let processedNodes = sortNodes(result.nodes, options.sort);
  if (options.minTokens) {
    processedNodes = filterByMinTokens(processedNodes, options.minTokens);
  }

  for (let i = 0; i < processedNodes.length; i++) {
    const node = processedNodes[i]!;
    const isLast = i === processedNodes.length - 1;
    const context: TreeContext = { 
      isLast: [isLast], 
      depth: 0,
      maxDepth: options.depth
    };
    
    lines.push(...formatEnhancedNode(node, context, options));
  }

  const cacheHitRate = result.cacheHits + result.cacheMisses > 0 
    ? ((result.cacheHits / (result.cacheHits + result.cacheMisses)) * 100).toFixed(1)
    : '0';

  const totalSize = formatFileSize(result.nodes.reduce((sum, node) => sum + node.size, 0));
  
  lines.push('');
  lines.push(chalk.dim(`Summary: ${formatTokenCount(result.totalTokens, options.colors)} tokens, ${result.totalFiles} files, ${totalSize}`));
  
  if (options.debug) {
    lines.push(chalk.dim(`Cache: ${result.cacheHits} hits, ${result.cacheMisses} misses (${cacheHitRate}% hit rate)`));
  }

  return lines.join('\n');
}

function formatEnhancedNode(node: Node, context: TreeContext, options: TreeOptions): string[] {
  // Stop if we've reached max depth
  if (context.maxDepth !== undefined && context.depth >= context.maxDepth) {
    return [];
  }

  const lines: string[] = [];
  const prefix = buildPrefix(context);
  const tokenCount = formatTokenCount(node.tokens, options.colors);
  const fileSize = formatFileSize(node.size);
  
  // Create weight bar if enabled
  let weightBar = '';
  if (options.showBars && node.percentage !== undefined) {
    weightBar = createWeightBar(node.percentage, options.colors) + ' ';
  }
  
  // Create percentage text if enabled
  let percentageText = '';
  if (options.metrics.showPercentages && node.percentage !== undefined) {
    const color = options.colors ? getPercentageColor(node.percentage) : (text: string) => text;
    percentageText = ` ${color(`(${node.percentage.toFixed(1)}%)`)}`;
  }
  
  if (node.type === 'file') {
    const fileName = options.colors ? chalk.cyan(node.path) : node.path;
    const info = buildFileInfo(tokenCount, node.lines, fileSize, options);
    lines.push(`${prefix}${weightBar}${fileName} ${info}${percentageText}`);
  } else {
    const folderName = options.colors ? chalk.blue.bold(node.path) : node.path;
    const info = buildFolderInfo(tokenCount, fileSize, options);
    lines.push(`${prefix}${weightBar}${folderName} ${info}${percentageText}`);
    
    // Sort and filter children
    let children = sortNodes(node.children, options.sort);
    if (options.minTokens) {
      children = filterByMinTokens(children, options.minTokens);
    }
    
    for (let i = 0; i < children.length; i++) {
      const child = children[i]!;
      const isLastChild = i === children.length - 1;
      
      const childContext: TreeContext = {
        isLast: [...context.isLast, isLastChild],
        depth: context.depth + 1,
        maxDepth: context.maxDepth
      };
      
      lines.push(...formatEnhancedNode(child, childContext, options));
    }
  }
  
  return lines;
}

function sortNodes(nodes: Node[], sortBy: TreeSortBy): Node[] {
  const sorted = [...nodes];
  
  switch (sortBy) {
    case TreeSortBy.TOKENS:
      return sorted.sort((a, b) => b.tokens - a.tokens);
    case TreeSortBy.SIZE:
      return sorted.sort((a, b) => b.size - a.size);
    case TreeSortBy.NAME:
      return sorted.sort((a, b) => a.path.localeCompare(b.path));
    default:
      return sorted;
  }
}

function filterByMinTokens(nodes: Node[], minTokens: number): Node[] {
  return nodes.filter(node => node.tokens >= minTokens).map(node => {
    if (node.type === 'folder') {
      return {
        ...node,
        children: filterByMinTokens(node.children, minTokens)
      };
    }
    return node;
  });
}

function buildPrefix(context: TreeContext): string {
  let prefix = '';
  
  for (let i = 0; i < context.depth; i++) {
    const isLast = context.isLast[i];
    if (i === context.depth - 1) {
      prefix += isLast ? '└── ' : '├── ';
    } else {
      const hasMoreSiblings = !context.isLast[i];
      prefix += hasMoreSiblings ? '│   ' : '    ';
    }
  }
  
  return prefix;
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

function buildFileInfo(tokenCount: string, lines: number, fileSize: string, options: TreeOptions): string {
  const parts = [];
  
  if (options.metrics.showTokens) {
    parts.push(`${tokenCount} tokens`);
  }
  
  if (options.metrics.showLines) {
    parts.push(`${lines} lines`);
  }
  
  if (options.metrics.showSize) {
    parts.push(fileSize);
  }
  
  const info = parts.length > 0 ? `(${parts.join(', ')})` : '';
  return options.colors ? chalk.dim(info) : info;
}

function buildFolderInfo(tokenCount: string, fileSize: string, options: TreeOptions): string {
  const parts = [];
  
  if (options.metrics.showTokens) {
    parts.push(`${tokenCount} tokens`);
  }
  
  if (options.metrics.showSize) {
    parts.push(fileSize);
  }
  
  const info = parts.length > 0 ? `(${parts.join(', ')})` : '';
  return options.colors ? chalk.dim(info) : info;
}