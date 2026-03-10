import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sitemapPath = resolve(process.cwd(), '.vitepress/dist/sitemap.xml');
const xml = readFileSync(sitemapPath, 'utf8');

const cleaned = xml.replace(
  /<url><loc>https:\/\/minepanel\.ketbome\.com\/AGENTS<\/loc>[\s\S]*?<\/url>/gi,
  '',
);

if (cleaned !== xml) {
  writeFileSync(sitemapPath, cleaned, 'utf8');
  console.log('Removed AGENTS URL entry from sitemap.xml');
} else {
  console.log('No AGENTS URL entry found in sitemap.xml');
}
