# ContextCalc Library Documentation

Complete API reference and integration guide for using ContextCalc as a library.

> 🏠 **Back to main README**: [README.md](./README.md)

## Table of Contents

- [API Reference](#api-reference)
  - [Core Functions](#core-functions)
  - [Utility Functions](#utility-functions)
  - [Convenience Aliases](#convenience-aliases)
  - [Types & Interfaces](#types--interfaces)
- [Advanced Options](#advanced-options)
- [Error Handling & Edge Cases](#error-handling--edge-cases)
- [Performance & Best Practices](#performance--best-practices)
- [Utility Functions](#utility-functions-1)
- [Real-World Use Cases & Integration Examples](#real-world-use-cases--integration-examples)
- [Quick Reference](#quick-reference)

## API Reference

### Core Functions

| Function | Description | Input Types | Return Type |
|----------|-------------|-------------|-------------|
| `countTokens(input)` | Count tokens in any supported input | `string \| object \| Buffer \| number \| boolean` | `number` |
| `countTokensWithOptions(input, options?)` | Count tokens with detailed options | `TokenInput, TokenCountOptions?` | `TokenCountResult` |
| `countTokensBatch(inputs)` | Count tokens for multiple inputs | `TokenInput[]` | `number[]` |
| `countTokensFromFile(filePath)` | Count tokens in a file | `string` | `Promise<number>` |
| `countTokensFromFileWithOptions(filePath, options?)` | Count tokens in a file with options | `string, TokenCountOptions?` | `Promise<TokenCountResult>` |

### Utility Functions

| Function | Description | Return Type |
|----------|-------------|-------------|
| `dispose()` | Clean up tokenizer resources | `void` |
| `getTokenizerInfo()` | Get tokenizer information | `{ encoding: string }` |
| `estimateTokens(input)` | Quick token estimation (~4 chars/token) | `number` |

### Convenience Aliases

| Function | Equivalent To | Return Type |
|----------|---------------|-------------|
| `count(input)` | `countTokens(input)` | `number` |
| `countJson(input)` | `countTokens(input)` | `number` |
| `countWithLines(input)` | `countTokensWithOptions(input, {includeLines: true})` | `{tokens: number, lines: number}` |
| `countFormatted(input)` | `countTokensWithOptions(input, {format: 'formatted'})` | `{tokens: number, formatted: string}` |

### Types & Interfaces

```typescript
// Input types supported by all counting functions
type TokenInput = string | object | Buffer | number | boolean;

// Options for advanced counting functions
interface TokenCountOptions {
  format?: 'raw' | 'formatted';    // Return formatted token count (e.g., "1.2k")
  includeLines?: boolean;          // Include line count in result
}

// Detailed result object
interface TokenCountResult {
  tokens: number;                  // Raw token count
  lines?: number;                  // Line count (if includeLines: true)
  formatted?: string;              // Formatted count (if format: 'formatted')
}

// Additional exported types
interface FileStats { 
  path: string; 
  hash: string; 
  tokens: number; 
  lines: number; 
  size: number; 
  isDirectory: boolean; 
  filetype?: string; 
}

interface ScanResult { 
  nodes: Node[]; 
  totalTokens: number; 
  totalFiles: number; 
  cacheHits: number; 
  cacheMisses: number; 
}
```

## Advanced Options

```javascript
import { 
  countTokensWithOptions, 
  countTokensBatch,
  countTokensFromFile,
  countTokensFromFileWithOptions
} from 'contextcalc';

// Basic options - raw format (default)
const basicResult = countTokensWithOptions("Hello, world!");
console.log(basicResult); // { tokens: 4 }

// Include line count
const withLines = countTokensWithOptions("Line 1\nLine 2\nLine 3", {
  includeLines: true
});
console.log(withLines); // { tokens: 8, lines: 3 }

// Formatted output (human-readable)
const formatted = countTokensWithOptions("A".repeat(5000), {
  format: 'formatted'
});
console.log(formatted); // { tokens: 1250, formatted: "1.3k" }

// Combined options - both lines and formatting
const fullResult = countTokensWithOptions(`{
  "name": "ContextCalc",
  "description": "Token counting tool",
  "features": ["CLI", "Library", "Fast"]
}`, {
  includeLines: true,
  format: 'formatted'
});
console.log(fullResult); 
// { tokens: 42, lines: 5, formatted: "42" }

// Batch processing with multiple input types
const inputs = [
  "Hello, world!",                    // string
  { message: "test", id: 123 },      // object  
  Buffer.from("Buffer content"),      // buffer
  42,                                 // number
  ["array", "of", "strings"]         // array
];
const batchResults = countTokensBatch(inputs);
console.log(batchResults); // [4, 12, 3, 1, 11]

// File processing - simple token count
const fileTokens = await countTokensFromFile('./package.json');
console.log(fileTokens); // 156

// File processing with options
const fileWithOptions = await countTokensFromFileWithOptions('./README.md', {
  includeLines: true,
  format: 'formatted'
});
console.log(fileWithOptions);
// { tokens: 2847, lines: 167, formatted: "2.8k" }

// Large file processing
const largeFileResult = await countTokensFromFileWithOptions('./large-dataset.json', {
  format: 'formatted'
});
console.log(largeFileResult); // { tokens: 245678, formatted: "245.7k" }
```

## Error Handling & Edge Cases

```javascript
import { 
  countTokens, 
  countTokensFromFile,
  dispose 
} from 'contextcalc';

// Input validation - invalid types throw errors
try {
  countTokens(null);  // ❌ Throws error
} catch (error) {
  console.error(error.message); // "Unsupported input type: object"
}

try {
  countTokens(undefined);  // ❌ Throws error  
} catch (error) {
  console.error(error.message); // "Unsupported input type: undefined"
}

// File errors - async functions handle file issues gracefully
try {
  const tokens = await countTokensFromFile('./non-existent-file.txt');
} catch (error) {
  console.error('File error:', error.message);
  // "Failed to count tokens for ./non-existent-file.txt: ENOENT: no such file or directory"
}

try {
  const tokens = await countTokensFromFile('/restricted/file.txt');
} catch (error) {
  console.error('Permission error:', error.message);
  // "Failed to count tokens for /restricted/file.txt: EACCES: permission denied"
}

// Large inputs - library handles them efficiently
const veryLargeText = "Hello ".repeat(100000);  // 500k+ characters
const tokens = countTokens(veryLargeText);       // Works efficiently
console.log(tokens); // ~125000

// Memory management for long-running processes
function processDocuments(documents) {
  try {
    return documents.map(doc => ({
      id: doc.id,
      tokens: countTokens(doc.content)
    }));
  } finally {
    // Clean up tokenizer resources in long-running processes
    dispose();
  }
}

// Circular reference handling (JSON.stringify limitation)
const circularObj = { name: "test" };
circularObj.self = circularObj;

try {
  countTokens(circularObj);  // ❌ Throws error
} catch (error) {
  console.error('Circular reference detected');
  // Use a custom serialization strategy for complex objects
}

// Safe object counting with error handling
function safeCountTokens(input) {
  try {
    return { success: true, tokens: countTokens(input) };
  } catch (error) {
    return { success: false, error: error.message, tokens: 0 };
  }
}

// Binary file handling
const binaryBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47]); // PNG header
const binaryTokens = countTokens(binaryBuffer);
console.log(binaryTokens); // Counts based on buffer content

// Very long lines don't break the tokenizer
const longLine = "word ".repeat(50000);  // 250k characters, single line
const result = countTokensWithOptions(longLine, { includeLines: true });
console.log(result); // { tokens: ~62500, lines: 1 }
```

## Performance & Best Practices

```javascript
import { 
  countTokens,
  countTokensBatch, 
  estimateTokens,
  dispose,
  getTokenizerInfo
} from 'contextcalc';

// 🚀 Use estimateTokens() for quick filtering
const documents = [
  "Short text",
  "Medium length text with more content",
  "Very long document ".repeat(1000)
];

// Fast pre-filtering with estimation
const quickFilter = documents.filter(doc => estimateTokens(doc) < 2000);
console.log(`Filtered ${documents.length} to ${quickFilter.length} documents`);

// Then accurate counting on filtered set
const accurateCounts = countTokensBatch(quickFilter);

// 📦 Batch processing is more efficient than individual calls
// ❌ Inefficient - multiple tokenizer instances
const individualResults = documents.map(doc => countTokens(doc));

// ✅ Efficient - single tokenizer instance
const batchResults = countTokensBatch(documents);

// 🔄 Reuse tokenizer instance (singleton pattern)
// The library automatically reuses the same tokenizer instance
const result1 = countTokens("First text");   // Creates tokenizer
const result2 = countTokens("Second text");  // Reuses tokenizer
const result3 = countTokens("Third text");   // Reuses tokenizer

// 🧹 Memory cleanup for long-running processes
function processLargeDataset(data) {
  try {
    // Process thousands of documents
    return data.map(item => ({
      id: item.id,
      tokens: countTokens(item.content),
      summary: item.content.substring(0, 100)
    }));
  } finally {
    // Important: Clean up in long-running services
    dispose();
  }
}

// 📊 Choose the right function for your use case
const text = "Sample text for demonstration";

// Basic counting (most common)
const simpleCount = countTokens(text);                           // Fast

// With line counting (when you need both metrics)  
const withLines = countTokensWithOptions(text, { 
  includeLines: true 
});                                                              // Slightly slower

// With formatting (for display purposes)
const formatted = countTokensWithOptions(text, { 
  format: 'formatted' 
});                                                              // Minimal overhead

// Quick estimation (fastest, ~80% accuracy)
const estimate = estimateTokens(text);                          // Fastest

// 🎯 Optimize for your specific use case
class TokenManager {
  constructor() {
    this.cache = new Map();
  }
  
  // Cache results for repeated content
  countWithCache(text) {
    const hash = this.simpleHash(text);
    if (this.cache.has(hash)) {
      return this.cache.get(hash);
    }
    
    const tokens = countTokens(text);
    this.cache.set(hash, tokens);
    return tokens;
  }
  
  // Use estimation for large batches where precision isn't critical
  bulkEstimate(documents) {
    return documents.map(doc => ({
      id: doc.id,
      estimatedTokens: estimateTokens(doc.content),
      isPotentiallyLarge: estimateTokens(doc.content) > 4000
    }));
  }
  
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
  
  cleanup() {
    this.cache.clear();
    dispose();
  }
}

// 📈 Performance monitoring
function measureTokenizing(text, iterations = 1000) {
  const start = Date.now();
  
  for (let i = 0; i < iterations; i++) {
    countTokens(text);
  }
  
  const duration = Date.now() - start;
  const avgTime = duration / iterations;
  
  console.log(`Average time per tokenization: ${avgTime.toFixed(2)}ms`);
  return avgTime;
}

// 🔍 Get tokenizer information for debugging
const info = getTokenizerInfo();
console.log(`Using encoding: ${info.encoding}`); // "o200k_base"

// 💡 Pro tips:
// 1. Use estimateTokens() for initial filtering
// 2. Use countTokensBatch() for multiple inputs
// 3. Call dispose() in long-running processes
// 4. Cache results for repeated content
// 5. Consider the trade-off between speed and accuracy
```

## Utility Functions

```javascript
import { 
  getTokenizerInfo, 
  dispose,
  version 
} from 'contextcalc';

// Check tokenizer information
const tokenizerInfo = getTokenizerInfo();
console.log(tokenizerInfo); // { encoding: "o200k_base" }

// Get library version
console.log(`ContextCalc version: ${version}`); // "1.1.0"

// Memory cleanup (important for long-running processes)
dispose(); // Frees tokenizer resources

// Example: Health check endpoint
app.get('/health', (req, res) => {
  const info = getTokenizerInfo();
  res.json({
    service: 'token-counter',
    version: version,
    tokenizer: info.encoding,
    status: 'healthy'
  });
});

// Example: Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Cleaning up resources...');
  dispose();
  process.exit(0);
});
```

## Real-World Use Cases & Integration Examples

### 🌐 Web API & Microservices

**Express.js API endpoint:**
```javascript
import express from 'express';
import { countTokens, countTokensWithOptions } from 'contextcalc';

const app = express();
app.use(express.json());

// Basic token counting endpoint
app.post('/api/count-tokens', (req, res) => {
  const { text } = req.body;
  const tokens = countTokens(text);
  res.json({ tokens });
});

// Advanced endpoint with options
app.post('/api/analyze-text', (req, res) => {
  const { text, includeLines = false } = req.body;
  const result = countTokensWithOptions(text, {
    includeLines,
    format: 'formatted'
  });
  res.json(result);
});
```

**Content validation middleware:**
```javascript
import { countTokens, estimateTokens } from 'contextcalc';

function validateTokenLimit(maxTokens = 4000) {
  return (req, res, next) => {
    const content = JSON.stringify(req.body);
    
    // Quick estimation first
    const estimate = estimateTokens(content);
    if (estimate > maxTokens * 1.2) {
      return res.status(413).json({
        error: `Content too large: ~${estimate} tokens (max: ${maxTokens})`
      });
    }
    
    // Accurate count for borderline cases
    const tokens = countTokens(content);
    if (tokens > maxTokens) {
      return res.status(413).json({
        error: `Content too large: ${tokens} tokens (max: ${maxTokens})`
      });
    }
    
    req.tokenCount = tokens;
    next();
  };
}
```

### 🤖 LLM Context Management

**Context window optimization:**
```javascript
import { countTokens, countTokensBatch } from 'contextcalc';

class ContextManager {
  constructor(maxContextTokens = 8000, systemPromptTokens = 500) {
    this.maxContextTokens = maxContextTokens;
    this.systemPromptTokens = systemPromptTokens;
    this.availableTokens = maxContextTokens - systemPromptTokens;
  }
  
  optimizeMessages(messages) {
    const tokenCounts = countTokensBatch(messages.map(m => m.content));
    let totalTokens = 0;
    const optimizedMessages = [];
    
    // Include messages from newest to oldest until token limit
    for (let i = messages.length - 1; i >= 0; i--) {
      const messageTokens = tokenCounts[i];
      if (totalTokens + messageTokens <= this.availableTokens) {
        optimizedMessages.unshift(messages[i]);
        totalTokens += messageTokens;
      } else {
        break;
      }
    }
    
    return {
      messages: optimizedMessages,
      usedTokens: totalTokens,
      remainingTokens: this.availableTokens - totalTokens
    };
  }
}
```

**Document chunking for RAG:**
```javascript
import { countTokens } from 'contextcalc';

function chunkDocument(text, maxChunkTokens = 1000, overlapTokens = 100) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const chunks = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const testChunk = currentChunk + sentence + '.';
    const tokens = countTokens(testChunk);
    
    if (tokens <= maxChunkTokens) {
      currentChunk = testChunk;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        
        // Add overlap for context
        const words = currentChunk.split(' ');
        const overlapStart = Math.max(0, words.length - overlapTokens);
        currentChunk = words.slice(overlapStart).join(' ') + sentence + '.';
      } else {
        currentChunk = sentence + '.';
      }
    }
  }
  
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}
```

### 💰 Cost Estimation & Rate Limiting

**API cost calculator:**
```javascript
import { countTokens } from 'contextcalc';

class LLMCostCalculator {
  constructor() {
    this.pricing = {
      'gpt-4': { input: 0.03, output: 0.06 }, // per 1k tokens
      'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
      'claude-3': { input: 0.015, output: 0.075 }
    };
  }
  
  estimateCost(inputText, expectedOutputTokens, model = 'gpt-4') {
    const inputTokens = countTokens(inputText);
    const rates = this.pricing[model];
    
    const inputCost = (inputTokens / 1000) * rates.input;
    const outputCost = (expectedOutputTokens / 1000) * rates.output;
    
    return {
      inputTokens,
      expectedOutputTokens,
      inputCost: inputCost.toFixed(4),
      outputCost: outputCost.toFixed(4),
      totalCost: (inputCost + outputCost).toFixed(4),
      model
    };
  }
}
```

**Rate limiting by tokens:**
```javascript
import { countTokens } from 'contextcalc';

class TokenRateLimiter {
  constructor(maxTokensPerHour = 100000) {
    this.maxTokensPerHour = maxTokensPerHour;
    this.tokenCounts = new Map(); // userId -> { tokens, resetTime }
  }
  
  checkLimit(userId, content) {
    const tokens = countTokens(content);
    const now = Date.now();
    const hourStart = Math.floor(now / 3600000) * 3600000;
    
    if (!this.tokenCounts.has(userId) || this.tokenCounts.get(userId).resetTime !== hourStart) {
      this.tokenCounts.set(userId, { tokens: 0, resetTime: hourStart });
    }
    
    const userData = this.tokenCounts.get(userId);
    
    if (userData.tokens + tokens > this.maxTokensPerHour) {
      return {
        allowed: false,
        tokensUsed: userData.tokens,
        tokensRequested: tokens,
        limit: this.maxTokensPerHour,
        resetTime: hourStart + 3600000
      };
    }
    
    userData.tokens += tokens;
    return { allowed: true, tokensUsed: userData.tokens, limit: this.maxTokensPerHour };
  }
}
```

### 📊 Data Processing & Analytics

**Batch document analysis:**
```javascript
import { countTokensBatch, countTokensFromFile } from 'contextcalc';
import { glob } from 'glob';

async function analyzeCodebase(projectPath) {
  const files = await glob(`${projectPath}/**/*.{js,ts,tsx,jsx,py,java,cpp}`, {
    ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**']
  });
  
  const results = await Promise.all(
    files.map(async file => {
      const tokens = await countTokensFromFile(file);
      const stats = await fs.stat(file);
      
      return {
        file: file.replace(projectPath, ''),
        tokens,
        size: stats.size,
        tokensPerByte: tokens / stats.size,
        category: getFileCategory(file)
      };
    })
  );
  
  return {
    totalFiles: results.length,
    totalTokens: results.reduce((sum, r) => sum + r.tokens, 0),
    averageTokensPerFile: Math.round(results.reduce((sum, r) => sum + r.tokens, 0) / results.length),
    largestFiles: results.sort((a, b) => b.tokens - a.tokens).slice(0, 10),
    byCategory: groupBy(results, 'category')
  };
}

function getFileCategory(filePath) {
  const ext = filePath.split('.').pop();
  const categories = {
    'js,jsx,ts,tsx': 'JavaScript/TypeScript',
    'py': 'Python',
    'java': 'Java',
    'cpp,c,h': 'C/C++'
  };
  
  for (const [exts, category] of Object.entries(categories)) {
    if (exts.split(',').includes(ext)) return category;
  }
  return 'Other';
}
```

### 🔧 CI/CD Integration

**GitHub Actions workflow:**
```javascript
// .github/workflows/token-analysis.yml companion script
import { countTokensFromFile } from 'contextcalc';
import fs from 'fs/promises';

async function generateTokenReport() {
  const files = process.argv.slice(2);
  const results = [];
  
  for (const file of files) {
    try {
      const tokens = await countTokensFromFile(file);
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n').length;
      
      results.push({
        file,
        tokens,
        lines,
        tokensPerLine: (tokens / lines).toFixed(2)
      });
    } catch (error) {
      console.error(`Failed to analyze ${file}:`, error.message);
    }
  }
  
  // Generate markdown report for GitHub
  const report = generateMarkdownReport(results);
  await fs.writeFile('token-report.md', report);
  
  // Set output for GitHub Actions
  console.log(`::set-output name=total-tokens::${results.reduce((sum, r) => sum + r.tokens, 0)}`);
}

function generateMarkdownReport(results) {
  const totalTokens = results.reduce((sum, r) => sum + r.tokens, 0);
  
  return `# Token Analysis Report
  
**Total Tokens:** ${totalTokens.toLocaleString()}
**Files Analyzed:** ${results.length}
**Average Tokens per File:** ${Math.round(totalTokens / results.length)}

## Largest Files

${results
  .sort((a, b) => b.tokens - a.tokens)
  .slice(0, 10)
  .map(r => `- **${r.file}**: ${r.tokens} tokens (${r.lines} lines)`)
  .join('\n')}
`;
}
```

### 🎯 Specialized Use Cases

**Chat application with message chunking:**
```javascript
import { countTokens, countTokensBatch } from 'contextcalc';

class ChatMessageProcessor {
  constructor(maxMessageTokens = 500) {
    this.maxMessageTokens = maxMessageTokens;
  }
  
  processMessage(text) {
    const tokens = countTokens(text);
    
    if (tokens <= this.maxMessageTokens) {
      return [{ text, tokens }];
    }
    
    // Split long messages
    const words = text.split(' ');
    const chunks = [];
    let currentChunk = '';
    
    for (const word of words) {
      const testChunk = currentChunk ? `${currentChunk} ${word}` : word;
      if (countTokens(testChunk) <= this.maxMessageTokens) {
        currentChunk = testChunk;
      } else {
        if (currentChunk) {
          chunks.push({ text: currentChunk, tokens: countTokens(currentChunk) });
        }
        currentChunk = word;
      }
    }
    
    if (currentChunk) {
      chunks.push({ text: currentChunk, tokens: countTokens(currentChunk) });
    }
    
    return chunks;
  }
}
```

**Content moderation with token limits:**
```javascript
import { countTokens, estimateTokens } from 'contextcalc';

class ContentModerator {
  constructor() {
    this.limits = {
      comment: 200,
      post: 1000,
      article: 5000
    };
  }
  
  validateContent(content, type = 'comment') {
    const limit = this.limits[type];
    
    // Quick check with estimation
    const estimate = estimateTokens(content);
    if (estimate > limit * 1.1) {
      return {
        valid: false,
        reason: 'Content too long',
        tokens: estimate,
        limit,
        isEstimate: true
      };
    }
    
    // Accurate check for borderline cases
    const tokens = countTokens(content);
    return {
      valid: tokens <= limit,
      reason: tokens > limit ? 'Content exceeds token limit' : null,
      tokens,
      limit,
      isEstimate: false
    };
  }
}
```

## Using contextcalc in Bundled Applications

If you're bundling an application that depends on contextcalc, you may encounter issues with tiktoken's WebAssembly module loading. This happens because tiktoken uses a `.wasm` file that needs special handling during bundling.

### The Problem

When bundlers process contextcalc, they may try to bundle tiktoken's WebAssembly file (`tiktoken_bg.wasm`), which can lead to:

- **Runtime errors**: "Cannot resolve module" or "WASM file not found"
- **Build failures**: Missing or incorrectly bundled `.wasm` files  
- **Path resolution issues**: Hardcoded paths becoming incorrect after bundling

### Solution: Mark tiktoken as External

The recommended solution is to mark `tiktoken` as external in your bundler configuration, allowing Node.js to resolve it correctly at runtime.

#### Bun

```bash
# CLI
bun build src/index.ts --external tiktoken --target node

# For multiple externals
bun build src/index.ts --external tiktoken --external other-package --target node
```

**bunfig.toml configuration:**
```toml
[build]
target = "node"
external = ["tiktoken"]
```

**TypeScript build script:**
```typescript
// build.ts
import { build } from 'bun';

await build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'node',
  external: ['tiktoken'],
  format: 'esm'
});
```

#### Webpack

**webpack.config.js:**
```javascript
module.exports = {
  externals: {
    'tiktoken': 'commonjs tiktoken'
  },
  target: 'node',
  // ... other config
};
```

**For ES modules:**
```javascript
module.exports = {
  externals: {
    'tiktoken': 'module tiktoken'
  },
  experiments: {
    outputModule: true
  },
  // ... other config
};
```

#### esbuild

```bash
# CLI
esbuild src/index.ts --external:tiktoken --platform=node --outfile=dist/index.js

# For ES modules
esbuild src/index.ts --external:tiktoken --platform=node --format=esm --outfile=dist/index.js
```

**Build script:**
```javascript
// build.js
import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  external: ['tiktoken'],
  outfile: 'dist/index.js'
});
```

#### Rollup

**rollup.config.js:**
```javascript
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.js',
    format: 'esm'
  },
  external: ['tiktoken'],
  plugins: [nodeResolve()]
};
```

#### Vite

**vite.config.js:**
```javascript
export default {
  build: {
    rollupOptions: {
      external: ['tiktoken']
    },
    target: 'node18'
  }
};
```

#### Parcel

**package.json:**
```json
{
  "targets": {
    "main": {
      "includeNodeModules": {
        "tiktoken": false
      }
    }
  }
}
```

### Alternative: Include tiktoken in Dependencies

If your package will be distributed via npm, ensure tiktoken is listed in your dependencies (not devDependencies):

```json
{
  "dependencies": {
    "contextcalc": "^1.3.3",
    "tiktoken": "^1.0.17"
  }
}
```

This ensures tiktoken and its WASM file are available when users install your package.

### Docker and Container Considerations

When containerizing applications that use contextcalc:

**Dockerfile example:**
```dockerfile
FROM node:18-alpine

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Important: Don't bundle tiktoken in multi-stage builds
# Keep it as a runtime dependency
CMD ["node", "dist/index.js"]
```

**Multi-stage build with bundling:**
```dockerfile
# Build stage
FROM node:18-alpine AS builder
COPY package*.json ./
RUN npm ci
COPY . .
# Ensure tiktoken is external
RUN npm run build

# Runtime stage  
FROM node:18-alpine
# Copy built files AND node_modules (for tiktoken)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
CMD ["node", "dist/index.js"]
```

### Troubleshooting

#### Common Error Messages

**"Cannot resolve module tiktoken"**
- ✅ Mark tiktoken as external in bundler config
- ✅ Ensure tiktoken is in dependencies, not devDependencies

**"tiktoken_bg.wasm not found"**
- ✅ Don't bundle the WASM file - let Node.js resolve it
- ✅ Check that node_modules/tiktoken exists in runtime environment

**"Module not found: Can't resolve 'tiktoken'"** 
- ✅ Install tiktoken: `npm install tiktoken`
- ✅ Verify tiktoken version compatibility (>=1.0.17)

#### Debugging Steps

1. **Verify tiktoken installation:**
```bash
npm list tiktoken
# Should show tiktoken@1.0.17 or higher
```

2. **Test tiktoken directly:**
```javascript
// test-tiktoken.js
import { encoding_for_model } from 'tiktoken';
const enc = encoding_for_model('gpt-4');
console.log('Tiktoken working:', enc.encode('test').length);
```

3. **Check bundle contents:**
```bash
# For webpack bundles
npx webpack-bundle-analyzer dist/main.js

# Check if tiktoken is excluded
grep -r "tiktoken" dist/
```

4. **Runtime verification:**
```javascript
// Add to your app for debugging
try {
  const { countTokens } = await import('contextcalc');
  console.log('ContextCalc loaded successfully');
} catch (error) {
  console.error('ContextCalc loading failed:', error.message);
}
```

### Framework-Specific Examples

#### Next.js

**next.config.js:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('tiktoken');
    }
    return config;
  }
};

module.exports = nextConfig;
```

#### Nuxt.js

**nuxt.config.js:**
```javascript
export default {
  build: {
    extend(config, { isServer }) {
      if (isServer) {
        config.externals = config.externals || [];
        config.externals.push('tiktoken');
      }
    }
  }
};
```

#### SvelteKit

**vite.config.js:**
```javascript
import { sveltekit } from '@sveltejs/kit/vite';

export default {
  plugins: [sveltekit()],
  build: {
    rollupOptions: {
      external: ['tiktoken']
    }
  }
};
```

### Electron Applications

For Electron apps, handle main and renderer processes differently:

**Main process (Node.js):**
```javascript
// webpack.main.config.js
module.exports = {
  target: 'electron-main',
  externals: {
    'tiktoken': 'commonjs tiktoken'
  }
};
```

**Renderer process (if using Node.js integration):**
```javascript  
// webpack.renderer.config.js
module.exports = {
  target: 'electron-renderer',
  externals: {
    'tiktoken': 'commonjs tiktoken'
  }
};
```

### Testing Bundled Applications

**Test your bundled app:**
```javascript
// test-bundle.js
import { countTokens } from './dist/your-bundled-app.js';

const testCases = [
  'Hello, world!',
  { message: 'test', data: [1, 2, 3] },
  'A'.repeat(1000)
];

testCases.forEach((test, i) => {
  try {
    const tokens = countTokens(test);
    console.log(`Test ${i + 1}: ${tokens} tokens ✅`);
  } catch (error) {
    console.error(`Test ${i + 1}: Failed ❌`, error.message);
  }
});
```

**Automated testing in CI/CD:**
```bash
# GitHub Actions example
- name: Test bundled application
  run: |
    npm run build
    node test-bundle.js
    if [ $? -eq 0 ]; then
      echo "Bundle test passed ✅"
    else
      echo "Bundle test failed ❌"
      exit 1
    fi
```

### Performance Considerations

**Bundle size analysis:**
```bash
# Check that tiktoken isn't bundled
npx bundlesize

# Verify external dependencies
npm run build && ls -la dist/
```

**Load time optimization:**
```javascript
// Lazy load contextcalc to improve startup time
const getTokenCounter = async () => {
  const { countTokens } = await import('contextcalc');
  return countTokens;
};

// Use in async context
const countTokens = await getTokenCounter();
const tokens = countTokens('Hello, world!');
```

### Why This Approach Works

1. **Runtime Resolution**: Node.js resolves tiktoken from node_modules at runtime
2. **WASM Handling**: tiktoken handles its own WASM file loading
3. **Path Correctness**: No hardcoded bundle paths to break
4. **Module Compatibility**: Works with both CommonJS and ES modules
5. **Container Friendly**: Works in Docker and serverless environments

By following these patterns, your bundled applications will reliably work with contextcalc while maintaining optimal bundle size and performance.

## Quick Reference

### Function Selection Guide

| **Use Case** | **Recommended Function** | **Example** |
|--------------|---------------------------|-------------|
| Simple token counting | `countTokens(input)` | `countTokens("Hello")` → `2` |
| Need line count too | `countWithLines(input)` | `countWithLines("Hi\nBye")` → `{tokens: 3, lines: 2}` |
| Display to users | `countFormatted(input)` | `countFormatted(longText)` → `{tokens: 5000, formatted: "5.0k"}` |
| Multiple inputs | `countTokensBatch(inputs)` | `countTokensBatch(["a", "b"])` → `[1, 1]` |
| Quick estimation | `estimateTokens(input)` | `estimateTokens("text")` → `1` |
| File processing | `countTokensFromFile(path)` | `await countTokensFromFile("file.txt")` → `150` |
| Advanced options | `countTokensWithOptions(input, opts)` | Full control over output format |

### Input Type Compatibility

| **Input Type** | **Example** | **All Functions** | **Notes** |
|----------------|-------------|-------------------|-----------|
| **String** | `"Hello, world!"` | ✅ | Most common use case |
| **Object** | `{key: "value"}` | ✅ | Auto-serialized to JSON |
| **Array** | `[1, 2, 3]` | ✅ | Auto-serialized to JSON |
| **Number** | `42` | ✅ | Converted to string |
| **Boolean** | `true` | ✅ | Converted to string |
| **Buffer** | `Buffer.from("text")` | ✅ | Converted to UTF-8 string |
| **null/undefined** | `null` | ❌ | Throws error |

### Options Quick Reference

```typescript
interface TokenCountOptions {
  format?: 'raw' | 'formatted';    // 'raw': 1234, 'formatted': "1.2k"  
  includeLines?: boolean;          // Add line count to result
}

interface TokenCountResult {
  tokens: number;                  // Always present
  lines?: number;                  // If includeLines: true
  formatted?: string;              // If format: 'formatted'
}
```

### Performance Comparison

| **Function** | **Speed** | **Accuracy** | **When to Use** |
|--------------|-----------|--------------|-----------------|
| `estimateTokens()` | 🚀🚀🚀 | ~80% | Pre-filtering, rough estimates |
| `countTokens()` | 🚀🚀 | 100% | Most common use case |
| `countTokensBatch()` | 🚀🚀 | 100% | Multiple inputs efficiently |
| `countTokensWithOptions()` | 🚀 | 100% | When you need extra metadata |
| `countTokensFromFile()` | 🚀 | 100% | File processing |

### Common Patterns

```javascript
// ✅ Efficient patterns
const results = countTokensBatch(inputs);              // Batch processing
const estimate = estimateTokens(text);                 // Quick filtering
const detailed = countTokensWithOptions(text, opts);   // Full details

// ❌ Avoid these patterns  
inputs.map(i => countTokens(i));                      // Use countTokensBatch instead
countTokens(JSON.stringify(obj));                     // Just pass obj directly
```