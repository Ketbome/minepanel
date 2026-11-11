// Generates the voxel art for the season themes (panel + docs), one art.json per season.
// Output is committed in both apps because the docs build cannot read files outside doc/.
//
//   node scripts/season-art.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { christmas } from './season-art/christmas.mjs';
import { halloween } from './season-art/halloween.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

for (const [season, art] of Object.entries({ halloween, christmas })) {
  const json = JSON.stringify(art);
  for (const dir of [`frontend/src/components/organisms/${season}`, `doc/.vitepress/theme/${season}`]) writeFileSync(join(root, dir, 'art.json'), json + '\n');
  console.log(`${season} art: ${Object.keys(art).length} models, ${(json.length / 1024).toFixed(1)} KB`);
}
