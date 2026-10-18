import { readFileSync } from 'node:fs';
import { endianness } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handle } from './core.mjs';
const folder = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(folder, 'config.json'), 'utf8'));
if (!config.origins.includes(process.argv[2])) process.exit(1);
const little = endianness() === 'LE';
let buffer = Buffer.alloc(0);
let chain = Promise.resolve();
function respond(message) {
  const payload = Buffer.from(JSON.stringify(message));
  const header = Buffer.alloc(4);
  if (little) header.writeUInt32LE(payload.length); else header.writeUInt32BE(payload.length);
  process.stdout.write(Buffer.concat([header, payload]));
}
process.stdin.on('data', chunk => {
  buffer = Buffer.concat([buffer, chunk]);
  while (buffer.length >= 4) {
    const length = little ? buffer.readUInt32LE() : buffer.readUInt32BE();
    if (length > 65536) process.exit(1);
    if (buffer.length < length + 4) break;
    const payload = buffer.subarray(4, length + 4); buffer = buffer.subarray(length + 4);
    chain = chain.then(async () => {
      try { respond(await handle(JSON.parse(payload.toString()), config, config.dataRoot)); }
      catch (error) { respond({ ok: false, error: error.message }); }
    });
  }
});
