# ContextCalc 📏

#### `tree` like CLI tool and library for token counting.

![GitHub License](https://img.shields.io/github/license/agentinit/contextcalc)
![NPM Unpacked Size](https://img.shields.io/npm/unpacked-size/contextcalc)
![NPM Version](https://img.shields.io/npm/v/contextcalc)
![NPM Downloads](https://img.shields.io/npm/dm/contextcalc)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/agentinit/contextcalc/release.yml?logo=github)


![Screenshot](https://github.com/user-attachments/assets/1e9dc6e8-b39d-43b4-8420-887f4fc5c9c8)

https://github.com/user-attachments/assets/3c9556b3-3876-46f7-9a44-707dd8c85000

## Table of Contents

- [ContextCalc 📏](#contextcalc-)
      - [`tree` like CLI tool but with token counts.](#tree-like-cli-tool-but-with-token-counts)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Quick Start](#quick-start)
  - [Input Sources](#input-sources)
    - [Directory Analysis (default)](#directory-analysis-default)
    - [Single File Analysis](#single-file-analysis)
    - [Stdin Pipe](#stdin-pipe)
    - [Clipboard Content](#clipboard-content)
  - [Output Formats](#output-formats)
    - [Tree View (default)](#tree-view-default)
    - [Flat View](#flat-view)
    - [JSON Output](#json-output)
  - [Options Reference](#options-reference)
  - [Usage Examples](#usage-examples)
    - [Basic Usage](#basic-usage)
    - [File Filtering](#file-filtering)
    - [Output Customization](#output-customization)
    - [Performance \& Analysis](#performance--analysis)
    - [Input Source Comparison](#input-source-comparison)
    - [Advanced Workflows](#advanced-workflows)
  - [Library Usage](#library-usage)
    - [Installation as Library](#installation-as-library)
    - [Basic API](#basic-api)
    - [Common Use Cases](#common-use-cases)
    - [Function Reference](#function-reference)
    - [TypeScript Support](#typescript-support)
  - [License](#license)

## Installation

```bash
npm install -g contextcalc
# or
npx contextcalc [path] [options]
```

## Quick Start

```bash
# Tree view
npx contextcalc .

# Flat file list sorted by token count  
npx contextcalc . --output flat

# Flat file list sorted by token count (only .txt, .md and etc.)
npx contextcalc . --mode docs

# Tree with visual bars
npx contextcalc . --bars
```

## Input Sources

ContextCalc supports multiple input sources for maximum flexibility:

### Directory Analysis (default)
Analyze entire directories with hierarchical structure:
```bash
npx contextcalc ./src --depth 2
npx contextcalc . --output flat --min-tokens 1000 # Get the biggest files
```

### Single File Analysis  
Analyze individual files directly:
```bash
npx contextcalc README.md
npx contextcalc src/cli.ts --metrics tokens,lines,size
```

### Stdin Pipe
Pipe content from other commands or files:
```bash
cat README.md | npx contextcalc
echo "Your text here" | npx contextcalc --metrics tokens,lines
git diff | npx contextcalc --metrics tokens --no-colors
```

### Clipboard Content
Analyze content directly from your clipboard:
```bash
# Copy some text, then analyze it:
npx contextcalc --from-clipboard
npx contextcalc --from-clipboard --metrics tokens
npx contextcalc --from-clipboard --metrics size --no-colors
```

## Output Formats

### Tree View (default)
Shows hierarchical structure with absolute percentages:
```bash
npx contextcalc . --depth 2
```
```
 ~/git/contextcalc ╱ main  npx -y contextcalc@latest --depth 2 .                                                        ✔ ╱ 06:59:13 
. (23.4k tokens, 87.6KB) (100.0%)
└── src (12.8k tokens, 50.0KB) (54.5%)
    ├── src/formatters (4.0k tokens, 14.9KB) (17.0%)
    ├── src/core (2.9k tokens, 12.4KB) (12.5%)
    ├── src/cli.ts (2.8k tokens, 339 lines, 12.5KB) (12.1%)
    ├── src/utils (2.5k tokens, 8.5KB) (10.8%)
    ├── src/types (484 tokens, 1.8KB) (2.1%)
└── test (4.7k tokens, 17.4KB) (20.0%)
    ├── test/enhancedTreeFormatter.test.ts (2.0k tokens, 240 lines, 7.2KB) (8.7%)
    ├── test/cli.test.ts (1.8k tokens, 229 lines, 7.1KB) (7.8%)
    ├── test/fileDetector.test.ts (371 tokens, 33 lines, 1.5KB) (1.6%)
    ├── test/pathUtils.test.ts (223 tokens, 19 lines, 793B) (1.0%)
    ├── test/hasher.test.ts (218 tokens, 26 lines, 832B) (0.9%)
└── README.md (2.2k tokens, 283 lines, 7.8KB) (9.4%)
└── CHANGELOG.md (1.1k tokens, 62 lines, 2.9KB) (4.8%)
└── CLAUDE.md (747 tokens, 111 lines, 2.5KB) (3.2%)
└── .github (592 tokens, 2.2KB) (2.5%)
    ├── .github/workflows (592 tokens, 2.2KB) (2.5%)
└── package.json (454 tokens, 55 lines, 1.3KB) (1.9%)
└── eslint.config.mjs (281 tokens, 44 lines, 1.1KB) (1.2%)
└── LICENSE (221 tokens, 21 lines, 1.0KB) (0.9%)
└── tsconfig.json (193 tokens, 29 lines, 713B) (0.8%)
└── .releaserc.json (103 tokens, 14 lines, 413B) (0.4%)
└── .claude (46 tokens, 129B) (0.2%)
    ├── .claude/settings.local.json (46 tokens, 10 lines, 129B) (0.2%)
└── index.ts (8 tokens, 1 lines, 30B) (0.0%)

Summary: 23.4k tokens, 31 files, 87.6KB
Completed in 0.21s
```

### Flat View
Lists all files sorted by token count (perfect for finding large files):
```bash
npx contextcalc . --output flat --min-tokens 500
```
```
src/formatters/enhancedTreeFormatter.ts 1.8k tokens, 226 lines, 6.5KB (13.1%)
src/core/scanner.ts 1.5k tokens, 226 lines, 6.7KB (11.5%)
src/cli.ts 1.2k tokens, 131 lines, 5.3KB (9.3%)
src/utils/fileDetector.ts 922 tokens, 123 lines, 3.0KB (6.7%)
```

### JSON Output
Structured data for scripts and automation:
```bash
npx contextcalc . --output json
```

## Options Reference

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <format>` | Output format: `tree`, `flat`, `json` | `tree` |
| `--mode <mode>` | Files to analyze: `all`, `code`, `docs` | `all` |
| `--max-size <size>` | Maximum file size to analyze (e.g., 10M, 500k) | `10M` |
| `--sort <by>` | Sort by: `tokens`, `size`, `name` | `tokens` |
| `--depth <n>` | Tree depth levels (0=root only, 1=root+children, etc.) | unlimited |
| `--min-tokens <n>` | Hide files with fewer than n tokens | `0` |
| `--metrics <list>` | Metrics to display: `tokens,lines,size,percentage` | `tokens,lines,size,percentage` |
| `--percentages` | Show absolute percentages (enabled by default) | `true` |
| `--no-percentages` | Disable percentage display | |
| `--relative-percentages` | Show percentages relative to parent directory | `false` |
| `--bars` | Show visual weight bars | `false` |
| `--no-colors` | Disable colored output | |
| `--no-gitignore` | Ignore .gitignore files | |
| `--no-default-ignores` | Disable default ignore patterns | |
| `--from-clipboard` | Read content from system clipboard | |

## Usage Examples

### Basic Usage

```bash
# Analyze current directory
npx contextcalc .

# Analyze specific directory
npx contextcalc ./src

# Analyze single file
npx contextcalc README.md

# Get help
npx contextcalc --help
```

### File Filtering

```bash
# Only analyze code files (.js, .ts, .py, etc.)
npx contextcalc . --mode code

# Only analyze documentation files (.md, .txt, .rst, etc.)
npx contextcalc . --mode docs

# Limit by file size (skip large files)
npx contextcalc . --max-size 1M

# Hide small files (less than 100 tokens)
npx contextcalc . --min-tokens 100

# Ignore .gitignore patterns
npx contextcalc . --no-gitignore

# Disable all default ignore patterns
npx contextcalc . --no-default-ignores
```

### Output Customization

```bash
# Flat list sorted by token count
npx contextcalc . --output flat

# Tree view with visual bars
npx contextcalc . --bars

# Limit tree depth
npx contextcalc . --depth 2

# Sort by file size instead of tokens
npx contextcalc . --sort size

# Sort alphabetically
npx contextcalc . --sort name

# Show only specific metrics
npx contextcalc . --metrics tokens,lines

# Clean output for scripts
npx contextcalc . --no-colors --no-percentages

# Relative percentages (% of parent directory)
npx contextcalc . --relative-percentages
```

### Performance & Analysis

```bash
# Find the largest files in your project
npx contextcalc . --output flat --min-tokens 1000

# Export analysis data for further processing
npx contextcalc . --output json > analysis.json

# Quick overview of just top-level directories
npx contextcalc . --depth 1

# Focus on heavyweight files only
npx contextcalc . --output flat --min-tokens 2000 --sort tokens
```

### Input Source Comparison

```bash
# All these should give the same token count for the same content:

# File analysis
npx contextcalc README.md --metrics tokens

# Stdin pipe
cat README.md | npx contextcalc --metrics tokens

# Copy README.md content to clipboard, then:
npx contextcalc --from-clipboard --metrics tokens
```

### Advanced Workflows

```bash
# Git workflow: analyze staged changes
git diff --cached | npx contextcalc --metrics tokens --no-colors

# Find files that exceed token limits for LLM context
npx contextcalc . --output flat --min-tokens 4000

# Analyze documentation structure
npx contextcalc ./docs --mode docs --bars --depth 3

# Compare token usage between branches
git show main:README.md | npx contextcalc --metrics tokens
git show feature-branch:README.md | npx contextcalc --metrics tokens

# Process multiple files through stdin
find . -name "*.md" -exec cat {} \; | npx contextcalc --metrics tokens,lines

# Generate reports for different file types
npx contextcalc . --mode code --output json > code-analysis.json
npx contextcalc . --mode docs --output json > docs-analysis.json

# Clean analysis for CI/CD pipelines
npx contextcalc . --output flat --no-colors --min-tokens 500 | head -10
```

## Library Usage

ContextCalc can be imported and used as a library in your Node.js applications for programmatic token counting.

### Installation as Library

```bash
npm install contextcalc
# or
yarn add contextcalc
# or
bun add contextcalc
```

> 📖 **Complete API Reference**: See [DOCS.md](./DOCS.md) for detailed documentation, advanced examples, and integration guides.

### Basic API

```javascript
import { countTokens, countTokensWithOptions } from 'contextcalc';

// Simple token counting
const tokens = countTokens("Hello, world!");
console.log(tokens); // 4

// Works with any data type
const jsonTokens = countTokens({ message: "Hello", data: [1, 2, 3] });
console.log(jsonTokens); // 24

const bufferTokens = countTokens(Buffer.from("Hello"));
console.log(bufferTokens); // 2

// Advanced options
const result = countTokensWithOptions("Line 1\nLine 2", {
  includeLines: true,
  format: 'formatted'
});
console.log(result); // { tokens: 6, lines: 2, formatted: "6" }
```

### Common Use Cases

```javascript
import { 
  countTokens,
  countTokensBatch,
  countTokensFromFile,
  estimateTokens
} from 'contextcalc';

// Batch processing multiple inputs
const inputs = ["Hello", "World", { key: "value" }];
const results = countTokensBatch(inputs);
console.log(results); // [2, 1, 8]

// File processing
const fileTokens = await countTokensFromFile('./README.md');
console.log(fileTokens); // 1247

// Quick estimation for large datasets
const estimate = estimateTokens("Large text content...");
console.log(estimate); // Fast approximate count
```

### Function Reference

| Function | Purpose | Example |
|----------|---------|---------|
| `countTokens(input)` | Basic token counting | `countTokens("Hello")` → `2` |
| `countTokensBatch(inputs)` | Multiple inputs efficiently | `countTokensBatch(["a", "b"])` → `[1, 1]` |
| `countTokensFromFile(path)` | File processing | `await countTokensFromFile("file.txt")` |
| `estimateTokens(input)` | Quick estimation | `estimateTokens("text")` → `1` |
| `countWithLines(input)` | Include line count | `countWithLines("Hi\nBye")` → `{tokens: 3, lines: 2}` |

### TypeScript Support

```typescript
import { 
  countTokens,
  type TokenInput,
  type TokenCountResult 
} from 'contextcalc';

const input: TokenInput = "Hello, TypeScript!";
const tokens: number = countTokens(input);
```

## License

MIT
