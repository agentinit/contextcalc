import { test, expect } from 'bun:test';
import { parseFileSize, normalizePathSeparators } from '../src/utils/pathUtils.js';

test('parseFileSize handles various size formats', () => {
  expect(parseFileSize('10M')).toBe(10 * 1024 * 1024);
  expect(parseFileSize('500k')).toBe(500 * 1024);
  expect(parseFileSize('1G')).toBe(1 * 1024 * 1024 * 1024);
  expect(parseFileSize('100')).toBe(100);
});

test('parseFileSize throws error for invalid format', () => {
  expect(() => parseFileSize('invalid')).toThrow();
  expect(() => parseFileSize('10X')).toThrow();
});

test('normalizePathSeparators converts backslashes to forward slashes', () => {
  expect(normalizePathSeparators('path\\to\\file')).toBe('path/to/file');
  expect(normalizePathSeparators('path/to/file')).toBe('path/to/file');
});