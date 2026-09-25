import * as yaml from 'js-yaml';

// Where a snippet is merged into the generated compose document:
//   root     the top level (networks, volumes, x-* extension fields, name...)
//   services the `services` map, to add sidecar services next to `mc`
//   mc       the Minecraft service itself
export const COMPOSE_SNIPPET_TARGETS = ['root', 'services', 'mc'] as const;
export type ComposeSnippetTarget = (typeof COMPOSE_SNIPPET_TARGETS)[number];

export interface ComposeSnippet {
  target: ComposeSnippetTarget;
  yaml: string;
}

type Mapping = Record<string, unknown>;

// The backend's TS target predates the two-argument Error constructor.
class SnippetError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
  }
}

const isMapping = (value: unknown): value is Mapping => typeof value === 'object' && value !== null && !Array.isArray(value);

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Parses one snippet into a mapping; a blank snippet is an empty mapping. */
export function parseComposeSnippet(text: string): Mapping {
  // `load` rejects an empty document; `loadAll` returns none, which is the blank case.
  let documents: unknown[];
  try {
    documents = yaml.loadAll(text);
  } catch (error) {
    throw new SnippetError(`invalid YAML: ${(error as Error).message.split('\n')[0]}`, error);
  }
  if (documents.length > 1) throw new Error('a snippet must be a single YAML document');
  const parsed = documents[0];
  if (parsed === undefined || parsed === null) return {};
  if (!isMapping(parsed)) {
    throw new Error('a snippet must be a YAML mapping (key: value pairs)');
  }
  return parsed;
}

/** Throws with a message naming the offending snippet (1-based) if any cannot be applied. */
export function assertValidComposeSnippets(snippets: ComposeSnippet[] | undefined): void {
  (snippets ?? []).forEach((snippet, index) => {
    try {
      parseComposeSnippet(snippet.yaml);
    } catch (error) {
      throw new SnippetError(`Compose snippet ${index + 1}: ${(error as Error).message}`, error);
    }
  });
}

// Mappings merge key by key, lists are appended (without duplicates) so a snippet
// can add a port or a volume without restating the panel's own, and any other value
// from the snippet wins. That includes a type mismatch, e.g. a list `networks`
// against the panel's map form: the snippet replaces it.
function mergeValue(base: unknown, extra: unknown): unknown {
  if (isMapping(base) && isMapping(extra)) {
    mergeInto(base, extra);
    return base;
  }
  if (Array.isArray(base) && Array.isArray(extra)) {
    const seen = new Set(base.map((item) => JSON.stringify(item)));
    return [...base, ...extra.filter((item) => !seen.has(JSON.stringify(item)))];
  }
  return extra;
}

function mergeInto(base: Mapping, extra: Mapping): void {
  for (const [key, value] of Object.entries(extra)) {
    if (UNSAFE_KEYS.has(key)) continue;
    base[key] = key in base ? mergeValue(base[key], value) : value;
  }
}

/** Merges every snippet into `compose` in place, in order. */
export function applyComposeSnippets(compose: { services: Mapping } & Mapping, snippets: ComposeSnippet[] | undefined): void {
  assertValidComposeSnippets(snippets);

  for (const snippet of snippets ?? []) {
    const extra = parseComposeSnippet(snippet.yaml);
    if (snippet.target === 'root') {
      mergeInto(compose, extra);
    } else if (snippet.target === 'services') {
      mergeInto(compose.services, extra);
    } else {
      mergeInto(compose.services.mc as Mapping, extra);
    }
  }
}
