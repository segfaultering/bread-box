import { readFile, writeFile } from 'node:fs/promises';
const files = {};
for (const name of ['install.mjs', 'host.mjs', 'core.mjs']) files[name] = await readFile(new URL(`../native/${name}`, import.meta.url), 'utf8');
await writeFile(new URL('../extension/installer-bundle.json', import.meta.url), JSON.stringify(files));
