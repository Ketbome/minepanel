import { legacyPlayerDat, modernPlayerDat } from './player-nbt.fixtures';
import { normalizePlayer, readPlayerNbt, textOf } from './player-nbt';

describe('player-nbt', () => {
  it('reads a pre-1.20.5 player', async () => {
    const player = await readPlayerNbt(legacyPlayerDat());

    expect(player.inventory).toEqual([
      { slot: 0, id: 'minecraft:diamond_pickaxe', count: 1, name: 'Digger' },
      { slot: 9, id: 'minecraft:diamond', count: 12 },
    ]);
    expect(player.armor).toEqual([{ slot: 103, id: 'minecraft:iron_helmet', count: 1 }]);
    expect(player.offhand).toEqual({ slot: -106, id: 'minecraft:shield', count: 1 });
    expect(player.enderChest).toEqual([{ slot: 3, id: 'minecraft:emerald', count: 64 }]);
    expect(player.position).toEqual({ dimension: 'minecraft:the_nether', x: 10.5, y: 64, z: -3.25 });
    expect(player.spawn).toEqual({ dimension: 'minecraft:overworld', x: 100, y: 70, z: -50 });
  });

  it('reads a 1.21.5+ player with equipment and respawn compounds', async () => {
    const player = await readPlayerNbt(modernPlayerDat());

    expect(player.inventory).toEqual([{ slot: 1, id: 'minecraft:diamond', count: 3, name: 'Shiny' }]);
    expect(player.armor).toEqual([{ slot: 103, id: 'minecraft:netherite_helmet', count: 1 }]);
    expect(player.offhand).toEqual({ slot: -106, id: 'minecraft:totem_of_undying', count: 1 });
    expect(player.enderChest).toEqual([]);
    expect(player.spawn).toEqual({ dimension: 'minecraft:the_end', x: 5, y: 6, z: 7 });
  });

  it('tolerates missing fields and legacy numeric dimensions', () => {
    expect(normalizePlayer({})).toEqual({ inventory: [], armor: [], offhand: null, enderChest: [], position: null, spawn: null });
    expect(normalizePlayer({ Pos: [0, 0, 0], Dimension: -1 }).position?.dimension).toBe('minecraft:the_nether');
    expect(normalizePlayer({ Pos: [0, 0, 0], Dimension: 7 }).position?.dimension).toBe('minecraft:dim7');
    expect(normalizePlayer({ Pos: [0, 0] }).position).toBeNull();
    expect(normalizePlayer({ Inventory: [{ Slot: 0 }, { id: 'minecraft:stick' }] }).inventory).toEqual([{ slot: 0, id: 'minecraft:stick', count: 1 }]);
  });

  it('extracts text from every custom name shape', () => {
    expect(textOf('{"text":"A","extra":[{"text":"B"},"C"]}')).toBe('ABC');
    expect(textOf('"Quoted"')).toBe('Quoted');
    expect(textOf('Plain name')).toBe('Plain name');
    expect(textOf({ text: 'Nbt' })).toBe('Nbt');
    expect(textOf({ translate: 'item.x' })).toBe('');
    expect(textOf(42)).toBe('42');
  });
});
