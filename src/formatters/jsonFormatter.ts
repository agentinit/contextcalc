import type { ScanResult } from '../types/index.js';

export interface JsonOutput {
  summary: {
    totalTokens: number;
    totalFiles: number;
    cacheHits: number;
    cacheMisses: number;
    cacheHitRate: string;
  };
  nodes: ScanResult['nodes'];
}

export function formatAsJson(result: ScanResult): string {
  const cacheHitRate = result.cacheHits + result.cacheMisses > 0 
    ? ((result.cacheHits / (result.cacheHits + result.cacheMisses)) * 100).toFixed(1) + '%'
    : '0%';

  const output: JsonOutput = {
    summary: {
      totalTokens: result.totalTokens,
      totalFiles: result.totalFiles,
      cacheHits: result.cacheHits,
      cacheMisses: result.cacheMisses,
      cacheHitRate
    },
    nodes: result.nodes
  };

  return JSON.stringify(output, null, 2);
}