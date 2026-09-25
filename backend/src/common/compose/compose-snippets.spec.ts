import { applyComposeSnippets, assertValidComposeSnippets, parseComposeSnippet } from './compose-snippets';

const makeCompose = () => ({
  services: { mc: { image: 'itzg/minecraft-server', ports: ['25565:25565'], networks: { 'minepanel-network': {} } } },
  volumes: { 'mc-data': {} },
});

describe('compose snippets', () => {
  describe('parseComposeSnippet', () => {
    it('treats a blank or comment-only snippet as empty', () => {
      expect(parseComposeSnippet('')).toEqual({});
      expect(parseComposeSnippet('# nothing here')).toEqual({});
    });

    it('rejects YAML that does not parse', () => {
      expect(() => parseComposeSnippet('a: [unclosed')).toThrow(/invalid YAML/);
    });

    it('rejects more than one YAML document', () => {
      expect(() => parseComposeSnippet('a: 1\n---\nb: 2')).toThrow(/single YAML document/);
    });

    it.each(['- a\n- b', 'just a string', '42'])('rejects a non-mapping snippet: %s', (text) => {
      expect(() => parseComposeSnippet(text)).toThrow(/mapping/);
    });
  });

  describe('assertValidComposeSnippets', () => {
    it('accepts undefined and valid snippets', () => {
      expect(() => assertValidComposeSnippets(undefined)).not.toThrow();
      expect(() => assertValidComposeSnippets([{ target: 'mc', yaml: 'privileged: false' }])).not.toThrow();
    });

    it('names the offending snippet by position', () => {
      expect(() =>
        assertValidComposeSnippets([
          { target: 'mc', yaml: 'ok: true' },
          { target: 'root', yaml: '- nope' },
        ]),
      ).toThrow(/Compose snippet 2: a snippet must be a YAML mapping/);
    });
  });

  describe('applyComposeSnippets', () => {
    it('merges into the minecraft service without dropping panel values', () => {
      const compose = makeCompose();
      applyComposeSnippets(compose, [{ target: 'mc', yaml: 'dns:\n  - 1.1.1.1\nnetworks:\n  extra: {}' }]);

      expect(compose.services.mc).toMatchObject({
        image: 'itzg/minecraft-server',
        dns: ['1.1.1.1'],
        networks: { 'minepanel-network': {}, extra: {} },
      });
    });

    it('appends list items once and lets scalars from the snippet win', () => {
      const compose = makeCompose();
      applyComposeSnippets(compose, [{ target: 'mc', yaml: 'image: custom/image\nports:\n  - "25565:25565"\n  - "8100:8100"' }]);

      expect(compose.services.mc.image).toBe('custom/image');
      expect(compose.services.mc.ports).toEqual(['25565:25565', '8100:8100']);
    });

    it('lets a snippet replace a value of a different type', () => {
      const compose = makeCompose();
      applyComposeSnippets(compose, [{ target: 'mc', yaml: 'networks:\n  - custom' }]);

      expect(compose.services.mc.networks).toEqual(['custom']);
    });

    it('merges at the top level and under services', () => {
      const compose: any = makeCompose();
      applyComposeSnippets(compose, [
        { target: 'root', yaml: 'networks:\n  custom:\n    external: true\nx-note: hi' },
        { target: 'services', yaml: 'sidecar:\n  image: busybox' },
      ]);

      expect(compose.networks).toEqual({ custom: { external: true } });
      expect(compose['x-note']).toBe('hi');
      expect(compose.services.sidecar).toEqual({ image: 'busybox' });
      expect(compose.services.mc.image).toBe('itzg/minecraft-server');
    });

    it('applies snippets in order and ignores blank ones', () => {
      const compose = makeCompose();
      applyComposeSnippets(compose, [
        { target: 'mc', yaml: 'hostname: first' },
        { target: 'mc', yaml: '' },
        { target: 'mc', yaml: 'hostname: second' },
      ]);

      expect((compose.services.mc as any).hostname).toBe('second');
    });

    it('does not let a snippet reach Object.prototype', () => {
      const compose = makeCompose();
      applyComposeSnippets(compose, [{ target: 'mc', yaml: '__proto__:\n  polluted: true\nconstructor:\n  prototype:\n    polluted: true' }]);

      expect(({} as any).polluted).toBeUndefined();
      expect(Object.keys(compose.services.mc)).not.toContain('constructor');
    });

    it('throws before changing anything when a snippet is invalid', () => {
      const compose = makeCompose();
      expect(() =>
        applyComposeSnippets(compose, [
          { target: 'mc', yaml: 'hostname: first' },
          { target: 'mc', yaml: '- bad' },
        ]),
      ).toThrow(/Compose snippet 2/);
      expect((compose.services.mc as any).hostname).toBeUndefined();
    });
  });
});
