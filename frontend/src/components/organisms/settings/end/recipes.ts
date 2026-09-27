import { addItem, countOf, removeItem, type ItemId, type Slot } from './items';

// The recipes the journey needs, matched the way the game does: a shaped recipe may sit
// anywhere in the 3x3 grid as long as the pattern is intact, a shapeless one only counts items.

export interface Recipe {
  readonly output: ItemId;
  readonly count?: number;
  // null is a cell that must stay empty
  readonly rows?: readonly (readonly (ItemId | null)[])[];
  readonly ingredients?: readonly ItemId[];
}

export const RECIPES: readonly Recipe[] = [
  { output: 'sword', rows: [['diamond'], ['diamond'], ['stick']] },
  { output: 'blaze', count: 2, ingredients: ['rod'] },
  { output: 'eye', ingredients: ['pearl', 'blaze'] },
  { output: 'pickaxe', rows: [['diamond', 'diamond', 'diamond'], [null, 'stick', null], [null, 'stick', null]] },
  { output: 'planks', count: 4, ingredients: ['log'] },
  { output: 'stick', count: 4, rows: [['planks'], ['planks']] },
];

const SIZE = 3;

function matchesShape(grid: readonly Slot[], rows: readonly (readonly (ItemId | null)[])[]) {
  const filled = grid.flatMap((cell, index) => (cell ? [index] : []));
  if (filled.length === 0) return false;
  const top = Math.min(...filled.map((index) => Math.floor(index / SIZE)));
  const left = Math.min(...filled.map((index) => index % SIZE));
  const bottom = Math.max(...filled.map((index) => Math.floor(index / SIZE)));
  const right = Math.max(...filled.map((index) => index % SIZE));
  if (bottom - top + 1 !== rows.length || right - left + 1 !== rows[0].length) return false;
  return rows.every((row, r) => row.every((item, c) => (grid[(top + r) * SIZE + left + c]?.item ?? null) === item));
}

function matchesShapeless(grid: readonly Slot[], ingredients: readonly ItemId[]) {
  const items = grid.flatMap((cell) => (cell ? [cell.item] : [])).sort();
  const wanted = [...ingredients].sort();
  return items.length === wanted.length && items.every((item, index) => item === wanted[index]);
}

export function match(grid: readonly Slot[]) {
  return RECIPES.find((recipe) => (recipe.rows ? matchesShape(grid, recipe.rows) : matchesShapeless(grid, recipe.ingredients!))) ?? null;
}

export function needs(recipe: Recipe): readonly ItemId[] {
  return recipe.rows ? recipe.rows.flat().filter((item): item is ItemId => item !== null) : recipe.ingredients!;
}

export function canFill(recipe: Recipe, slots: readonly Slot[]) {
  const wanted = needs(recipe);
  return wanted.every((item) => countOf(slots, item) >= wanted.filter((other) => other === item).length);
}

// the recipe book: empties the grid back into the inventory, then lays out one set (or, with
// `max`, as many sets as the inventory can pay for); shaped in the middle column, shapeless
// across the middle row
export function fillFor(recipe: Recipe, grid: readonly Slot[], inventory: readonly Slot[], max = false) {
  let bag = grid.reduce<Slot[]>((slots, cell) => (cell ? addItem(slots, cell.item, cell.count) : slots), [...inventory]);
  if (!canFill(recipe, bag)) return null;
  const wanted = needs(recipe);
  const sets = max ? Math.min(64, ...wanted.map((item) => Math.floor(countOf(bag, item) / wanted.filter((other) => other === item).length))) : 1;
  const next: Slot[] = Array.from({ length: SIZE * SIZE }, () => null);
  if (recipe.rows) {
    // a three-wide recipe fills the whole row, a narrower one sits in the middle column
    const left = recipe.rows[0].length === SIZE ? 0 : 1;
    recipe.rows.forEach((row, r) => row.forEach((item, c) => (next[r * SIZE + left + c] = item && { item, count: sets })));
  } else {
    recipe.ingredients!.forEach((item, index) => (next[SIZE + 1 + index] = { item, count: sets }));
  }
  wanted.forEach((item) => (bag = removeItem(bag, item, sets)));
  return { grid: next, inventory: bag };
}

// one craft uses one item from every filled cell
export function craftOnce(grid: readonly Slot[]) {
  const recipe = match(grid);
  if (!recipe) return null;
  return {
    grid: grid.map((cell) => (cell && cell.count > 1 ? { ...cell, count: cell.count - 1 } : null)),
    output: recipe.output,
    count: recipe.count ?? 1,
  };
}

// shift-click on the result: craft as long as the grid allows, straight into the inventory
export function craftAll(grid: readonly Slot[], inventory: readonly Slot[]) {
  let next = { grid: [...grid], inventory: [...inventory] };
  let made: ItemId | null = null;
  for (let round = 0; round < 64; round += 1) {
    const once = craftOnce(next.grid);
    if (!once || (made && once.output !== made)) break;
    made = once.output;
    next = { grid: once.grid, inventory: addItem(next.inventory, once.output, once.count) };
  }
  return made ? { ...next, output: made } : null;
}
