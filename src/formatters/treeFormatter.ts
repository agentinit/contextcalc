import chalk from 'chalk';
import { basename } from 'node:path';
import type { Node, ScanResult, TreeOptions } from '../types/index.js';

interface TreeContext {
  isLast: boolean[];
  depth: number;
}

export function formatAsTree(result: ScanResult, options: TreeOptions): string {
  if (result.nodes.length === 0) {
    return chalk.yellow('No files found matching the criteria.');
  }

  const lines: string[] = [];
  
  for (let i = 0; i < result.nodes.length; i++) {
    const node = result.nodes[i]!;
    const isLast = i === result.nodes.length - 1;
    const context: TreeContext = { isLast: [isLast], depth: 0 };
    
    lines.push(...formatNode(node, context));
  }

  const cacheHitRate = result.cacheHits + result.cacheMisses > 0 
    ? ((result.cacheHits / (result.cacheHits + result.cacheMisses)) * 100).toFixed(1)
    : '0';

  lines.push('');
  lines.push(chalk.dim(`Summary: ${formatTokenCount(result.totalTokens)} tokens, ${result.totalFiles} files`));
  
  if (options.debug) {
    lines.push(chalk.dim(`Cache: ${result.cacheHits} hits, ${result.cacheMisses} misses (${cacheHitRate}% hit rate)`));
  }

  return lines.join('\n');
}

function formatNode(node: Node, context: TreeContext): string[] {
  const lines: string[] = [];
  const prefix = buildPrefix(context);
  const tokenCount = formatTokenCount(node.tokens);
  
  if (node.type === 'file') {
    const fileName = chalk.cyan(basename(node.path));
    const info = chalk.dim(`(${tokenCount} tokens, ${node.lines} lines)`);
    lines.push(`${prefix}${fileName} ${info}`);
  } else {
    const folderName = chalk.blue.bold(basename(node.path));
    const info = chalk.dim(`(${tokenCount} tokens)`);
    lines.push(`${prefix}${folderName} ${info}`);
    
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i]!;
      const isLastChild = i === node.children.length - 1;
      
      const childContext: TreeContext = {
        isLast: [...context.isLast, isLastChild],
        depth: context.depth + 1
      };
      
      lines.push(...formatNode(child, childContext));
    }
  }
  
  return lines;
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

function formatTokenCount(count: number): string {
  if (count >= 1000000) {
    return chalk.magenta(`${(count / 1000000).toFixed(1)}M`);
  } else if (count >= 1000) {
    return chalk.yellow(`${(count / 1000).toFixed(1)}k`);
  } else {
    return chalk.green(count.toString());
  }
}