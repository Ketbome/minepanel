import { parseMemoryToMb } from 'src/metrics/metric-parse.util';

// The JVM needs native memory (metaspace, threads, buffers) on top of -Xmx. A container capped
// at exactly the heap size always reads as nearly full and can be OOM-killed under load.
export function containerMemoryLimit(maxMemory: string): string {
  const heapMb = parseMemoryToMb(maxMemory);
  if (heapMb === null) return maxMemory;
  return `${Math.ceil(heapMb + Math.max(1024, heapMb * 0.25))}M`;
}
