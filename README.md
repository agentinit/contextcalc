# contextcalc

A fast CLI tool for analyzing codebase structure and token counts for LLM context management with enhanced tree visualization.

## Installation

### Global Installation
```bash
npm install -g contextcalc
```

### Using npx (no installation required)
```bash
npx contextcalc [path] [options]
```

### Using bunx (if you have Bun installed)
```bash
bunx contextcalc [path] [options]
```

## Usage

### Basic Usage
```bash
# Enhanced visualization with weight bars (default)
contextcalc .

# Clean output without visual enhancements
contextcalc . --no-bars --no-colors

# Analyze specific directory
contextcalc ./src

# Show percentages and sort by file size
contextcalc . --show-percentages --sort size

# Limit depth and filter small files
contextcalc . --depth 3 --min-tokens 100

# Output as JSON for programmatic use
contextcalc . --output json
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--mode <mode>` | Analysis mode: `all`, `code`, `docs` | `code` |
| `--max-size <size>` | Maximum file size to analyze (e.g., 10M, 500k) | `10M` |
| `--output <format>` | Output format: `tree`, `json` | `tree` |
| `--sort <by>` | Sort by: `tokens`, `size`, `name` | `tokens` |
| `--depth <n>` | Maximum tree depth to display | unlimited |
| `--min-tokens <n>` | Hide files with fewer than n tokens | 0 |
| `--show-percentages` | Show percentage of parent directory | false |
| `--no-bars` | Disable visual weight bars | false |
| `--no-colors` | Disable colored output | false |
| `--no-gitignore` | Ignore .gitignore files | false |
| `--no-default-ignores` | Disable default ignore patterns | false |

### Analysis Modes

- **`code`**: Analyzes source code files (.js, .py, .rs, .go, etc.)
- **`docs`**: Analyzes documentation files (.md, .txt, .rst, etc.)
- **`all`**: Analyzes all file types, including binaries

### Advanced Examples

```bash
# Full-featured analysis with all visual enhancements
contextcalc . --show-percentages --sort tokens --depth 3

# Focus on large files only
contextcalc . --min-tokens 1000 --sort size

# Clean output for scripts/CI
contextcalc . --no-bars --no-colors --output json

# Analyze specific file types
contextcalc ./src --mode code --sort name

# Include all files, even binaries and large files
contextcalc . --mode all --max-size 100M --no-default-ignores

# Documentation analysis
contextcalc ./docs --mode docs --show-percentages
```

## Sample Output

### Enhanced Visualization (Default)

```bash
contextcalc . --show-percentages --depth 2
```

```
[██████████] . (11.8k tokens, 42.5KB) (100.0%)
├── [████████░░] src (9.0k tokens, 35.1KB) (76.9%)
├── [█░░░░░░░░░] bun.lock (1.4k tokens, 48 lines, 2.6KB) (11.5%)
├── [█░░░░░░░░░] test (812 tokens, 3.0KB) (6.9%)
├── [░░░░░░░░░░] package.json (313 tokens, 36 lines, 924B) (2.7%)
├── [░░░░░░░░░░] tsconfig.json (193 tokens, 29 lines, 713B) (1.6%)
├── [░░░░░░░░░░] .claude (35 tokens, 100B) (0.3%)
└── [░░░░░░░░░░] index.ts (8 tokens, 1 lines, 30B) (0.1%)

Summary: 11.8k tokens, 20 files, 42.5KB
Cache: 20 hits, 0 misses (100.0% hit rate)
Completed in 0.18s
```

### Clean Output

```bash
contextcalc . --no-bars --no-colors --depth 2
```

```
. (11.8k tokens, 42.5KB)
├── src (9.0k tokens, 35.1KB)
├── bun.lock (1.4k tokens, 48 lines, 2.6KB)
├── test (812 tokens, 3.0KB)
├── package.json (313 tokens, 36 lines, 924B)
├── tsconfig.json (193 tokens, 29 lines, 713B)
├── .claude (35 tokens, 100B)
└── index.ts (8 tokens, 1 lines, 30B)

Summary: 11.8k tokens, 20 files, 42.5KB
Cache: 20 hits, 0 misses (100.0% hit rate)
Completed in 0.18s
```

## Why contextcalc?

Perfect for developers working with LLMs who need to:

- **📊 Understand token usage** before sending code to LLMs
- **💰 Estimate API costs** for LLM operations  
- **🎯 Optimize context** by identifying large files
- **⚖️ Balance completeness vs. limits** when including code in prompts
- **🚀 Work efficiently** with fast analysis and smart caching

Built with performance in mind:
- **Smart Caching**: MD5-based change detection avoids re-computation
- **Parallel Processing**: Concurrent file analysis for speed
- **Selective Analysis**: Only processes relevant file types
- **Ignore Support**: Respects .gitignore and common ignore patterns

## Key Features

### 🎯 **Enhanced Visualization**
- **Visual Weight Bars**: Color-coded bars show relative token density (enabled by default)
- **File Sizes**: Displays both token count and actual file size (KB/MB) 
- **Percentage Display**: Shows each file/folder as percentage of parent directory
- **Color Coding**: Red (high), Yellow (medium), Blue (low), Gray (minimal) token density

### ⚡ **Smart Analysis**
- **Intelligent Sorting**: Sort by tokens, file size, or alphabetically
- **Depth Control**: Limit analysis depth for large codebases
- **Token Filtering**: Hide files below minimum token thresholds
- **Mode Selection**: Focus on code, documentation, or all files

### 🛠️ **Flexible Output**
- **Enhanced Mode**: Rich visualization with bars and colors (default)
- **Clean Mode**: Simple output for scripts and CI environments
- **JSON Export**: Structured data for programmatic use
- **Performance**: Smart caching avoids re-computation on subsequent runs

## Development

This project was built with [Bun](https://bun.com) for optimal performance.

### Setup
```bash
bun install
```

### Development
```bash
bun run dev [path] [options]
```

### Build
```bash
bun run build
```

### Test
```bash
bun test
```

## License

MIT
