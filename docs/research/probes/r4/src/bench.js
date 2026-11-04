// R4 bench page: picks configurations and fixtures, runs them one at a time through the offscreen
// document, and prints one JSON record. Figures enter benchmark-probe.md only from this JSON.
//
// Crash-safe: Chrome crashed twice during a run (2026-11-03, a browser-process CHECK). Before each job
// and each stage the page saves a breadcrumb, and after each job its result, to chrome.storage.local.
// A browser crash doesn't lose writes that have completed. On reopening, the page records the job that
// was running as crashed, and "Run checked" resumes with the jobs not yet done.
const CONFIGS = [
  { id: 'E1-wasm-q8', repo: 'Xenova/all-MiniLM-L6-v2', device: 'wasm', dtype: 'q8', pooling: 'mean' },
  { id: 'E1-webgpu-fp32', repo: 'Xenova/all-MiniLM-L6-v2', device: 'webgpu', dtype: 'fp32', pooling: 'mean' },
  { id: 'E2-wasm-q8', repo: 'Xenova/bge-small-en-v1.5', device: 'wasm', dtype: 'q8', pooling: 'cls' },
  { id: 'E2-webgpu-fp32', repo: 'Xenova/bge-small-en-v1.5', device: 'webgpu', dtype: 'fp32', pooling: 'cls' },
  // EmbeddingGemma 2: never fp16 or q4f16 (the card warns of NaN); prefix from its sentence-transformers config (STS).
  { id: 'E3-wasm-q4', repo: 'onnx-community/embeddinggemma-2-ONNX', device: 'wasm', dtype: 'q4', pooling: 'mean', prefix: 'task: sentence similarity | query: ' },
  { id: 'E3-webgpu-q4', repo: 'onnx-community/embeddinggemma-2-ONNX', device: 'webgpu', dtype: 'q4', pooling: 'mean', prefix: 'task: sentence similarity | query: ' },
  // Last: the only job that loads a >1 GB file (model.onnx_data, 1.08 GB).
  { id: 'E3-webgpu-fp32', repo: 'onnx-community/embeddinggemma-2-ONNX', device: 'webgpu', dtype: 'fp32', pooling: 'mean', prefix: 'task: sentence similarity | query: ', off: true },
  // E3's only wasm option: both quantized graphs use GatherBlockQuantized, which this wasm build lacks (run 1).
  { id: 'E3-wasm-fp32', repo: 'onnx-community/embeddinggemma-2-ONNX', device: 'wasm', dtype: 'fp32', pooling: 'mean', prefix: 'task: sentence similarity | query: ', off: true },
  // Crash diagnostics (2026-11-04): E3-webgpu-fp32 crashed Chrome's browser process while loading its
  // 1,084,170,240-byte model.onnx_data (just over 1 GiB). These read that file with no model at all.
  // Unchecked by default; run one at a time. 'stream' reports progress every 128 MB.
  { id: 'DIAG-read-stream-1.08GB', kind: 'read', mode: 'stream', repo: 'onnx-community/embeddinggemma-2-ONNX', file: 'onnx/model.onnx_data', off: true },
  { id: 'DIAG-read-arraybuffer-1.08GB', kind: 'read', mode: 'arraybuffer', repo: 'onnx-community/embeddinggemma-2-ONNX', file: 'onnx/model.onnx_data', off: true },
  { id: 'DIAG-read-arraybuffer-174MB', kind: 'read', mode: 'arraybuffer', repo: 'onnx-community/embeddinggemma-2-ONNX', file: 'onnx/model_q4.onnx_data', off: true },
];
const PAUSE_MS = 3000; // between jobs, so one configuration's teardown doesn't overlap the next
const KEY = 'r4';

const $ = (id) => document.getElementById(id);
const fresh = () => ({ probe: 'keepthread-r4', version: 4, startedAt: null, machine: null, contexts: null, results: [], crashes: [] });
let record = fresh();
const show = () => { $('out').textContent = JSON.stringify(record, null, 1); };
const status = (s) => { $('status').textContent = s; };
const save = (current = null) => chrome.storage.local.set({ [KEY]: { record, current } });
const jobKey = (c, f) => `${c} on ${f}`;

const index = await (await fetch('fixtures/index.json')).json();
for (const c of CONFIGS) addBox('configs', c.id, c.off ? `${c.id} (crash risk or diagnostic: off by default)` : c.id, !c.off);
for (const f of index) addBox('fixtures', f.path, `${f.name} (${f.text}, ${f.loaded} comments)`, f.text === 'synthetic' && f.name !== 'brandnewsentence');

function addBox(where, value, text, checked) {
  const l = document.createElement('label');
  l.innerHTML = `<input type="checkbox" value="${value}" ${checked ? 'checked' : ''}> `;
  l.append(text);
  $(where).append(l);
}
const checked = (where) => [...$(where).querySelectorAll('input:checked')].map((i) => i.value);

// Restore a previous run. A saved "current" job means the page never saw it finish: the browser died.
{
  const saved = (await chrome.storage.local.get(KEY))[KEY];
  if (saved?.record) {
    record = saved.record;
    record.crashes ??= [];
    if (saved.current) {
      record.crashes.push({ ...saved.current, note: 'running when the page was lost (browser crash or tab closed)' });
      await save();
    }
    show();
    const last = record.crashes.at(-1);
    status(`restored ${record.results.length} results` + (saved.current && last ? `; last run stopped during ${last.job} (${last.stage})` : ''));
  }
}

let current = null;
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.target !== 'bench' || !msg.progress) return;
  status(msg.progress);
  if (current) { current.stage = msg.progress; current.at = new Date().toISOString(); save(current); }
});

async function ensureOffscreen() {
  const have = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (!have.length) {
    await chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['WORKERS'], justification: 'Run local inference in a dedicated Worker (R4 probe).' });
  }
}

async function machine() {
  const ua = await navigator.userAgentData?.getHighEntropyValues(['platformVersion', 'architecture', 'model', 'fullVersionList']);
  const battery = await navigator.getBattery?.().catch(() => null);
  const est = await navigator.storage.estimate();
  return {
    browser: ua?.fullVersionList?.map((b) => `${b.brand} ${b.version}`),
    platform: ua ? `${ua.platform} ${ua.platformVersion} ${ua.architecture}` : navigator.userAgent,
    cores: navigator.hardwareConcurrency,
    acPower: battery ? battery.charging : null,
    storageUsageBytes: est.usage,
  };
}

$('env').onclick = async () => {
  status('checking contexts');
  await ensureOffscreen();
  const page = { context: 'extension page', crossOriginIsolated: self.crossOriginIsolated, webgpu: !!navigator.gpu, languageModel: typeof LanguageModel === 'undefined' ? 'undefined' : await LanguageModel.availability().catch((e) => `error: ${e.message}`) };
  const offscreen = await chrome.runtime.sendMessage({ target: 'offscreen', cmd: 'env' });
  const background = await chrome.runtime.sendMessage({ target: 'background', cmd: 'env' });
  record.contexts = [page, offscreen, background];
  record.machine = await machine();
  await save();
  show();
  status('contexts checked');
};

$('run').onclick = async () => {
  $('run').disabled = true;
  try {
    await ensureOffscreen();
    record.startedAt ??= new Date().toISOString();
    record.machine ??= await machine();
    const fixtures = await Promise.all(checked('fixtures').map(async (p) => {
      const f = await (await fetch(p)).json();
      return { name: f.fixture, text: f.text.startsWith('real') ? 'real' : 'synthetic', comments: f.comments.map(({ id, text }) => ({ id, text })) };
    }));
    const configs = CONFIGS.filter((c) => checked('configs').includes(c.id));
    const done = new Set(record.results.map((r) => jobKey(r.config, r.fixture)));
    const crashed = new Set(record.crashes.map((c) => c.job));
    const none = { name: '(none)', text: 'none', comments: [] };
    const jobs = configs.flatMap((config) => (config.kind === 'read' ? [none] : fixtures).map((fixture) => ({ config, fixture, key: jobKey(config.id, fixture.name) })));
    const todo = jobs.filter((j) => !done.has(j.key) && !crashed.has(j.key));
    const skipped = jobs.length - todo.length;
    let n = 0;
    for (const { config, fixture, key } of todo) {
      status(`${++n} of ${todo.length}${skipped ? ` (${skipped} already done or crashed, skipped)` : ''}: ${key}`);
      current = { job: key, stage: 'starting', at: new Date().toISOString() };
      await save(current);
      const res = await chrome.runtime.sendMessage({ target: 'offscreen', cmd: 'run', job: { config, fixture, repeats: 3, batchSize: 16 } });
      current = null;
      record.results.push(res);
      await save();
      show();
      await new Promise((r) => setTimeout(r, PAUSE_MS));
    }
    record.finishedAt = new Date().toISOString();
    record.machine.storageUsageBytesAfter = (await navigator.storage.estimate()).usage;
    await save();
    show();
    const failed = record.results.filter((r) => r.error || !r.network?.ok || r.checks?.nonFinite).length;
    status(`done: ${record.results.length} results, ${failed} with errors, foreign requests or non-finite values; ${record.crashes.length} crashed jobs`);
  } catch (e) {
    current = null;
    await save();
    status(`stopped: ${e.message}`);
  } finally {
    $('run').disabled = false;
  }
};

$('copy').onclick = async () => { await navigator.clipboard.writeText(JSON.stringify(record, null, 1)); status('copied'); };
$('download').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(record, null, 1)], { type: 'application/json' }));
  a.download = `keepthread-r4-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  a.click();
  status(`saved ${a.download} to your Downloads folder`);
};
$('reset').onclick = async () => {
  if (!confirm('Clear all saved results and crash records?')) return;
  record = fresh();
  await chrome.storage.local.remove(KEY);
  show();
  status('cleared');
};
