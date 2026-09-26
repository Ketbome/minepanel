import { writeUncompressed } from 'prismarine-nbt';
import { gzipSync } from 'node:zlib';

const byte = (value: number) => ({ type: 'byte', value });
const int = (value: number) => ({ type: 'int', value });
const str = (value: string) => ({ type: 'string', value });
const comp = (value: Record<string, unknown>) => ({ type: 'compound', value });
const list = (type: string, value: unknown[]) => ({ type: 'list', value: { type, value } });
const float = (value: number) => ({ type: 'float', value });

// A 1.20.4 player: Count byte, tag.display.Name JSON, armor/offhand inside Inventory, legacy spawn keys
export const legacyPlayerDat = () =>
  gzipSync(
    writeUncompressed({
      type: 'compound',
      name: '',
      value: {
        Inventory: list('compound', [
          {
            Slot: byte(0),
            id: str('minecraft:diamond_pickaxe'),
            Count: byte(1),
            tag: comp({ display: comp({ Name: str('{"text":"Digger"}') }), Damage: int(61), Enchantments: list('compound', [{ id: str('minecraft:efficiency'), lvl: { type: 'short', value: 5 } }]) }),
          },
          { Slot: byte(9), id: str('minecraft:diamond'), Count: byte(12) },
          { Slot: byte(103), id: str('minecraft:iron_helmet'), Count: byte(1) },
          { Slot: byte(-106), id: str('minecraft:shield'), Count: byte(1) },
          {
            Slot: byte(10),
            id: str('minecraft:shulker_box'),
            Count: byte(1),
            tag: comp({ BlockEntityTag: comp({ Items: list('compound', [{ Slot: byte(4), id: str('minecraft:diamond'), Count: byte(30) }]) }) }),
          },
        ]),
        EnderItems: list('compound', [{ Slot: byte(3), id: str('minecraft:emerald'), Count: byte(64) }]),
        Pos: list('double', [10.5, 64, -3.25]),
        Dimension: str('minecraft:the_nether'),
        SpawnX: int(100),
        SpawnY: int(70),
        SpawnZ: int(-50),
        SpawnDimension: str('minecraft:overworld'),
        playerGameType: int(1),
        ActiveEffects: list('compound', [{ Id: byte(1), Amplifier: byte(0), Duration: int(200) }]),
      },
    } as any),
  );

// A 1.21.5 player: count int, components custom_name, equipment compound, respawn compound
export const modernPlayerDat = () =>
  gzipSync(
    writeUncompressed({
      type: 'compound',
      name: '',
      value: {
        Inventory: list('compound', [
          { Slot: byte(1), id: str('minecraft:diamond'), count: int(3), components: comp({ 'minecraft:custom_name': comp({ text: str('Shiny') }) }) },
          {
            Slot: byte(4),
            id: str('minecraft:diamond_sword'),
            count: int(1),
            components: comp({ 'minecraft:damage': int(100), 'minecraft:enchantments': comp({ 'minecraft:sharpness': int(5) }) }),
          },
          { Slot: byte(5), id: str('minecraft:enchanted_book'), count: int(1), components: comp({ 'minecraft:stored_enchantments': comp({ levels: comp({ 'minecraft:mending': int(1) }) }) }) },
          {
            Slot: byte(2),
            id: str('minecraft:red_shulker_box'),
            count: int(1),
            components: comp({ 'minecraft:container': list('compound', [{ slot: int(0), item: comp({ id: str('minecraft:netherite_ingot'), count: int(4) }) }]) }),
          },
          { Slot: byte(3), id: str('minecraft:bundle'), count: int(1), components: comp({ 'minecraft:bundle_contents': list('compound', [{ id: str('minecraft:emerald'), count: int(2) }]) }) },
        ]),
        equipment: comp({
          head: comp({ id: str('minecraft:netherite_helmet'), count: int(1) }),
          offhand: comp({ id: str('minecraft:totem_of_undying'), count: int(1) }),
          saddle: comp({ id: str('minecraft:saddle'), count: int(1) }),
        }),
        Pos: list('double', [1, 2, 3]),
        Dimension: str('minecraft:overworld'),
        respawn: comp({ pos: { type: 'intArray', value: [5, 6, 7] }, dimension: str('minecraft:the_end') }),
        Health: float(15),
        foodLevel: int(17),
        XpLevel: int(32),
        XpP: float(0.5),
        playerGameType: int(0),
        active_effects: list('compound', [{ id: str('minecraft:speed'), amplifier: byte(1), duration: int(600) }]),
      },
    } as any),
  );

export const levelDat = (version: string) =>
  gzipSync(writeUncompressed({ type: 'compound', name: '', value: { Data: comp({ Version: comp({ Name: str(version) }) }) } } as any));
