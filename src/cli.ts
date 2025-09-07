#!/usr/bin/env node

import { Command, Option } from 'commander';
import chalk from 'chalk';
import { DirectoryScanner } from './core/scanner.js';
import { formatAsTree } from './formatters/treeFormatter.js';
import { formatAsJson } from './formatters/jsonFormatter.js';
import { formatAsEnhancedTree } from './formatters/enhancedTreeFormatter.js';
import { formatAsFlat } from './formatters/flatFormatter.js';
import { AnalysisMode, OutputFormat, TreeSortBy, TreeOptions } from './types/index.js';
import { resolveProjectPath, parseFileSize } from './utils/pathUtils.js';

const program = new Command();

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
  .option('--depth <n>', 'Maximum tree depth to display', parseInt)
  .option('--min-tokens <n>', 'Hide files with fewer than n tokens', parseInt)
  .addOption(new Option('--percentages', 'Show percentage of total project tokens').default(true).hideHelp())
  .option('--no-percentages', 'Disable percentage display')
  .option('--relative-percentages', 'Show percentage of parent directory')
  .addOption(new Option('--no-bars', 'Disable visual weight bars').hideHelp())
  .option('--bars', 'Show visual weight bars')
  .option('--no-colors', 'Disable colored output')
  .option('--no-gitignore', 'Ignore .gitignore files')
  .option('--no-default-ignores', 'Disable default ignore patterns')
  .action(async (path: string, options) => {
    try {
      const startTime = Date.now();
      
      const projectPath = resolveProjectPath(path);
      
      const mode = validateMode(options.mode);
      const outputFormat = validateOutputFormat(options.output);
      const sortBy = validateSortBy(options.sort);
      const maxFileSize = parseFileSize(options.maxSize);
      
      console.log(chalk.dim(`Analyzing ${projectPath} in ${mode} mode...`));
      
      const scanner = new DirectoryScanner(projectPath, mode, maxFileSize);
      await scanner.initialize(options.gitignore, options.defaultIgnores);
      
      const result = await scanner.scan();
      const endTime = Date.now();
      
      if (outputFormat === OutputFormat.JSON) {
        console.log(formatAsJson(result));
      } else if (outputFormat === OutputFormat.TREE || outputFormat === OutputFormat.FLAT) {
        // Tree and flat formats need tree options and percentage calculations
        const treeOptions: TreeOptions = {
          mode,
          maxSize: options.maxSize,
          gitignore: options.gitignore,
          defaultIgnores: options.defaultIgnores,
          sort: sortBy,
          depth: options.depth,
          minTokens: options.minTokens,
          showPercentages: options.percentages ?? true, // Default to true, --no-percentages sets to false
          absolutePercentages: !options.relativePercentages && (options.percentages ?? true),
          showBars: options.bars ?? false, // Default to false if not specified
          colors: !options.noColors // Colors enabled by default unless --no-colors
        };
        
        // Calculate percentages if needed for visualization
        const shouldCalculatePercentages = treeOptions.showPercentages || treeOptions.showBars;
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

program.parse();