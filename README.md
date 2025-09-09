# ContextCalc 📏

#### `tree` like CLI tool but with token counts.

![GitHub License](https://img.shields.io/github/license/agentinit/contextcalc)
![NPM Unpacked Size](https://img.shields.io/npm/unpacked-size/contextcalc)
![NPM Version](https://img.shields.io/npm/v/contextcalc)
![NPM Downloads](https://img.shields.io/npm/dm/contextcalc)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/agentinit/contextcalc/release.yml?logo=github)



https://github.com/user-attachments/assets/3c9556b3-3876-46f7-9a44-707dd8c85000


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
npx contextcalc . --output flat --min-tokens 1000
```

### Single File Analysis  
Analyze individual files directly:
```bash
npx contextcalc README.md
npx contextcalc src/cli.ts --metrics tokens
npx contextcalc package.json --metrics lines,size --no-colors
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
. (11.8k tokens, 42.5KB) (100.0%)
├── src (9.0k tokens, 35.1KB) (76.3%)
├── bun.lock (1.4k tokens, 2.6KB) (11.9%)
├── test (812 tokens, 3.0KB) (6.9%)
└── package.json (313 tokens, 924B) (2.7%)

Summary: 11.8k tokens, 20 files, 42.5KB
Cache: 20 hits, 0 misses (100.0% hit rate)
Completed in 0.18s
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

## Key Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <format>` | Output format: `tree`, `flat`, `json` | `tree` |
| `--percentages` | Show absolute percentages (enabled by default) | `true` |
| `--no-percentages` | Disable percentage display | |
| `--relative-percentages` | Show percentages relative to parent directory | `false` |
| `--bars` | Show visual weight bars | `false` |
| `--depth <n>` | Tree depth levels (0=root only, 1=root+children, etc.) | unlimited |
| `--min-tokens <n>` | Hide files with fewer tokens | `0` |
| `--sort <by>` | Sort by: `tokens`, `size`, `name` | `tokens` |
| `--mode <mode>` | Files to analyze: `all`, `code`, `docs` | `all` |

## More examples

```bash
# Find largest files in project
npx contextcalc . -o flat --min-tokens 1000

# Show relative percentages (percentage of parent directory)
npx contextcalc . --relative-percentages --depth 2

# Enhanced view with visual bars
npx contextcalc . --bars --depth 2

# Clean output without percentages/colors
npx contextcalc . --no-percentages --no-colors

# Analyze only source code files
npx contextcalc . --mode code

# Analyze only documentation
npx contextcalc ./docs --mode docs

# Export data for analysis
npx contextcalc . -o json > analysis.json

# Single file with specific metrics
npx contextcalc package.json --metrics lines,size

# Clipboard analysis with custom metrics
npx contextcalc --from-clipboard --metrics tokens

# Stdin with custom formatting  
cat large-file.txt | npx contextcalc --metrics tokens,lines --no-colors

# Compare different input sources
npx contextcalc README.md --metrics tokens
cat README.md | npx contextcalc --metrics tokens
# Both should show the same token count!
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
