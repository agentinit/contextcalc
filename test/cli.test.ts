import { test, expect } from 'bun:test';
import { spawn } from 'bun';
import fs from 'node:fs/promises';
import path from 'node:path';

const CLI_PATH = path.join(__dirname, '../dist/cli.js');

// Helper to run CLI with input and capture output
async function runCLI(args: string[] = [], stdin?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = spawn(['node', CLI_PATH, ...args], {
    stdin: stdin ? 'pipe' : undefined,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  if (stdin && proc.stdin) {
    proc.stdin.write(stdin);
    proc.stdin.end();
  }

  const result = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();

  return {
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    exitCode: result || 0
  };
}

// Helper to create a temporary test file
async function createTempFile(content: string): Promise<string> {
  const tempDir = await fs.mkdtemp('/tmp/contextcalc-test-');
  const filePath = path.join(tempDir, 'test.txt');
  await fs.writeFile(filePath, content);
  return filePath;
}

// Cleanup temp files
async function cleanup(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
    await fs.rmdir(path.dirname(filePath));
  } catch {
    // Ignore cleanup errors
  }
}

test('stdin input - basic functionality', async () => {
  const result = await runCLI([], 'Hello world, this is test content.');
  
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain('stdin');
  expect(result.stdout).toContain('tokens');
  expect(result.stdout).toContain('lines');
  expect(result.stdout).toContain('B');
});

test('stdin input - metrics tokens only', async () => {
  const result = await runCLI(['--metrics', 'tokens'], 'Test content for tokens');
  
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toMatch(/stdin \(\d+ tokens\)$/);
  expect(result.stdout).not.toContain('lines');
  expect(result.stdout).not.toContain('B');
});

test('stdin input - metrics lines,size only', async () => {
  const result = await runCLI(['--metrics', 'lines,size'], 'Test content\nwith multiple lines');
  
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toMatch(/stdin \(\d+ lines, \d+B\)$/);
  expect(result.stdout).not.toContain('tokens');
});

test('stdin input - no colors', async () => {
  const result = await runCLI(['--no-colors'], 'Test content');
  
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toMatch(/^stdin \(/);
  // Should not contain ANSI color codes
  // eslint-disable-next-line no-control-regex
  expect(result.stdout).not.toMatch(/\x1b\[[0-9;]*m/);
});

test('stdin input - empty input', async () => {
  const result = await runCLI([], '');
  
  expect(result.exitCode).toBe(0);
  // Empty input is treated as no stdin, so it falls back to directory analysis
  expect(result.stdout).toContain('Summary:');
});

test('single file input - basic functionality', async () => {
  const tempFile = await createTempFile('This is test file content for single file processing.');
  
  try {
    const result = await runCLI([tempFile]);
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('test.txt');
    expect(result.stdout).toContain('tokens');
    expect(result.stdout).toContain('lines');
    expect(result.stdout).toContain('B');
  } finally {
    await cleanup(tempFile);
  }
});

test('single file input - metrics tokens only', async () => {
  const tempFile = await createTempFile('Test file content');
  
  try {
    const result = await runCLI([tempFile, '--metrics', 'tokens']);
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/test\.txt \(\d+ tokens\)$/);
    expect(result.stdout).not.toContain('lines');
    expect(result.stdout).not.toContain('B');
  } finally {
    await cleanup(tempFile);
  }
});

test('single file input - metrics size only', async () => {
  const tempFile = await createTempFile('Test file content with some length');
  
  try {
    const result = await runCLI([tempFile, '--metrics', 'size']);
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/test\.txt \(\d+B\)$/);
    expect(result.stdout).not.toContain('tokens');
    expect(result.stdout).not.toContain('lines');
  } finally {
    await cleanup(tempFile);
  }
});

test('single file input - non-existent file', async () => {
  const result = await runCLI(['/non/existent/file.txt']);
  
  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain('Error:');
  expect(result.stderr).toContain('Cannot access path');
});

test('single file input - no colors', async () => {
  const tempFile = await createTempFile('Test content');
  
  try {
    const result = await runCLI([tempFile, '--no-colors']);
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/^test\.txt \(/);
    // Should not contain ANSI color codes
    // eslint-disable-next-line no-control-regex
    expect(result.stdout).not.toMatch(/\x1b\[[0-9;]*m/);
  } finally {
    await cleanup(tempFile);
  }
});

// Mock clipboard tests (can't easily test real clipboard in CI)
test('clipboard input - mock platform detection', async () => {
  // This test verifies that the CLI has the clipboard option
  const result = await runCLI(['--help']);
  
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain('--from-clipboard');
  expect(result.stdout).toContain('Read content from system clipboard');
});

test('invalid metrics option', async () => {
  const result = await runCLI(['--metrics', 'invalid'], 'test');
  
  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain('Invalid metric: invalid');
});

test('metrics option - all valid combinations', async () => {
  const validMetrics = [
    'tokens',
    'lines',
    'size',
    'tokens,lines',
    'tokens,size',
    'lines,size',
    'tokens,lines,size',
    'tokens,lines,size,percentage'
  ];
  
  for (const metrics of validMetrics) {
    const result = await runCLI(['--metrics', metrics], 'Test content');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('stdin');
  }
});

test('buildMetricInfo function behavior through CLI', async () => {
  // Test that metrics are properly filtered
  const testContent = 'This is multi-line\ntest content\nfor metric testing';
  
  // Test tokens only
  const tokensResult = await runCLI(['--metrics', 'tokens'], testContent);
  expect(tokensResult.stdout).toMatch(/stdin \(\d+ tokens\)$/);
  
  // Test lines only  
  const linesResult = await runCLI(['--metrics', 'lines'], testContent);
  expect(linesResult.stdout).toMatch(/stdin \(\d+ lines\)$/);
  
  // Test size only
  const sizeResult = await runCLI(['--metrics', 'size'], testContent);
  expect(sizeResult.stdout).toMatch(/stdin \(\d+B\)$/);
  
  // Test combination
  const comboResult = await runCLI(['--metrics', 'tokens,lines'], testContent);
  expect(comboResult.stdout).toMatch(/stdin \(\d+ tokens, \d+ lines\)$/);
  expect(comboResult.stdout).not.toContain('B');
});

test('directory analysis still works (regression test)', async () => {
  const result = await runCLI(['.', '--depth', '0']);
  
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain('tokens');
  expect(result.stdout).toContain('Summary:');
});