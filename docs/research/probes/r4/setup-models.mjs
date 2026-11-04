// R4 setup: fetch the pinned model files once from Hugging Face into ext/models/ (gitignored).
// This is the only network use in R4 (owner decision, 2026-11-03). Re-running skips files that are
// already present with the right size and hash. Usage: node setup-models.mjs [E1 E2 ...]
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'ext', 'models');
const { models } = JSON.parse(readFileSync(join(HERE, 'models.json'), 'utf8'));
const want = process.argv.slice(2);
const UA = { 'User-Agent': 'keepthread-r4-probe' };

const sha256 = (p) => new Promise((ok, fail) => {
  const h = createHash('sha256');
  createReadStream(p).on('data', (d) => h.update(d)).on('end', () => ok(h.digest('hex'))).on('error', fail);
});

let total = 0;
for (const m of models.filter((m) => !want.length || want.includes(m.key))) {
  const meta = await (await fetch(`https://huggingface.co/api/models/${m.repo}/revision/${m.revision}?blobs=true`, { headers: UA })).json();
  const info = Object.fromEntries(meta.siblings.map((s) => [s.rfilename, s]));
  for (const f of m.files) {
    const s = info[f];
    if (!s) throw new Error(`${m.repo}@${m.revision}: no file ${f}`);
    const dest = join(OUT, m.repo, f);
    const expectSha = s.lfs?.sha256;
    const ok = async () => existsSync(dest) && statSync(dest).size === s.size && (!expectSha || (await sha256(dest)) === expectSha);
    if (!(await ok())) {
      mkdirSync(dirname(dest), { recursive: true });
      process.stdout.write(`${m.key} ${f} (${(s.size / 1e6).toFixed(1)} MB) ... `);
      const res = await fetch(`https://huggingface.co/${m.repo}/resolve/${m.revision}/${f}`, { headers: UA });
      if (!res.ok) throw new Error(`${f}: HTTP ${res.status}`);
      await pipeline(Readable.fromWeb(res.body), createWriteStream(dest + '.part'));
      renameSync(dest + '.part', dest);
      if (!(await ok())) throw new Error(`${f}: size or SHA-256 mismatch after download`);
      console.log('ok');
    }
    total += s.size;
  }
  if (m.textOnlyConfig) {
    const p = join(OUT, m.repo, 'config.json');
    const c = JSON.parse(readFileSync(p, 'utf8'));
    delete c.vision_config;
    delete c.audio_config;
    writeFileSync(p, JSON.stringify(c, null, 2));
  }
  console.log(`${m.key} ${m.repo}@${m.revision.slice(0, 7)}: ready`);
}
console.log(`model files on disk: ${(total / 1e6).toFixed(0)} MB`);
