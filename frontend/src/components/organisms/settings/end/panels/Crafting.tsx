'use client';

import { ArrowRight, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { cue } from '../end-audio';
import { ItemIcon, ITEMS } from '../items';
import { useLore } from '../lore';
import { canFill, fillFor, match, needs, RECIPES } from '../recipes';
import { useEndGame } from '../store';
import { InventoryGrid, InvSlot, ItemSlot, PanelWindow } from './PanelWindow';

// the result slot: a click puts one craft on the cursor, shift-click crafts everything the
// grid holds straight into the inventory
export function CraftResult() {
  const grid = useEndGame((state) => state.grid);
  const recipe = match(grid);
  return (
    <div
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (!recipe) return;
        useEndGame.getState().takeOutput(event.shiftKey);
        cue('craft');
      }}
    >
      <ItemSlot slot={recipe && { item: recipe.output, count: recipe.count ?? 1 }} large />
    </div>
  );
}

// the recipe book: a click lays out one set, shift-click as many as you can afford
function RecipeBook() {
  const lore = useLore();
  const grid = useEndGame((state) => state.grid);
  const inventory = useEndGame((state) => state.inventory);
  const available = [...inventory, ...grid];
  return (
    <ul className="mt-3 max-h-56 space-y-1.5 overflow-y-auto pr-1">
      {RECIPES.map((recipe) => (
        <li key={recipe.output}>
          <button
            type="button"
            disabled={!canFill(recipe, available)}
            onClick={(event) => {
              const game = useEndGame.getState();
              const next = fillFor(recipe, game.grid, game.inventory, event.shiftKey);
              if (next) game.setCraft(next);
            }}
            className="mc-btn flex w-full items-center justify-start gap-2 px-2 py-1.5 text-left text-xs disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ItemIcon item={recipe.output} className="h-6 w-6" />
            <span className="flex-1">{lore(ITEMS[recipe.output].name)}</span>
            <span className="flex gap-0.5">
              {needs(recipe).map((ingredient, part) => (
                <ItemIcon key={part} item={ingredient} className="h-4 w-4" />
              ))}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function Crafting() {
  const lore = useLore();
  const [book, setBook] = useState(false);

  return (
    <PanelWindow title={lore('crafting')} wide>
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        <button
          type="button"
          aria-label={lore('recipeBook')}
          title={lore('recipeBook')}
          aria-pressed={book}
          onClick={() => setBook(!book)}
          className={`mc-slot flex h-9 w-9 items-center justify-center text-emerald-300 hover:brightness-125 focus-visible:outline-2 focus-visible:outline-emerald-400 [&_svg]:size-4 ${book ? 'mc-slot--active' : ''}`}
        >
          <BookOpen />
        </button>
        <div className="grid grid-cols-3 gap-[3px]">
          {Array.from({ length: 9 }, (_, cell) => (
            <InvSlot key={cell} area="grid" index={cell} />
          ))}
        </div>
        <ArrowRight className="size-5 shrink-0 text-gray-400" />
        <CraftResult />
      </div>
      {book && <RecipeBook />}
      <p className="mt-3 text-[11px] leading-snug text-gray-400">{lore('craftHelp')}</p>
      <InventoryGrid />
    </PanelWindow>
  );
}
