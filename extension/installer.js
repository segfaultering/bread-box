export function createInstaller(files, browser, id) {
  if (!['chrome', 'chromium', 'brave', 'edge'].includes(browser) || !/^[a-p]{32}$/.test(id)) throw new Error('Could not prepare the installer for this browser.');
  return `#!/bin/sh
set -eu
if ! command -v node >/dev/null 2>&1; then
  echo "Bread Box needs Node.js 22 or newer. Install it from nodejs.org, then run this installer again."
  exit 1
fi
node --input-type=module - "$@" <<'BREADBOX_INSTALLER_PAYLOAD'
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Bread Box needs Node.js 22 or newer.');
const files = ${JSON.stringify(files)};
const root = await mkdtemp(join(tmpdir(), 'breadbox-setup-'));
try {
  for (const [name, content] of Object.entries(files)) await writeFile(join(root, name), content, { mode: 0o600 });
  process.argv = [process.execPath, join(root, 'install.mjs'), '--extension-id', '${id}', '--browser', '${browser}', ...process.argv.slice(2)];
  await import(pathToFileURL(join(root, 'install.mjs')).href);
} finally { await rm(root, { recursive: true, force: true }); }
BREADBOX_INSTALLER_PAYLOAD
`;
}
