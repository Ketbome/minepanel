import { legacyPlayerDat, modernPlayerDat } from './player-nbt.fixtures';
import { normalizePlayer, readPlayerNbt, textOf, vanillaMaxDamage } from './player-nbt';

describe('player-nbt', () => {
  it('reads a pre-1.20.5 player', async () => {
    const player = await readPlayerNbt(legacyPlayerDat());

    expect(player.inventory).toEqual([
      { slot: 0, id: 'minecraft:diamond_pickaxe', count: 1, name: 'Digger', enchantments: [{ id: 'minecraft:efficiency', level: 5 }], damage: 61, maxDamage: 1561 },
      { slot: 9, id: 'minecraft:diamond', count: 12 },
      { slot: 10, id: 'minecraft:shulker_box', count: 1, contents: [{ slot: 4, id: 'minecraft:diamond', count: 30 }] },
    ]);
    expect(player.armor).toEqual([{ slot: 103, id: 'minecraft:iron_helmet', count: 1 }]);
    expect(player.offhand).toEqual({ slot: -106, id: 'minecraft:shield', count: 1 });
    expect(player.enderChest).toEqual([{ slot: 3, id: 'minecraft:emerald', count: 64 }]);
    expect(player.position).toEqual({ dimension: 'minecraft:the_nether', x: 10.5, y: 64, z: -3.25 });
    expect(player.spawn).toEqual({ dimension: 'minecraft:overworld', x: 100, y: 70, z: -50 });
    expect(player.vitals).toEqual({ health: null, food: null, xpLevel: null, xpProgress: null, gameMode: 'creative' });
    expect(player.effects).toEqual([{ id: '#1', amplifier: 0, duration: 200 }]);
  });

  it('reads a 1.21.5+ player with equipment and respawn compounds', async () => {
    const player = await readPlayerNbt(modernPlayerDat());

    expect(player.inventory).toEqual([
      { slot: 1, id: 'minecraft:diamond', count: 3, name: 'Shiny' },
      { slot: 2, id: 'minecraft:red_shulker_box', count: 1, contents: [{ slot: 0, id: 'minecraft:netherite_ingot', count: 4 }] },
      { slot: 3, id: 'minecraft:bundle', count: 1, contents: [{ slot: 0, id: 'minecraft:emerald', count: 2 }] },
      { slot: 4, id: 'minecraft:diamond_sword', count: 1, enchantments: [{ id: 'minecraft:sharpness', level: 5 }], damage: 100, maxDamage: 1561 },
      { slot: 5, id: 'minecraft:enchanted_book', count: 1, enchantments: [{ id: 'minecraft:mending', level: 1 }] },
    ]);
    expect(player.armor).toEqual([{ slot: 103, id: 'minecraft:netherite_helmet', count: 1 }]);
    expect(player.offhand).toEqual({ slot: -106, id: 'minecraft:totem_of_undying', count: 1 });
    expect(player.enderChest).toEqual([]);
    expect(player.spawn).toEqual({ dimension: 'minecraft:the_end', x: 5, y: 6, z: 7 });
    expect(player.vitals).toEqual({ health: 15, food: 17, xpLevel: 32, xpProgress: 0.5, gameMode: 'survival' });
    expect(player.effects).toEqual([{ id: 'minecraft:speed', amplifier: 1, duration: 600 }]);
  });

  it('tolerates missing fields and legacy numeric dimensions', () => {
    expect(normalizePlayer({})).toEqual({
      inventory: [],
      armor: [],
      offhand: null,
      enderChest: [],
      position: null,
      spawn: null,
      vitals: { health: null, food: null, xpLevel: null, xpProgress: null, gameMode: null },
      effects: [],
    });
    expect(normalizePlayer({ ActiveEffects: [{ Amplifier: 0 }] }).effects).toEqual([]);
    expect(normalizePlayer({ Pos: [0, 0, 0], Dimension: -1 }).position?.dimension).toBe('minecraft:the_nether');
    expect(normalizePlayer({ Pos: [0, 0, 0], Dimension: 7 }).position?.dimension).toBe('minecraft:dim7');
    expect(normalizePlayer({ Pos: [0, 0] }).position).toBeNull();
    expect(normalizePlayer({ Inventory: [{ Slot: 0 }, { id: 'minecraft:stick' }] }).inventory).toEqual([{ slot: 0, id: 'minecraft:stick', count: 1 }]);
  });

  it('knows vanilla max durability for tools, armor tiers and one-off items', () => {
    expect(['minecraft:netherite_pickaxe', 'golden_hoe', 'leather_boots', 'copper_helmet', 'minecraft:elytra', 'copper_sword'].map(vanillaMaxDamage)).toEqual([2031, 32, 65, 121, 432, 190]);
    expect(['minecraft:stone', 'mystery_sword', 'mystery_helmet'].map(vanillaMaxDamage)).toEqual([null, null, null]);
    // A max_damage component overrides the table; undamaged items carry no durability fields.
    expect(normalizePlayer({ Inventory: [{ Slot: 0, id: 'minecraft:stick', components: { 'minecraft:damage': 3, 'minecraft:max_damage': 10 } }, { Slot: 1, id: 'minecraft:bow' }] }).inventory).toEqual([
      { slot: 0, id: 'minecraft:stick', count: 1, damage: 3, maxDamage: 10 },
      { slot: 1, id: 'minecraft:bow', count: 1 },
    ]);
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
