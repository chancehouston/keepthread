// Builds the R4 probe into ext/ (gitignored): bundles the scripts, copies ONNX Runtime's wasm files
// into the package (no CDN), and copies the fixtures. Model files are left in place (setup-models.mjs).
// Local real-text fixtures are copied only with --local; they stay on this machine (RD3).
import { build } from 'esbuild';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'ext');
const FIX = join(HERE, '..', '..', 'fixtures');
const local = process.argv.includes('--local');

await build({
  entryPoints: ['bench.js', 'offscreen.js', 'worker.js', 'background.js'].map((f) => join(HERE, 'src', f)),
  outdir: EXT,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'chrome124',
  logLevel: 'warning',
});
for (const f of ['manifest.json', 'bench.html', 'offscreen.html']) copyFileSync(join(HERE, 'src', f), join(EXT, f));

const ortDist = join(HERE, 'node_modules', 'onnxruntime-web', 'dist');
mkdirSync(join(EXT, 'ort'), { recursive: true });
for (const f of ['ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm']) copyFileSync(join(ortDist, f), join(EXT, 'ort', f));

const out = join(EXT, 'fixtures');
mkdirSync(out, { recursive: true });
const index = [];
const add = (src, name) => {
  copyFileSync(src, join(out, name));
  const f = JSON.parse(readFileSync(src, 'utf8'));
  index.push({ path: `fixtures/${name}`, name: f.fixture, text: f.text.startsWith('real') ? 'real' : 'synthetic', loaded: f.loaded });
};
for (const f of readdirSync(join(FIX, 'structural')).filter((f) => f.endsWith('.json')).sort()) add(join(FIX, 'structural', f), f);
if (local) {
  for (const d of readdirSync(join(FIX, 'raw')).sort()) {
    const p = join(FIX, 'raw', d, 'thread.json');
    if (existsSync(p)) add(p, `${d}.real.json`);
  }
}
writeFileSync(join(out, 'index.json'), JSON.stringify(index, null, 1));
console.log(`built ${EXT}: ${index.length} fixtures${local ? ' (including local real text)' : ''}`);
