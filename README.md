# contextcalc

A fast CLI tool for analyzing codebase structure and token counts for LLM context management.

## Installation

```bash
npm install -g contextcalc
# or
npx contextcalc [path] [options]
```

## Quick Start

```bash
# Clean tree view with absolute percentages (default)
contextcalc .

# Flat file list sorted by token count  
contextcalc . --output flat

# Enhanced view with visual bars
contextcalc . --bars
```

## Output Formats

### Tree View (default)
Shows hierarchical structure with absolute percentages:
```bash
contextcalc . --depth 2
```
```
. (11.8k tokens, 42.5KB) (100.0%)
├── src (9.0k tokens, 35.1KB) (76.3%)
├── bun.lock (1.4k tokens, 2.6KB) (11.9%)
├── test (812 tokens, 3.0KB) (6.9%)
└── package.json (313 tokens, 924B) (2.7%)

Summary: 11.8k tokens, 20 files, 42.5KB
Cache: 20 hits, 0 misses (100.0% hit rate)
Completed in 0.18s
```

### Enhanced Tree View
Add visual bars for extra clarity:
```bash
contextcalc . --bars --depth 2
```
```
[██████████] . (11.8k tokens, 42.5KB) (100.0%)
├── [████████░░] src (9.0k tokens, 35.1KB) (76.3%)
├── [█░░░░░░░░░] bun.lock (1.4k tokens, 2.6KB) (11.9%)
├── [█░░░░░░░░░] test (812 tokens, 3.0KB) (6.9%)
└── [░░░░░░░░░░] package.json (313 tokens, 924B) (2.7%)
```

### Flat View
Lists all files sorted by token count (perfect for finding large files):
```bash
contextcalc . --output flat --min-tokens 500
```
```
src/formatters/enhancedTreeFormatter.ts 1.8k tokens, 226 lines, 6.5KB (13.1%)
src/core/scanner.ts 1.5k tokens, 226 lines, 6.7KB (11.5%)
bun.lock 1.4k tokens, 48 lines, 2.6KB (10.1%)
src/cli.ts 1.2k tokens, 131 lines, 5.3KB (9.3%)
src/utils/fileDetector.ts 922 tokens, 123 lines, 3.0KB (6.7%)
```

### JSON Output
Structured data for scripts and automation:
```bash
contextcalc . --output json
```

## Key Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <format>` | Output format: `tree`, `flat`, `json` | `tree` |
| `--percentages` | Show absolute percentages (enabled by default) | `true` |
| `--no-percentages` | Disable percentage display | |
| `--relative-percentages` | Show percentages relative to parent directory | `false` |
| `--bars` | Show visual weight bars | `false` |
| `--depth <n>` | Maximum tree depth | unlimited |
| `--min-tokens <n>` | Hide files with fewer tokens | `0` |
| `--sort <by>` | Sort by: `tokens`, `size`, `name` | `tokens` |
| `--mode <mode>` | Files to analyze: `all`, `code`, `docs` | `all` |

## Usage Examples

```bash
# Find largest files in project
contextcalc . -o flat --min-tokens 1000

# Show relative percentages (percentage of parent directory)
contextcalc . --relative-percentages --depth 2

# Enhanced view with visual bars
contextcalc . --bars --depth 2

# Clean output without percentages/colors
contextcalc . --no-percentages --no-colors

# Analyze only source code files
contextcalc . --mode code

# Analyze only documentation
contextcalc ./docs --mode docs

# Export data for analysis
contextcalc . -o json > analysis.json
```

## Why contextcalc?

**Perfect for LLM workflows:**
- 📊 **Understand token usage** before sending code to LLMs
- 💰 **Estimate API costs** for different context sizes
- 🎯 **Find optimization targets** with flat view ranking
- ⚖️ **Balance context** between completeness and token limits

**Built for speed:**
- ⚡ **Smart caching** with MD5-based change detection
- 🚀 **Parallel processing** for large codebases
- 🎛️ **Flexible filtering** by tokens, depth, file types
- 🚫 **Intelligent ignoring** via .gitignore and built-in patterns

## License

MIT