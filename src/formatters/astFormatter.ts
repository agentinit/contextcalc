import chalk from 'chalk';
import type { ScanResult, Node, FileNode, ASTSymbol, TreeOptions, FunctionSymbol, ClassSymbol, InterfaceSymbol, EnumSymbol, ImportSymbol, ExportSymbol, NamespaceSymbol } from '../types/index.js';
import { SymbolType } from '../types/index.js';
import { formatFileSize } from '../utils/formatUtils.js';

interface ASTFormatterOptions extends TreeOptions {
  showTokensPerSymbol?: boolean;
  showLocations?: boolean;
}

export function formatAsAST(result: ScanResult, options: ASTFormatterOptions): string {
  const lines: string[] = [];
  const useColors = options.colors;

  function getSymbolIcon(symbolType: SymbolType): string {
    switch (symbolType) {
      case SymbolType.FUNCTION:
      case SymbolType.METHOD:
        return useColors ? chalk.blue('ƒ') : 'f';
      case SymbolType.CLASS:
        return useColors ? chalk.green('C') : 'C';
      case SymbolType.INTERFACE:
        return useColors ? chalk.cyan('I') : 'I';
      case SymbolType.TYPE:
        return useColors ? chalk.magenta('T') : 'T';
      case SymbolType.ENUM:
        return useColors ? chalk.yellow('E') : 'E';
      case SymbolType.VARIABLE:
        return useColors ? chalk.gray('v') : 'v';
      case SymbolType.CONSTANT:
        return useColors ? chalk.gray('c') : 'c';
      case SymbolType.IMPORT:
        return useColors ? chalk.dim('←') : '<';
      case SymbolType.EXPORT:
        return useColors ? chalk.dim('→') : '>';
      case SymbolType.NAMESPACE:
        return useColors ? chalk.magenta('N') : 'N';
      case SymbolType.STRUCT:
        return useColors ? chalk.green('S') : 'S';
      case SymbolType.TRAIT:
        return useColors ? chalk.cyan('Tr') : 'Tr';
      default:
        return '?';
    }
  }

  function formatSymbolSignature(symbol: ASTSymbol): string {
    switch (symbol.type) {
      case SymbolType.FUNCTION:
      case SymbolType.METHOD: {
        const funcSymbol = symbol as FunctionSymbol;
        if (funcSymbol.signature) {
          return funcSymbol.signature;
        }
        const params = funcSymbol.parameters.map(p => {
          let param = p.name;
          if (p.type) param += `: ${p.type}`;
          if (p.optional) param += '?';
          if (p.defaultValue) param += ` = ${p.defaultValue}`;
          return param;
        }).join(', ');
        let sig = `${funcSymbol.name}(${params})`;
        if (funcSymbol.returnType) sig += `: ${funcSymbol.returnType}`;
        if (funcSymbol.async) sig = `async ${sig}`;
        return sig;
      }

      case SymbolType.CLASS: {
        const classSymbol = symbol as ClassSymbol;
        let classSig = classSymbol.name;
        if (classSymbol.abstract) classSig = `abstract ${classSig}`;
        if (classSymbol.extends) classSig += ` extends ${classSymbol.extends}`;
        if (classSymbol.implements && classSymbol.implements.length > 0) {
          classSig += ` implements ${classSymbol.implements.join(', ')}`;
        }
        return classSig;
      }

      case SymbolType.INTERFACE: {
        const ifaceSymbol = symbol as InterfaceSymbol;
        let ifaceSig = ifaceSymbol.name;
        if (ifaceSymbol.extends && ifaceSymbol.extends.length > 0) {
          ifaceSig += ` extends ${ifaceSymbol.extends.join(', ')}`;
        }
        return ifaceSig;
      }

      case SymbolType.ENUM: {
        const enumSymbol = symbol as EnumSymbol;
        return `${enumSymbol.name} { ${enumSymbol.members.length} members }`;
      }

      case SymbolType.IMPORT: {
        const importSymbol = symbol as ImportSymbol;
        let importSig = `from "${importSymbol.from}"`;
        if (importSymbol.default) importSig = `${importSymbol.default} ${importSig}`;
        if (importSymbol.imports.length > 0) importSig += ` { ${importSymbol.imports.join(', ')} }`;
        if (importSymbol.namespace) importSig += ` as ${importSymbol.namespace}`;
        return importSig;
      }

      case SymbolType.EXPORT: {
        const exportSymbol = symbol as ExportSymbol;
        if (exportSymbol.default) return `default ${exportSymbol.default}`;
        return `{ ${exportSymbol.exports.join(', ')} }`;
      }

      case SymbolType.NAMESPACE: {
        const nsSymbol = symbol as NamespaceSymbol;
        return `${nsSymbol.name} { ${nsSymbol.members.length} members }`;
      }

      default:
        return symbol.name;
    }
  }

  function formatLocation(symbol: ASTSymbol): string {
    const loc = symbol.location;
    if (loc.startLine === loc.endLine) {
      return useColors
        ? chalk.dim(`line ${loc.startLine}`)
        : `line ${loc.startLine}`;
    }
    return useColors
      ? chalk.dim(`lines ${loc.startLine}-${loc.endLine}`)
      : `lines ${loc.startLine}-${loc.endLine}`;
  }

  function formatSymbol(symbol: ASTSymbol, indent: string, isLast: boolean, showLocation: boolean = true): string[] {
    const lines: string[] = [];
    const icon = getSymbolIcon(symbol.type);
    const signature = formatSymbolSignature(symbol);
    const location = showLocation ? ` ${formatLocation(symbol)}` : '';
    const tokensInfo =
      options.showTokensPerSymbol && typeof symbol.tokens === 'number'
        ? (useColors ? chalk.dim(` [${symbol.tokens}t]`) : ` [${symbol.tokens}t]`)
        : '';

    const prefix = isLast ? '└─ ' : '├─ ';
    const symbolName = useColors ? chalk.bold(signature) : signature;

    lines.push(`${indent}${prefix}${icon} ${symbolName}${tokensInfo}${location}`);

    // Handle nested symbols
    const nestedSymbols = getNestedSymbols(symbol);
    if (nestedSymbols.length > 0) {
      const childIndent = indent + (isLast ? '   ' : '│  ');
      nestedSymbols.forEach((nested, index) => {
        const isLastNested = index === nestedSymbols.length - 1;
        lines.push(...formatSymbol(nested, childIndent, isLastNested, showLocation));
      });
    }

    return lines;
  }

  function getNestedSymbols(symbol: ASTSymbol): ASTSymbol[] {
    if ('members' in symbol && Array.isArray(symbol.members)) {
      // For enums, members are { name, value } objects, not Symbols
      if (symbol.type === SymbolType.ENUM) {
        return [];
      }
      return symbol.members as ASTSymbol[];
    }
    return [];
  }

  function formatFileSymbols(fileNode: FileNode, options: ASTFormatterOptions): string[] {
    const lines: string[] = [];

    if (!fileNode.entities || fileNode.entities.length === 0) {
      return lines;
    }

    // File header
    const fileName = useColors ? chalk.blue(fileNode.path) : fileNode.path;
    const stats = [];
    if (options.metrics.showTokens) stats.push(`${fileNode.tokens} tokens`);
    if (options.metrics.showLines) stats.push(`${fileNode.lines} lines`);
    if (options.metrics.showSize) stats.push(formatFileSize(fileNode.size));

    const statsStr = stats.length > 0 ? ` (${stats.join(', ')})` : '';
    const fileHeader = useColors ? `${fileName}${chalk.dim(statsStr)}` : `${fileName}${statsStr}`;

    lines.push(fileHeader);

    // Symbols
    const showLocation = options.showLocations !== false;
    fileNode.entities.forEach((symbol, index) => {
      const isLast = index === fileNode.entities!.length - 1;
      lines.push(...formatSymbol(symbol, '', isLast, showLocation));
    });

    return lines;
  }

  function processNode(node: Node): void {
    if (node.type === 'file') {
      const fileLines = formatFileSymbols(node, options);
      if (fileLines.length > 0) {
        lines.push(...fileLines);
        lines.push(''); // Add blank line between files
      }
    } else if (node.type === 'folder') {
      // Process folder children recursively
      if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
          processNode(child);
        }
      }
    }
  }

  // Process all nodes
  for (const node of result.nodes) {
    processNode(node);
  }

  // Add summary
  const totalFiles = result.totalFiles;
  const totalSymbolsCount = countTotalSymbols(result.nodes);
  const filesWithSymbols = countFilesWithSymbols(result.nodes);

  if (lines.length > 0) {
    lines.pop(); // Remove last blank line
  }

  lines.push('');

  // Add AST statistics if available
  if (result.astStats) {
    const { filesSkipped, skippedReasons } = result.astStats;

    const statLines: string[] = [];

    // Main summary - use filesWithSymbols which counts files that have symbols,
    // not filesProcessed which only counts freshly parsed files (excludes cache hits)
    const summary = `Found ${totalSymbolsCount} symbols across ${filesWithSymbols} ${filesWithSymbols === 1 ? 'file' : 'files'}`;
    statLines.push(useColors ? chalk.dim(summary) : summary);

    // Files skipped information
    if (filesSkipped > 0) {
      const skippedSummary = `Skipped ${filesSkipped} ${filesSkipped === 1 ? 'file' : 'files'}`;
      statLines.push(useColors ? chalk.dim(skippedSummary) : skippedSummary);

      // Group skip reasons
      const reasonGroups: { [key: string]: string[] } = {};
      for (const [reason, count] of skippedReasons) {
        if (reason.startsWith('unsupported: ')) {
          const ext = reason.replace('unsupported: ', '');
          if (!reasonGroups['unsupported']) {
            reasonGroups['unsupported'] = [];
          }
          reasonGroups['unsupported'].push(`${ext} (${count})`);
        } else {
          if (!reasonGroups[reason]) {
            reasonGroups[reason] = [];
          }
          reasonGroups[reason].push(`${count}`);
        }
      }

      // Display grouped reasons
      for (const [category, items] of Object.entries(reasonGroups)) {
        if (category === 'unsupported') {
          const extensions = items.join(', ');
          const msg = `  - Unsupported extensions: ${extensions}`;
          statLines.push(useColors ? chalk.dim(msg) : msg);
        } else {
          const totalCount = items.reduce((sum, item) => sum + parseInt(item), 0);
          const msg = `  - ${category}: ${totalCount}`;
          statLines.push(useColors ? chalk.dim(msg) : msg);
        }
      }
    }

    lines.push(...statLines);
  } else {
    // Fallback to simple summary
    const summary = useColors
      ? chalk.dim(`Found ${totalSymbolsCount} symbols across ${totalFiles} files`)
      : `Found ${totalSymbolsCount} symbols across ${totalFiles} files`;
    lines.push(summary);
  }

  return lines.join('\n');
}

function countTotalSymbols(nodes: Node[]): number {
  let count = 0;

  function countInNode(node: Node): void {
    if (node.type === 'file') {
      if (node.entities) {
        count += node.entities.length;
        // Count nested symbols
        node.entities.forEach(symbol => {
          count += countNestedSymbols(symbol);
        });
      }
    } else {
      node.children.forEach(countInNode);
    }
  }

  function countNestedSymbols(symbol: ASTSymbol): number {
    let nested = 0;
    if ('members' in symbol && Array.isArray(symbol.members)) {
      // For enums, count the enum members directly
      if (symbol.type === SymbolType.ENUM) {
        return symbol.members.length;
      }
      // For other types (class, interface, etc.), recursively count nested symbols
      nested += symbol.members.length;
      (symbol.members as ASTSymbol[]).forEach(member => {
        nested += countNestedSymbols(member);
      });
    }
    return nested;
  }

  nodes.forEach(countInNode);
  return count;
}

function countFilesWithSymbols(nodes: Node[]): number {
  let count = 0;

  function countInNode(node: Node): void {
    if (node.type === 'file') {
      if (node.entities && node.entities.length > 0) {
        count++;
      }
    } else {
      node.children.forEach(countInNode);
    }
  }

  nodes.forEach(countInNode);
  return count;
}
