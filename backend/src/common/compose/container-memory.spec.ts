import { containerMemoryLimit } from './container-memory';

describe('containerMemoryLimit', () => {
  it.each([
    ['1G', '2048M'],
    ['2G', '3072M'],
    ['4096M', '5120M'],
    ['6G', '7680M'],
    ['16G', '20480M'],
  ])('adds headroom above a %s heap', (maxMemory, expected) => {
    expect(containerMemoryLimit(maxMemory)).toBe(expected);
  });

  it('keeps a value it cannot parse as is', () => {
    expect(containerMemoryLimit('lots')).toBe('lots');
  });
});
