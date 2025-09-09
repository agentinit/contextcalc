export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  if (i === 0) {
    return `${bytes}B`;
  }
  
  return `${(bytes / Math.pow(k, i)).toFixed(1)}${units[i]}`;
}