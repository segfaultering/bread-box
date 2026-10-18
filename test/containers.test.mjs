import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, open } from 'node:fs/promises';
import { tmpdir, endianness } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile, spawn } from 'node:child_process';
import { handle, validateUrl } from '../native/core.mjs';
const exec = promisify(execFile);
test('containers persist with independent profile paths and safe launch arguments', async t => {
  const root = await mkdtemp(join(tmpdir(), 'breadbox-')); t.after(() => rm(root, { recursive: true, force: true }));
  const config = { executable: '/browser' }; const launches = [];
  const call = message => handle(message, config, root, async (...args) => launches.push(args));
  const a = (await call({ action: 'create', name: 'Work', color: 'blue' })).container;
  const b = (await call({ action: 'create', name: 'Personal', color: 'green' })).container;
  await call({ action: 'open', id: a.id, url: 'https://example.com/?q=$(touch nope)' });
  await call({ action: 'open', id: b.id });
  assert.notEqual(launches[0][1][0], launches[1][1][0]);
  assert.equal(launches[0][0], '/browser');
  assert.match(launches[0][1].at(-1), /^https:\/\/example.com/);
  assert.equal(launches[1][1].at(-1), 'about:blank');
  await call({ action: 'update', id: a.id, name: 'Office' });
  assert.equal((await call({ action: 'list' })).containers[0].name, 'Office');
  await assert.rejects(call({ action: 'open', id: '../../escape' }), /not found/);
  await assert.rejects(call({ action: 'create', name: ' ', color: 'blue' }), /name/);
  await assert.rejects(call({ action: 'open', id: a.id, url: 'file:///etc/passwd' }), /HTTP/);
});
test('URL validation rejects executable schemes, browser internals and credentials', () => {
  for (const url of ['javascript:alert(1)', 'chrome://settings', 'data:text/html,hello', 'https://user:secret@example.com', '--no-sandbox']) assert.throws(() => validateUrl(url));
});
test('concurrent native clients do not lose catalog updates', async t => {
  const root = await mkdtemp(join(tmpdir(), 'breadbox-')); t.after(() => rm(root, { recursive: true, force: true }));
  await Promise.all(Array.from({ length: 8 }, (_, i) => handle({ action: 'create', name: `Account ${i}`, color: 'blue' }, {}, root)));
  assert.equal((await handle({ action: 'list' }, {}, root)).containers.length, 8);
});
test('installer and native host exchange real protocol messages', async t => {
  const home = await mkdtemp(join(tmpdir(), 'breadbox-install-')); t.after(() => rm(home, { recursive: true, force: true }));
  const id = 'a'.repeat(32);
  await assert.rejects(exec(process.execPath, ['native/install.mjs', '--extension-id', id, '--home', home]), /Choose a browser explicitly/);
  await assert.rejects(readFile(join(home, '.config/google-chrome/NativeMessagingHosts/com.breadbox.containers.json')), { code: 'ENOENT' });
  const fake = join(home, 'browser');
  await writeFile(fake, '#!/bin/sh\nexit 0\n', { mode: 0o700 });
  await exec(process.execPath, ['native/install.mjs', '--extension-id', id, '--browser', 'chrome', '--executable', fake, '--home', home]);
  const registry = process.platform === 'darwin' ? 'Library/Application Support/Google/Chrome' : '.config/google-chrome';
  const manifest = JSON.parse(await readFile(join(home, registry, 'NativeMessagingHosts/com.breadbox.containers.json'), 'utf8'));
  assert.deepEqual(manifest.allowed_origins, [`chrome-extension://${id}/`]);
  const exchange = async (message, origin = manifest.allowed_origins[0]) => {
    const payload = Buffer.from(JSON.stringify(message)); const header = Buffer.alloc(4);
    if (endianness() === 'LE') header.writeUInt32LE(payload.length); else header.writeUInt32BE(payload.length);
    const inputPath = join(home, 'input'); const outputPath = join(home, 'output');
    await writeFile(inputPath, Buffer.concat([header, payload]));
    const input = await open(inputPath, 'r'); const output = await open(outputPath, 'w');
    try {
      const child = spawn(manifest.path, [origin], { stdio: [input.fd, output.fd, 'inherit'] });
      const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve); });
      return { code, bytes: await readFile(outputPath) };
    } finally { await input.close(); await output.close(); }
  };
  const result = await exchange({ action: 'create', name: 'Work', color: 'blue' });
  assert.equal(result.code, 0, result.stderr);
  const response = JSON.parse(result.bytes.subarray(4)); assert.equal(response.ok, true);
  const opened = await exchange({ action: 'open', id: response.container.id, url: 'https://example.com' });
  assert.equal(JSON.parse(opened.bytes.subarray(4)).ok, true);
  assert.equal((await exchange({ action: 'list' }, `chrome-extension://${'b'.repeat(32)}/`)).code, 1);
});
