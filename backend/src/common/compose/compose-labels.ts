// Compose labels reach us in two shapes: a list of "key=value" strings or a
// plain object. Four modules used to parse them independently and disagreed on
// values containing '=', so they all read them through here now.
export type ComposeLabels = string[] | Record<string, string | boolean | number> | undefined;

export function getComposeLabel(labels: ComposeLabels, key: string): string | undefined {
  if (!labels) return undefined;

  if (Array.isArray(labels)) {
    const label = labels.find((entry) => entry.startsWith(`${key}=`));
    return label?.slice(key.length + 1);
  }

  const value = labels[key];
  return value === undefined ? undefined : String(value);
}

export function getComposeLabelFlag(labels: ComposeLabels, key: string, fallback: boolean): boolean {
  const value = getComposeLabel(labels, key);
  return value === undefined ? fallback : value === 'true';
}
