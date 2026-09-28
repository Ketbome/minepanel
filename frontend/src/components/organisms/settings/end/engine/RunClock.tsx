'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { submitRun } from '@/services/end-runs/end-runs.service';
import { BLASTER_MS } from '../run';
import { BLASTER, useEndGame, type SplitZone } from '../store';
import { runtime } from './runtime';

const SPLITS: readonly SplitZone[] = ['nether', 'stronghold', 'end', 'endcity'];

// Splits at the first arrival in each zone, the finish (landing on the islet, or the poem), and a
// timed run sent to the panel's leaderboard; BlasterDaster has something to say about your time.
export function RunClock() {
  const sent = useRef(false);
  useFrame(() => {
    const game = useEndGame.getState();
    const at = Math.round(runtime.playTime * 1000);
    if ((SPLITS as readonly string[]).includes(game.zone) && game.checkpoint) game.split(game.zone as SplitZone, at);
    if (game.finishedAt !== null || !(game.flags.keeperMet || game.zone === 'poem')) return;
    game.finish(at);
    if (sent.current || (game.mode !== 'speedrun' && game.mode !== 'hardcore')) return;
    sent.current = true;
    void submitRun(game.mode, at, game.splits).catch(() => {});
    if (game.mode !== 'speedrun') return;
    // on the islet, after the admins have had their say
    const later = game.zone === 'poem' ? 500 : 28_000;
    const won = at < BLASTER_MS;
    if (won) game.advance('goal', 'advFaster', 'fireball');
    window.setTimeout(() => useEndGame.getState().say(won ? 'raceWin' : 'raceLose', BLASTER), later);
  });
  return null;
}
