import { writeUncompressed } from 'prismarine-nbt';
import { gzipSync } from 'node:zlib';

const byte = (value: number) => ({ type: 'byte', value });
const int = (value: number) => ({ type: 'int', value });
const str = (value: string) => ({ type: 'string', value });
const comp = (value: Record<string, unknown>) => ({ type: 'compound', value });
const list = (type: string, value: unknown[]) => ({ type: 'list', value: { type, value } });

// A 1.20.4 player: Count byte, tag.display.Name JSON, armor/offhand inside Inventory, legacy spawn keys
export const legacyPlayerDat = () =>
  gzipSync(
    writeUncompressed({
      type: 'compound',
      name: '',
      value: {
        Inventory: list('compound', [
          { Slot: byte(0), id: str('minecraft:diamond_pickaxe'), Count: byte(1), tag: comp({ display: comp({ Name: str('{"text":"Digger"}') }) }) },
          { Slot: byte(9), id: str('minecraft:diamond'), Count: byte(12) },
          { Slot: byte(103), id: str('minecraft:iron_helmet'), Count: byte(1) },
          { Slot: byte(-106), id: str('minecraft:shield'), Count: byte(1) },
        ]),
        EnderItems: list('compound', [{ Slot: byte(3), id: str('minecraft:emerald'), Count: byte(64) }]),
        Pos: list('double', [10.5, 64, -3.25]),
        Dimension: str('minecraft:the_nether'),
        SpawnX: int(100),
        SpawnY: int(70),
        SpawnZ: int(-50),
        SpawnDimension: str('minecraft:overworld'),
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
        Inventory: list('compound', [{ Slot: byte(1), id: str('minecraft:diamond'), count: int(3), components: comp({ 'minecraft:custom_name': comp({ text: str('Shiny') }) }) }]),
        equipment: comp({
          head: comp({ id: str('minecraft:netherite_helmet'), count: int(1) }),
          offhand: comp({ id: str('minecraft:totem_of_undying'), count: int(1) }),
          saddle: comp({ id: str('minecraft:saddle'), count: int(1) }),
        }),
        Pos: list('double', [1, 2, 3]),
        Dimension: str('minecraft:overworld'),
        respawn: comp({ pos: { type: 'intArray', value: [5, 6, 7] }, dimension: str('minecraft:the_end') }),
      },
    } as any),
  );
