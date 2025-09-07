import { test, expect } from 'bun:test';
import { hashContent, hashChildren } from '../src/core/hasher.js';

test('hashContent produces consistent hash for same input', () => {
  const content = 'console.log("Hello, world!");';
  const hash1 = hashContent(content);
  const hash2 = hashContent(content);
  
  expect(hash1).toBe(hash2);
  expect(hash1).toHaveLength(32);
});

test('hashContent produces different hashes for different inputs', () => {
  const hash1 = hashContent('content 1');
  const hash2 = hashContent('content 2');
  
  expect(hash1).not.toBe(hash2);
});

test('hashChildren produces consistent hash from sorted children', () => {
  const children = ['hash3', 'hash1', 'hash2'];
  const hash1 = hashChildren(children);
  const hash2 = hashChildren(['hash1', 'hash2', 'hash3']);
  
  expect(hash1).toBe(hash2);
});