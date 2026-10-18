import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
const palette = ['blue', 'purple', 'green', 'orange', 'pink'];
export function validateUrl(value) {
  if (value === undefined) return 'about:blank';
  if (typeof value !== 'string' || value.length > 8192) throw new Error('Invalid URL.');
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Only HTTP and HTTPS URLs without embedded credentials can be opened.');
  return url.href;
}
function validName(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 40 || /[\x00-\x1f\x7f]/.test(value)) throw new Error('Choose a name of 1–40 characters.');
  return value.trim();
}
export function launch(executable, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { detached: true, stdio: 'ignore', shell: false });
    child.once('error', () => reject(new Error('Could not launch the configured browser. Run the installer with --executable pointing to your browser.')));
    child.once('spawn', () => { child.unref(); resolve(); });
  });
}
export async function handle(message, config, root, start = launch) {
  if (!message || typeof message !== 'object') throw new Error('Invalid request.');
  await mkdir(root, { recursive: true, mode: 0o700 });
  const lock = join(root, 'catalog.lock');
  let acquired = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { await mkdir(lock); acquired = true; break; }
    catch (e) { if (e.code !== 'EEXIST') throw e; await new Promise(resolve => setTimeout(resolve, 30)); }
  }
  if (!acquired) throw new Error('Container catalog is busy. If a companion crashed, remove catalog.lock from the Bread Box data folder.');
  try {
    const file = join(root, 'containers.json');
    let containers;
    try { containers = JSON.parse(await readFile(file, 'utf8')); }
    catch (e) { if (e.code !== 'ENOENT') throw e; containers = []; }
    if (!Array.isArray(containers)) throw new Error('Invalid container catalog.');
    const save = async () => {
      const temp = `${file}.${randomUUID()}.tmp`;
      await writeFile(temp, JSON.stringify(containers, null, 2), { mode: 0o600 });
      await rename(temp, file);
    };
    if (message.action === 'list') return { ok: true, containers };
    if (message.action === 'create') {
      const name = validName(message.name);
      if (!palette.includes(message.color)) throw new Error('Invalid container color.');
      if (containers.length >= 100) throw new Error('The limit is 100 containers.');
      const container = { id: randomUUID(), name, color: message.color };
      containers.push(container); await save(); return { ok: true, container };
    }
    const container = containers.find(item => item.id === message.id);
    if (!container || !/^[0-9a-f-]{36}$/.test(container.id)) throw new Error('Container not found.');
    if (message.action === 'update') {
      container.name = validName(message.name); await save(); return { ok: true, container };
    }
    if (message.action === 'open') {
      const url = validateUrl(message.url);
      const directory = join(root, 'profiles', container.id);
      await mkdir(directory, { recursive: true, mode: 0o700 });
      await start(config.executable, [`--user-data-dir=${directory}`, '--no-first-run', '--no-default-browser-check', url]);
      return { ok: true };
    }
    throw new Error('Unknown action.');
  } finally { await rm(lock, { recursive: true, force: true }); }
}
