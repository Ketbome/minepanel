'use client';

import { AnimatePresence, m } from 'framer-motion';
import { setMuted } from '../end-audio';
import { input } from '../engine/input';
import { countOf } from '../items';
import { lockPointer } from '../engine/runtime';
import { useLore, type LoreKey } from '../lore';
import { BLAZES, useEndGame, type DeathCause } from '../store';

const SHADOW = { textShadow: '2px 2px 0 rgba(0,0,0,0.8)' };

const DEATHS: Record<DeathCause, LoreKey> = {
  lava: 'deathLava',
  void: 'deathVoid',
  fall: 'deathFall',
  bed: 'deathBed',
  warden: 'deathWarden',
  enderman: 'deathEnderman',
  blaze: 'deathBlaze',
  dragon: 'deathDragon',
  breath: 'deathBreath',
  elytra: 'deathElytra',
  shulker: 'deathShulker',
  silverfish: 'deathSilverfish',
  ghast: 'deathGhast',
  creeper: 'deathCreeper',
  skeleton: 'deathSkeleton',
  piglin: 'deathPiglin',
  rake: 'deathRake',
  zombie: 'deathZombie',
  zombieVillager: 'deathZombieVillager',
  drowned: 'deathDrowned',
  spider: 'deathSpider',
  witch: 'deathWitch',
  slime: 'deathSlime',
  phantom: 'deathPhantom',
  zombifiedPiglin: 'deathZombifiedPiglin',
  hoglin: 'deathHoglin',
  magmaCube: 'deathMagmaCube',
  witherSkeleton: 'deathWitherSkeleton',
  endermite: 'deathEndermite',
  tnt: 'deathTnt',
  cactus: 'deathCactus',
  golem: 'deathGolem',
};

const CONTROLS: readonly LoreKey[] = ['ctrlMove', 'ctrlJump', 'ctrlSneak', 'ctrlSprint', 'ctrlAttack', 'ctrlUse', 'ctrlHotbar', 'ctrlInventory', 'ctrlPause'];

// Skipping hands you what the next zone needs, so every zone can be played on its own.
export function skipZone(onClose: () => void) {
  const game = useEndGame.getState();
  game.setPaused(false);
  if (game.zone === 'overworld' && !game.flags.rodsDone) {
    game.grantKit('nether');
    game.travel('nether', 'arrive', 'portal');
  } else if (game.zone === 'nether') {
    const missing = BLAZES.length - game.killed.filter((id) => BLAZES.includes(id)).length;
    if (missing > 0) game.give('rod', missing);
    const pearls = 10 - countOf(game.inventory, 'pearl') - countOf(game.inventory, 'eye');
    if (pearls > 0) game.give('pearl', pearls);
    BLAZES.forEach((id) => game.kill(id));
    game.setFlag('rodsDone');
    game.travel('overworld', 'portal', 'portal');
  } else if (game.zone === 'ancient') {
    game.travel('overworld', 'cave', 'black');
  } else if (game.zone === 'overworld') {
    game.grantKit('stronghold');
    game.setFlag('eyeLanded');
    game.setFlag('stronghold');
    game.travel('stronghold', 'arrive', 'black');
  } else if (game.zone === 'stronghold') {
    game.grantKit('end');
    game.travel('end', 'arrive', 'portal');
  } else if (game.zone === 'end') {
    game.travel('poem', 'arrive', 'white');
  } else {
    onClose();
  }
  lockPointer();
}

export function DeathScreen({ onClose }: { readonly onClose: () => void }) {
  const lore = useLore();
  const dead = useEndGame((state) => state.dead);
  const player = useEndGame((state) => state.player);
  const xp = useEndGame((state) => state.xp);

  return (
    <AnimatePresence>
      {dead && (
        <m.div
          role="alertdialog"
          aria-label={lore('deathTitle')}
          className="absolute inset-0 z-[45] flex flex-col items-center justify-center gap-4 bg-[rgba(120,0,0,0.55)] px-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.6 } }}
          exit={{ opacity: 0 }}
        >
          <h2 className="font-minecraft text-4xl text-white md:text-6xl" style={{ textShadow: '4px 4px 0 rgba(0,0,0,0.5)' }}>
            {lore('deathTitle')}
          </h2>
          <p className="max-w-md text-sm text-white md:text-base" style={SHADOW}>
            {player} {lore(DEATHS[dead])}
          </p>
          <p className="font-minecraft text-xs text-gray-200" style={SHADOW}>
            {lore('deathScore')} <span className="text-[#ffff55]">{Math.floor(xp * 68)}</span>
          </p>
          <div className="mt-4 flex w-[min(80vw,300px)] flex-col gap-2">
            <button
              type="button"
              autoFocus
              className="mc-btn py-2 text-sm"
              onClick={() => {
                useEndGame.getState().respawn();
                lockPointer();
              }}
            >
              {lore('respawn')}
            </button>
            <button type="button" className="mc-btn py-2 text-sm" onClick={onClose}>
              {lore('leave')}
            </button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

export function PauseMenu({ onClose }: { readonly onClose: () => void }) {
  const lore = useLore();
  const paused = useEndGame((state) => state.paused && !state.dead && !state.transition);
  const started = useEndGame((state) => Boolean(state.flags.started));
  const muted = useEndGame((state) => state.muted);

  const play = () => {
    const game = useEndGame.getState();
    game.setFlag('started');
    game.setPaused(false);
    lockPointer();
  };

  return (
    <AnimatePresence>
      {paused && (
        <m.div
          role="dialog"
          aria-modal="true"
          aria-label={lore(started ? 'paused' : 'controlsTitle')}
          className="absolute inset-0 z-[44] flex items-center justify-center bg-black/60 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="mc-panel w-full max-w-sm px-5 py-4 text-center">
            <h2 className="font-minecraft text-xl text-white" style={SHADOW}>
              {lore(started ? 'paused' : 'controlsTitle')}
            </h2>
            <ul className="mt-3 space-y-1 text-left text-xs text-gray-300">
              {input.touch ? (
                <li>{lore('ctrlTouch')}</li>
              ) : (
                CONTROLS.map((key) => (
                  <li key={key} className="font-mono">
                    {lore(key)}
                  </li>
                ))
              )}
            </ul>
            <div className="mt-4 flex flex-col gap-2">
              <button type="button" autoFocus className="mc-btn mc-btn-emerald py-2 text-sm" onClick={play}>
                {lore(started ? 'resume' : 'play')}
              </button>
              <button type="button" className="mc-btn py-2 text-sm" onClick={() => setMuted(!muted)}>
                {lore(muted ? 'unmute' : 'mute')}
              </button>
              {started && (
                <button type="button" className="mc-btn py-2 text-sm" onClick={() => skipZone(onClose)}>
                  {lore('skip')}
                </button>
              )}
              <button type="button" className="mc-btn py-2 text-sm" onClick={onClose}>
                {lore('leave')}
              </button>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

// shown when the pointer could not be taken back on its own; one click and you are playing
export function ResumePrompt() {
  const lore = useLore();
  const visible = useEndGame((state) => state.resume && !state.paused && !state.panel && !state.dead && !state.transition);
  if (!visible || input.touch) return null;
  return (
    <button type="button" className="absolute inset-0 z-[44] flex cursor-pointer items-center justify-center bg-black/25" onClick={() => lockPointer()}>
      <span className="font-minecraft bg-black/60 px-4 py-2 text-sm text-white" style={SHADOW}>
        {lore('clickToPlay')}
      </span>
    </button>
  );
}
