import { errorLines, findProblems, stripConsoleCodes } from './server-diagnostics';

describe('stripConsoleCodes', () => {
  it('drops the redrawn console prompt, cursor codes and colours', () => {
    const raw = '>....\x1b[K[20:01:35] [Server thread/WARN] [minecraft/ServerLevel]: zombie\n\x1b[32m[20:01:36] ok\x1b[0m\n>\x08\x08\x1b[2K[20:01:37] done';
    expect(stripConsoleCodes(raw)).toBe('[20:01:35] [Server thread/WARN] [minecraft/ServerLevel]: zombie\n[20:01:36] ok\n[20:01:37] done');
  });

  it('keeps a lone prompt and ordinary text', () => {
    expect(stripConsoleCodes('>\n<Steve> 2 > 1')).toBe('>\n<Steve> 2 > 1');
  });
});

describe('findProblems', () => {
  it('names the client-only mod in a NeoForge crash', () => {
    const log = [
      '[main/ERROR] Failed to load mods',
      '-- Mod loading issue for: oculus --',
      'Mod File: /data/mods/oculus-mc1.21-1.7.0.jar',
      'java.lang.RuntimeException: Attempted to load class net/minecraft/client/gui/screens/Screen for invalid dist DEDICATED_SERVER',
    ].join('\n');

    expect(findProblems(log)).toEqual([expect.objectContaining({ kind: 'client_only_mod', mods: ['oculus', 'oculus-mc1.21-1.7.0.jar'], evidence: expect.stringContaining('invalid dist') })]);
  });

  it('reads Fabric dependency errors and mixin failures', () => {
    const log = [
      'Incompatible mods found!',
      " - Mod 'Sodium Extra' (sodium-extra) 0.5.4 requires any version of sodium, which is missing!",
      'Mixin apply failed iris.mixins.json:MixinGameRenderer -> net.minecraft.class_757: from mod iris',
    ].join('\n');

    const problems = findProblems(log);
    expect(problems.map((problem) => problem.kind)).toEqual(['missing_dependency', 'mixin_failure']);
    expect(problems[0].mods).toEqual(expect.arrayContaining(['sodium-extra', 'sodium']));
    expect(problems[1].mods).toEqual(['iris']);
  });

  it('names both the mod and the dependency it lacks', () => {
    const log = [
      '[main/ERROR]: Incompatible mods found!',
      " - Mod 'Chunky' (chunky) 1.4.23 requires any version of fabric-api, which is missing!",
      'A potential solution has been determined, this may resolve your problem:',
      '\t - Install fabric-api, any version.',
    ].join('\n');

    expect(findProblems(log)[0].mods).toEqual(['chunky', 'fabric-api']);
  });

  it.each([
    ['java_version', 'java.lang.UnsupportedClassVersionError: has been compiled by a more recent version of the Java Runtime'],
    ['out_of_memory', 'java.lang.OutOfMemoryError: Java heap space'],
    ['port_in_use', '**** FAILED TO BIND TO PORT!'],
    ['duplicate_mod', 'Found duplicate mods: jei'],
  ])('recognises %s', (kind, line) => {
    expect(findProblems(`noise\n${line}`)).toEqual([expect.objectContaining({ kind, mods: [] })]);
  });

  it('finds nothing in a clean log', () => {
    expect(findProblems('[Server thread/INFO]: Done (3.2s)! For help, type "help"')).toEqual([]);
  });
});

describe('errorLines', () => {
  it('keeps the last error-looking lines', () => {
    expect(errorLines('ok\n[ERROR] a\nCaused by: b\nfine')).toEqual(['[ERROR] a', 'Caused by: b']);
  });
});
