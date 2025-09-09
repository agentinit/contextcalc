#!/usr/bin/env node

import { Command, Option } from 'commander';
import chalk from 'chalk';
import { DirectoryScanner } from './core/scanner.js';
import { formatAsJson } from './formatters/jsonFormatter.js';
import { formatAsEnhancedTree } from './formatters/enhancedTreeFormatter.js';
import { formatAsFlat } from './formatters/flatFormatter.js';
import { AnalysisMode, OutputFormat, TreeSortBy, MetricType } from './types/index.js';
import type { TreeOptions, MetricSettings } from './types/index.js';
import { resolveProjectPath, parseFileSize } from './utils/pathUtils.js';
import { formatFileSize } from './utils/formatUtils.js';
import { Tokenizer } from './core/tokenizer.js';

const program = new Command();

function buildMetricInfo(tokens: number, lines: number, bytes: number, tokenizer: Tokenizer, metrics: MetricSettings, useColors: boolean): string {
  const parts = [];
  
  if (metrics.showTokens) {
    parts.push(`${tokenizer.formatTokenCount(tokens)} tokens`);
  }
  
  if (metrics.showLines) {
    parts.push(`${lines} lines`);
  }
  
  if (metrics.showSize) {
    parts.push(formatFileSize(bytes));
  }
  
  const info = parts.length > 0 ? `(${parts.join(', ')})` : '';
  return useColors ? chalk.dim(info) : info;
}

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let hasData = false;
    
    const timeout = setTimeout(() => {
      if (!hasData) {
        resolve(''); // No data available, return empty
      }
    }, 10); // Very short timeout to detect if data is available
    
    process.stdin.on('data', (chunk) => {
      hasData = true;
      clearTimeout(timeout);
      chunks.push(chunk);
    });
    
    process.stdin.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    
    process.stdin.on('error', reject);
  });
}

async function readClipboard(): Promise<string> {
  const { exec } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execAsync = promisify(exec);
  
  const platform = process.platform;
  
  try {
    if (platform === 'darwin') {
      const { stdout } = await execAsync('pbpaste');
      return stdout;
    } else if (platform === 'linux') {
      // Try xclip first, then xsel as fallback
      try {
        const { stdout } = await execAsync('xclip -selection clipboard -o');
        return stdout;
      } catch {
        const { stdout } = await execAsync('xsel --clipboard --output');
        return stdout;
      }
    } else if (platform === 'win32') {
      const { stdout } = await execAsync('powershell -command "Get-Clipboard"');
      return stdout;
    } else {
      throw new Error(`Clipboard access not supported on platform: ${platform}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('not supported')) {
      throw error;
    }
    throw new Error(`Failed to read clipboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


program
  .name('contextcalc')
  .description('A fast CLI tool for analyzing codebase structure and token counts for LLM context management')
  .version('1.0.0');

// Main command with enhanced tree features
program
  .argument('[path]', 'Path to analyze', '.')
  .option('--mode <mode>', 'Analysis mode: all, code, docs', 'all')
  .option('--max-size <size>', 'Maximum file size to analyze (e.g., 10M, 500k)', '10M')
  .option('-o, --output <format>', 'Output format: tree, json, flat', 'tree')
  .option('--sort <by>', 'Sort by: tokens, size, name', 'tokens')
  .option('--depth <n>', 'Tree depth levels to display (0=root only, 1=root+children, etc.)', parseInt)
  .option('--min-tokens <n>', 'Hide files with fewer than n tokens', parseInt)
  .option('--metrics <list>', 'Metrics to display: tokens,lines,size,percentage', 'tokens,lines,size,percentage')
  .addOption(new Option('--percentages', 'Show percentage of total project tokens').default(true).hideHelp())
  .option('--no-percentages', 'Disable percentage display')
  .option('--relative-percentages', 'Show percentage of parent directory')
  .option('--bars', 'Show visual weight bars')
  .option('--no-colors', 'Disable colored output')
  .option('--no-gitignore', 'Ignore .gitignore files')
  .option('--no-default-ignores', 'Disable default ignore patterns')
  .option('--from-clipboard', 'Read content from system clipboard')
  .action(async (path: string, options) => {
    try {
      const startTime = Date.now();
      
      // Parse metrics early so it's available for all processing modes
      const metrics = parseMetrics(options.metrics);
      
      // Check if clipboard option is specified
      if (options.fromClipboard) {
        try {
          const content = await readClipboard();
          
          if (content.length === 0) {
            console.log(chalk.yellow('Clipboard is empty.'));
            return;
          }
          
          const tokenizer = new Tokenizer();
          
          const tokens = tokenizer.countTokensFromText(content);
          const lines = tokenizer.countLines(content);
          const bytes = Buffer.byteLength(content, 'utf8');
          
          // Format output using metrics settings
          const metricInfo = buildMetricInfo(tokens, lines, bytes, tokenizer, metrics, !options.noColors);
          if (!options.noColors) {
            console.log(chalk.blue(`clipboard`) + ' ' + metricInfo);
          } else {
            console.log(`clipboard ${metricInfo}`);
          }
          
          tokenizer.dispose();
          return;
        } catch (error) {
          console.error(chalk.red('Error:'), `Failed to read clipboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
          process.exit(1);
        }
      }
      
      // Check if input is being piped from stdin
      if (!process.stdin.isTTY) {
        const content = await readStdin();
        
        // Only process stdin if there's actual content
        if (content.length > 0) {
          const tokenizer = new Tokenizer();
          
          const tokens = tokenizer.countTokensFromText(content);
          const lines = tokenizer.countLines(content);
          const bytes = Buffer.byteLength(content, 'utf8');
          
          // Format output using metrics settings
          const metricInfo = buildMetricInfo(tokens, lines, bytes, tokenizer, metrics, !options.noColors);
          if (!options.noColors) {
            console.log(chalk.blue(`stdin`) + ' ' + metricInfo);
          } else {
            console.log(`stdin ${metricInfo}`);
          }
          
          tokenizer.dispose();
          return;
        }
      }
      
      const projectPath = resolveProjectPath(path);
      
      // Check if the path is a file instead of a directory
      const fs = await import('node:fs/promises');
      let isFile = false;
      try {
        const stats = await fs.stat(projectPath);
        isFile = stats.isFile();
      } catch (error) {
        console.error(chalk.red('Error:'), `Cannot access path ${projectPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
      }
      
      // Handle single file processing
      if (isFile) {
        const tokenizer = new Tokenizer();
        
        try {
          const result = await tokenizer.countTokens(projectPath);
          const stats = await fs.stat(projectPath);
          const fileName = projectPath.split('/').pop() || projectPath;
          
          // Format output using metrics settings
          const metricInfo = buildMetricInfo(result.tokens, result.lines, stats.size, tokenizer, metrics, !options.noColors);
          if (!options.noColors) {
            console.log(chalk.blue(fileName) + ' ' + metricInfo);
          } else {
            console.log(`${fileName} ${metricInfo}`);
          }
          
          tokenizer.dispose();
          return;
        } catch (error) {
          console.error(chalk.red('Error:'), `Failed to process file ${projectPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          tokenizer.dispose();
          process.exit(1);
        }
      }
      
      const mode = validateMode(options.mode);
      const outputFormat = validateOutputFormat(options.output);
      const sortBy = validateSortBy(options.sort);
      const maxFileSize = parseFileSize(options.maxSize);
      const isDebug = process.env.DEBUG === '1' || process.env.DEBUG?.toLowerCase() === 'true';
      
      if (isDebug) {
        console.log(chalk.dim(`Analyzing ${projectPath} in ${mode} mode...`));
      }
      
      const scanner = new DirectoryScanner(projectPath, mode, maxFileSize);
      await scanner.initialize(options.gitignore, options.defaultIgnores);
      
      const result = await scanner.scan();
      const endTime = Date.now();
      
      if (outputFormat === OutputFormat.JSON) {
        console.log(formatAsJson(result));
      } else if (outputFormat === OutputFormat.TREE || outputFormat === OutputFormat.FLAT) {
        // Tree and flat formats need tree options and percentage calculations
        // Handle backward compatibility for percentage options
        let finalMetrics = metrics;
        if (options.percentages === false) {
          finalMetrics = { ...metrics, showPercentages: false };
        }
        
        const treeOptions: TreeOptions = {
          mode,
          maxSize: options.maxSize,
          gitignore: options.gitignore,
          defaultIgnores: options.defaultIgnores,
          sort: sortBy,
          depth: options.depth,
          minTokens: options.minTokens,
          metrics: finalMetrics,
          absolutePercentages: !options.relativePercentages && finalMetrics.showPercentages,
          showBars: Boolean(options.bars), // Only true if --bars is explicitly provided
          colors: !options.noColors, // Colors enabled by default unless --no-colors
          debug: isDebug
        };
        
        // Calculate percentages if needed for visualization
        const shouldCalculatePercentages = treeOptions.metrics.showPercentages || treeOptions.showBars;
        const nodesWithPercentages = shouldCalculatePercentages 
          ? DirectoryScanner.calculatePercentages(result.nodes, treeOptions.absolutePercentages, result.totalTokens)
          : result.nodes;
        const enhancedResult = {
          ...result,
          nodes: nodesWithPercentages
        };
        
        if (outputFormat === OutputFormat.FLAT) {
          console.log(formatAsFlat(enhancedResult, treeOptions));
        } else {
          console.log(formatAsEnhancedTree(enhancedResult, treeOptions));
        }
      }
      
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      if (outputFormat === OutputFormat.TREE || outputFormat === OutputFormat.FLAT) {
        if (!options.noColors) {
          console.log(chalk.dim(`Completed in ${duration}s`));
        } else {
          console.log(`Completed in ${duration}s`);
        }
      }
      
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });


function validateMode(mode: string): AnalysisMode {
  const validModes = Object.values(AnalysisMode);
  if (!validModes.includes(mode as AnalysisMode)) {
    throw new Error(`Invalid mode: ${mode}. Valid options: ${validModes.join(', ')}`);
  }
  return mode as AnalysisMode;
}

function validateOutputFormat(format: string): OutputFormat {
  const validFormats = Object.values(OutputFormat);
  if (!validFormats.includes(format as OutputFormat)) {
    throw new Error(`Invalid output format: ${format}. Valid options: ${validFormats.join(', ')}`);
  }
  return format as OutputFormat;
}

function validateSortBy(sort: string): TreeSortBy {
  const validSorts = Object.values(TreeSortBy);
  if (!validSorts.includes(sort as TreeSortBy)) {
    throw new Error(`Invalid sort option: ${sort}. Valid options: ${validSorts.join(', ')}`);
  }
  return sort as TreeSortBy;
}

function parseMetrics(metricsString: string): MetricSettings {
  const metrics = metricsString.split(',').map(m => m.trim().toLowerCase());
  const validMetrics = Object.values(MetricType);
  
  // Validate all metrics
  for (const metric of metrics) {
    if (!validMetrics.includes(metric as MetricType)) {
      throw new Error(`Invalid metric: ${metric}. Valid options: ${validMetrics.join(', ')}`);
    }
  }
  
  return {
    showTokens: metrics.includes(MetricType.TOKENS),
    showLines: metrics.includes(MetricType.LINES),
    showSize: metrics.includes(MetricType.SIZE),
    showPercentages: metrics.includes(MetricType.PERCENTAGE)
  };
}

program.parse();