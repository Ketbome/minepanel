import { addItem, countOf, emptySlots, INVENTORY_SIZE, isArmor, ITEMS, removeItem, type ItemId, type Slot, type Stack } from '../items';
import { craftAll, craftOnce } from '../recipes';
import type { Area, ChestId, EndGameState, InventorySlice, Slice, Zone } from './types';

const chest = (size: number, items: Record<number, Stack>): Slot[] => Object.assign(emptySlots(size), items);

// the admin left the powder for ten eyes (4 powder + 3 blaze rods) but no pearls: those come from
// the piglins now, for gold. Iron for a sword and diamonds for a pickaxe; the diamond sword is
// The Sift's.
export const initialChests = (): Record<ChestId, Slot[]> => ({
  camp: chest(27, {
    3: { item: 'note', count: 1 },
    5: { item: 'emerald', count: 4 },
    10: { item: 'diamond', count: 3 },
    12: { item: 'iron', count: 2 },
    // sticks for the sword, the pickaxe and the bow
    11: { item: 'stick', count: 6 },
    13: { item: 'blaze', count: 4 },
    // the bow is yours to make
    14: { item: 'string', count: 3 },
    15: { item: 'arrow', count: 32 },
    16: { item: 'apple', count: 8 },
  }),
  backups: chest(27, Object.fromEntries(Array.from({ length: 9 }, (_, index) => [index + 9, { item: 'dirt', count: 64 }]))),
  // like the game's ruined portal chests: obsidian, flint and steel, gold and a golden helmet
  ruined: chest(27, {
    10: { item: 'helmet', count: 1 },
    11: { item: 'obsidian', count: 2 },
    13: { item: 'flint', count: 1 },
    15: { item: 'gold', count: 6 },
  }),
  // the ancient city's loot, spread over its ruins
  city1: chest(27, { 4: { item: 'apple', count: 4 }, 12: { item: 'arrow', count: 16 }, 20: { item: 'pearl', count: 2 } }),
  city2: chest(27, { 2: { item: 'gold', count: 8 }, 13: { item: 'diamond', count: 3 }, 15: { item: 'stick', count: 2 } }),
  city3: chest(27, { 6: { item: 'arrow', count: 24 }, 11: { item: 'apple', count: 3 }, 22: { item: 'obsidian', count: 3 } }),
  city4: chest(27, { 9: { item: 'pearl', count: 4 }, 13: { item: 'apple', count: 6 }, 17: { item: 'gold', count: 6 } }),
  // the biomes: the igloo's supplies, the wreck's cargo, and the treasure under the beach
  igloo: chest(27, { 11: { item: 'apple', count: 2 }, 15: { item: 'arrow', count: 16 } }),
  wreck: chest(27, { 4: { item: 'gold', count: 5 }, 13: { item: 'emerald', count: 3 }, 22: { item: 'arrow', count: 8 } }),
  buried: chest(27, { ...Object.fromEntries(Array.from({ length: 8 }, (_, index) => [index, { item: 'dirt', count: 64 }])), 13: { item: 'diamond', count: 1 } }),
  // under the Carapace's ribs, for the way back to the main route
  sift: chest(27, { 11: { item: 'pearl', count: 4 }, 13: { item: 'sword', count: 1 }, 15: { item: 'apple', count: 6 } }),
});

// what skipping into a zone hands you, so every zone can be played on its own
const KITS: Partial<Record<Zone, readonly Stack[]>> = {
  nether: [
    { item: 'ironSword', count: 1 },
    { item: 'bow', count: 1 },
    { item: 'arrow', count: 32 },
    { item: 'apple', count: 8 },
    { item: 'blaze', count: 4 },
    { item: 'gold', count: 16 },
    { item: 'helmet', count: 1 },
  ],
  stronghold: [
    { item: 'ironSword', count: 1 },
    { item: 'bow', count: 1 },
    { item: 'arrow', count: 32 },
    { item: 'apple', count: 8 },
    { item: 'eye', count: 9 },
    { item: 'pearl', count: 1 },
  ],
  end: [
    { item: 'ironSword', count: 1 },
    { item: 'bow', count: 1 },
    { item: 'arrow', count: 32 },
    { item: 'apple', count: 8 },
    { item: 'pearl', count: 1 },
    { item: 'dirt', count: 64 },
  ],
  endcity: [
    { item: 'ironSword', count: 1 },
    { item: 'bow', count: 1 },
    { item: 'arrow', count: 16 },
    { item: 'apple', count: 8 },
  ],
};

function areaOf(state: EndGameState, area: Area): Slot[] {
  if (area === 'grid') return state.grid;
  if (area === 'chest' && state.panel?.kind === 'chest') return state.chests[state.panel.id];
  return state.inventory;
}

function withArea(state: EndGameState, area: Area, slots: Slot[]): Partial<EndGameState> {
  if (area === 'grid') return { grid: slots };
  if (area === 'chest' && state.panel?.kind === 'chest') return { chests: { ...state.chests, [state.panel.id]: slots } };
  return { inventory: slots };
}

const less = (stack: Stack, by: number): Slot => (stack.count > by ? { ...stack, count: stack.count - by } : null);

// shift-click: chest and inventory trade stacks; inside the inventory, hotbar and backpack do;
// the crafting grid empties into the inventory
function quickMove(state: EndGameState, area: Area, index: number): Partial<EndGameState> {
  const from = areaOf(state, area);
  const stack = from[index];
  if (!stack) return {};
  const source = from.map((slot, i) => (i === index ? null : slot));
  const chest = state.panel?.kind === 'chest';
  if (area === 'inv' && chest) {
    const into = areaOf(state, 'chest');
    return { inventory: source, ...withArea(state, 'chest', addItem(into, stack.item, stack.count)) };
  }
  if (area === 'chest' || area === 'grid') {
    return { ...withArea(state, area, source), inventory: addItem(state.inventory, stack.item, stack.count) };
  }
  const hotbar = index < 9;
  const range = hotbar ? source.slice(9) : source.slice(0, 9);
  const moved = addItem(range, stack.item, stack.count);
  const leftover = stack.count - (countOf(moved, stack.item) - countOf(range, stack.item));
  const inventory = hotbar ? [...source.slice(0, 9), ...moved] : [...moved, ...source.slice(9)];
  if (leftover > 0) inventory[index] = { item: stack.item, count: leftover };
  return { inventory };
}

// what crafting unlocks in the story: the sword's advancement, and ten eyes to throw
function afterCraft(get: () => EndGameState, output: ItemId) {
  const game = get();
  if (output === 'ironSword' && !game.flags.swordCrafted) {
    game.setFlag('swordCrafted');
    game.advance('task', 'advStrike', 'sword');
  }
  const eyes = countOf(game.inventory, 'eye') + (game.cursor?.item === 'eye' ? game.cursor.count : 0);
  if (eyes >= 10 && !game.flags.eyesCrafted) game.setFlag('eyesCrafted');
}

export const createInventorySlice: Slice<InventorySlice> = (set, get) => ({
  inventory: emptySlots(INVENTORY_SIZE),
  selected: 0,
  chests: initialChests(),
  grid: emptySlots(9),
  cursor: null,
  armor: {},
  panel: null,

  // the game's clicks: left picks up, drops, merges or swaps a whole stack; right takes half
  // or drops one; shift sends the stack across
  clickSlot: (area, index, button, shift) =>
    set((state) => {
      if (shift) return quickMove(state, area, index);
      const slots = [...areaOf(state, area)];
      const slot = slots[index];
      let cursor = state.cursor;
      if (button === 'left') {
        if (!cursor) {
          cursor = slot;
          slots[index] = null;
        } else if (!slot) {
          slots[index] = cursor;
          cursor = null;
        } else if (slot.item === cursor.item) {
          const moved = Math.min(ITEMS[slot.item].max - slot.count, cursor.count);
          slots[index] = { item: slot.item, count: slot.count + moved };
          cursor = less(cursor, moved);
        } else {
          slots[index] = cursor;
          cursor = slot;
        }
      } else if (!cursor) {
        if (!slot) return state;
        const half = Math.ceil(slot.count / 2);
        cursor = { item: slot.item, count: half };
        slots[index] = less(slot, half);
      } else if (!slot || (slot.item === cursor.item && slot.count < ITEMS[slot.item].max)) {
        slots[index] = { item: cursor.item, count: (slot?.count ?? 0) + 1 };
        cursor = less(cursor, 1);
      } else if (slot.item !== cursor.item) {
        slots[index] = cursor;
        cursor = slot;
      }
      return { ...withArea(state, area, slots), cursor };
    }),
  // dragging a held stack across slots: left shares it out evenly, right drops one in each
  spread: (area, indices, button) =>
    set((state) => {
      const cursor = state.cursor;
      if (!cursor) return state;
      const slots = [...areaOf(state, area)];
      const open = indices.filter((index) => !slots[index] || (slots[index]!.item === cursor.item && slots[index]!.count < ITEMS[cursor.item].max));
      if (open.length === 0) return state;
      const each = button === 'right' ? 1 : Math.max(1, Math.floor(cursor.count / open.length));
      let left = cursor.count;
      open.forEach((index) => {
        if (left === 0) return;
        const current = slots[index]?.count ?? 0;
        const moved = Math.min(each, left, ITEMS[cursor.item].max - current);
        slots[index] = { item: cursor.item, count: current + moved };
        left -= moved;
      });
      return { ...withArea(state, area, slots), cursor: left > 0 ? { item: cursor.item, count: left } : null };
    }),
  // the result slot: a click puts one craft on the cursor, shift crafts all into the inventory
  takeOutput: (shift) => {
    const state = get();
    if (shift) {
      const result = craftAll(state.grid, state.inventory);
      if (!result) return;
      set({ grid: result.grid, inventory: result.inventory });
      afterCraft(get, result.output);
      return;
    }
    const once = craftOnce(state.grid);
    if (!once) return;
    const cursor = state.cursor;
    if (cursor && (cursor.item !== once.output || cursor.count + once.count > ITEMS[once.output].max)) return;
    set({ grid: once.grid, cursor: { item: once.output, count: (cursor?.count ?? 0) + once.count } });
    afterCraft(get, once.output);
  },

  give: (item, count = 1) => set((state) => ({ inventory: addItem(state.inventory, item, count) })),
  spend: (item, count = 1) => {
    if (countOf(get().inventory, item) < count) return false;
    set((state) => ({ inventory: removeItem(state.inventory, item, count) }));
    return true;
  },
  consumeHeld: () =>
    set((state) => {
      const stack = state.inventory[state.selected];
      if (!stack) return state;
      return { inventory: state.inventory.map((slot, index) => (index === state.selected ? less(stack, 1) : slot)) };
    }),
  wear: () => {
    const state = get();
    const piece = state.inventory[state.selected]?.item;
    if (!isArmor(piece) || state.armor[piece]) return;
    state.consumeHeld();
    set({ armor: { ...state.armor, [piece]: true } });
  },
  clickArmor: (piece) =>
    set((state) => {
      if (state.armor[piece] && !state.cursor) return { armor: { ...state.armor, [piece]: undefined }, cursor: { item: piece, count: 1 } };
      if (!state.armor[piece] && state.cursor?.item === piece) return { armor: { ...state.armor, [piece]: true }, cursor: null };
      return state;
    }),
  select: (slot) => set({ selected: ((slot % 9) + 9) % 9 }),
  cycle: (by) => set((state) => ({ selected: (((state.selected + by) % 9) + 9) % 9 })),
  takeFromChest: (id, index) =>
    set((state) => {
      const slot = state.chests[id][index];
      if (!slot) return state;
      return {
        chests: { ...state.chests, [id]: state.chests[id].map((item, i) => (i === index ? null : item)) },
        inventory: addItem(state.inventory, slot.item, slot.count),
      };
    }),
  takeAllFromChest: (id) =>
    set((state) => ({
      chests: { ...state.chests, [id]: emptySlots(state.chests[id].length) },
      inventory: state.chests[id].reduce<Slot[]>((bar, slot) => (slot ? addItem(bar, slot.item, slot.count) : bar), state.inventory),
    })),
  setInventory: (inventory) => set({ inventory }),
  setCraft: ({ grid, inventory }) => set({ grid, inventory }),
  trade: (cost, item) => {
    if (!get().spend('emerald', cost)) return false;
    get().give(item);
    return true;
  },
  openPanel: (panel) => set({ panel }),
  // closing a window hands back whatever was on the grid or on the cursor
  closePanel: () =>
    set((state) => {
      if (!state.panel) return state;
      const held = state.cursor ? [...state.grid, state.cursor] : state.grid;
      const inventory = held.reduce<Slot[]>((bar, cell) => (cell ? addItem(bar, cell.item, cell.count) : bar), state.inventory);
      return { panel: null, grid: emptySlots(9), cursor: null, inventory };
    }),
  grantKit: (zone) => {
    const kit = KITS[zone];
    if (!kit) return;
    set((state) => ({
      inventory: kit.reduce<Slot[]>((bar, stack) => (countOf(bar, stack.item) || (isArmor(stack.item) && state.armor[stack.item]) ? bar : addItem(bar, stack.item, stack.count)), state.inventory),
    }));
  },
});
