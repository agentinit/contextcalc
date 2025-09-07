import { test, expect } from 'bun:test';
import { isCodeFile, isDocumentationFile, shouldIncludeFile, getFileTypeFromExtension } from '../src/utils/fileDetector.js';
import { AnalysisMode } from '../src/types/index.js';

test('isCodeFile identifies code files correctly', () => {
  expect(isCodeFile('test.js')).toBe(true);
  expect(isCodeFile('test.py')).toBe(true);
  expect(isCodeFile('test.ts')).toBe(true);
  expect(isCodeFile('test.txt')).toBe(false);
  expect(isCodeFile('test.md')).toBe(false);
});

test('isDocumentationFile identifies documentation files correctly', () => {
  expect(isDocumentationFile('README.md')).toBe(true);
  expect(isDocumentationFile('docs.txt')).toBe(true);
  expect(isDocumentationFile('test.js')).toBe(false);
});

test('shouldIncludeFile respects analysis mode', () => {
  expect(shouldIncludeFile('test.js', AnalysisMode.CODE)).toBe(true);
  expect(shouldIncludeFile('test.js', AnalysisMode.DOCS)).toBe(false);
  expect(shouldIncludeFile('test.js', AnalysisMode.ALL)).toBe(true);
  
  expect(shouldIncludeFile('README.md', AnalysisMode.DOCS)).toBe(true);
  expect(shouldIncludeFile('README.md', AnalysisMode.CODE)).toBe(false);
  expect(shouldIncludeFile('README.md', AnalysisMode.ALL)).toBe(true);
});

test('getFileTypeFromExtension returns correct extension', () => {
  expect(getFileTypeFromExtension('test.js')).toBe('.js');
  expect(getFileTypeFromExtension('test')).toBe('unknown');
  expect(getFileTypeFromExtension('test.HTML')).toBe('.html');
});