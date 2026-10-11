// docker compose prints its progress on stderr before the error, so the reason is the last line.
// The daemon prefix and endpoint ids only make it longer.
export function describeCommandFailure(error: unknown): string {
  const failure = error as { stderr?: string; message?: string };
  const lines = (failure.stderr?.trim() || failure.message || String(error)).trim().split('\n');
  return lines[lines.length - 1]
    .replace(/^Error response from daemon:\s*/, '')
    .replace(/\s*\([0-9a-f]{64}\)/g, '')
    .trim();
}
