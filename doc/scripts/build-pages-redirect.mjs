import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const outputDir = resolve('.redirect-dist');
const officialUrl = 'https://minepanel.ketbome.com';
const projectPath = '/minepanel';

const redirectPage = (path, fallback = false) => {
  const target = `${officialUrl}${path}`;
  const script = fallback
    ? `
    <script>
      const projectPath = '${projectPath}';
      const pathname = location.pathname === projectPath
        ? '/'
        : location.pathname.startsWith(\`${projectPath}/\`)
          ? location.pathname.slice(projectPath.length)
          : location.pathname;

      location.replace(\`${officialUrl}\${pathname}\${location.search}\${location.hash}\`);
    </script>`
    : `
    <script>
      location.replace('${target}' + location.search + location.hash);
    </script>`;
  const canonical = fallback ? '' : `\n    <link rel="canonical" href="${target}">`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="0; url=${target}">
    <meta name="robots" content="noindex, follow">${canonical}
    <title>Minepanel documentation has moved</title>${script}
  </head>
  <body>
    <p>Minepanel documentation has moved to <a href="${target}">${target}</a>.</p>
  </body>
</html>
`;
};

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

const pages = readdirSync('.')
  .filter((file) => file.endsWith('.md') && file !== 'AGENTS.md')
  .map((file) => file.replace(/\.md$/, ''));

for (const page of pages) {
  const path = page === 'index' ? '/' : `/${page}`;
  const html = redirectPage(path);

  if (page === 'index') {
    writeFileSync(resolve(outputDir, 'index.html'), html);
    continue;
  }

  mkdirSync(resolve(outputDir, page), { recursive: true });
  writeFileSync(resolve(outputDir, `${page}.html`), html);
  writeFileSync(resolve(outputDir, page, 'index.html'), html);
}

writeFileSync(resolve(outputDir, '404.html'), redirectPage('/', true));
