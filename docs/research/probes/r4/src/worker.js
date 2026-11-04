// R4 probe worker: one job per Worker. Loads a packaged model with Transformers.js (no network:
// remote models off, ONNX Runtime's wasm served from the package), embeds a fixture's comments,
// and returns timings and checks as JSON. It never returns comment text.
import { networkLog } from './netlog.js'; // first: wraps fetch before the runtimes capture it
import { env, pipeline } from '@huggingface/transformers';

const BASE = `${self.location.origin}/`;
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = `${BASE}models/`;
env.useBrowserCache = false;
env.fetch = self.fetch; // the logged, origin-restricted fetch from netlog.js
env.useWasmCache = false; // the cache path loads ORT's factory from a blob: URL, which the MV3 CSP forbids
env.backends.onnx.wasm.wasmPaths = {
  mjs: `${BASE}ort/ort-wasm-simd-threaded.asyncify.mjs`,
  wasm: `${BASE}ort/ort-wasm-simd-threaded.asyncify.wasm`,
};

const now = () => performance.now();
const progress = (msg) => self.postMessage({ progress: msg });
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const round = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d;

self.onmessage = async ({ data: job }) => {
  try {
    self.postMessage(await (job.config.kind === 'read' ? runRead(job) : runEmbed(job)));
  } catch (e) {
    self.postMessage({ config: job.config.id, fixture: job.fixture.name, error: String(e?.stack ?? e), network: network() });
  }
};

// Diagnostic (2026-11-04): read one large packaged file with no model involved, to separate
// "Chrome crashes serving a >1 GiB extension file" from "crashes buffering it" (incidents, benchmark-probe.md).
async function runRead({ config }) {
  const url = `${BASE}models/${config.repo}/${config.file}`;
  const t0 = now();
  progress(`${config.id}: fetch started`);
  const res = await fetch(url);
  const contentLength = res.headers.get('content-length');
  progress(`${config.id}: headers received (content-length ${contentLength})`);
  let bytes = 0;
  if (config.mode === 'stream') {
    const reader = res.body.getReader();
    let next = 128e6;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes >= next) { progress(`${config.id}: ${Math.round(bytes / 1e6)} MB read`); next += 128e6; }
    }
  } else {
    progress(`${config.id}: arrayBuffer() started`);
    bytes = (await res.arrayBuffer()).byteLength;
  }
  return { config: config.id, fixture: '(none)', kind: 'read', mode: config.mode, file: config.file, contentLength, bytes, ms: round(now() - t0), network: network() };
}

async function runEmbed({ config, fixture, repeats = 3, batchSize = 16 }) {
  const gpu = config.device === 'webgpu' ? await gpuInfo() : null;
  progress(`${config.id}: loading`);
  const t0 = now();
  // File-level breadcrumbs (the bench saves each one), so a crash can be tied to the file being read.
  const progress_callback = (p) => {
    if (p.status === 'initiate' || p.status === 'done') progress(`${config.id}: ${p.status} ${p.file}`);
  };
  const extractor = await pipeline('feature-extraction', config.repo, { device: config.device, dtype: config.dtype, progress_callback });
  progress(`${config.id}: model ready`);
  const loadMs = now() - t0;

  // Comments with no text (media-only, deleted) are not embedded; the product ties them to their exchange.
  const items = fixture.comments.filter((c) => c.text && c.text.trim());
  const texts = items.map((c) => (config.prefix ?? '') + c.text);
  const tok = extractor.tokenizer;
  const lengths = texts.map((t) => tok.encode(t).length);
  const maxLen = tok.model_max_length;
  // Batches of similar length, to keep padding low. Order is fixed, so runs are comparable.
  const order = lengths.map((n, i) => [n, i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(([, i]) => i);

  const runs = [];
  let vectors = null;
  let firstVectors = null;
  for (let r = 0; r <= repeats; r++) {
    progress(`${config.id}: pass ${r + 1} of ${repeats + 1}`);
    const out = new Array(texts.length);
    const t = now();
    let firstBatchMs = null;
    for (let b = 0; b < order.length; b += batchSize) {
      const idx = order.slice(b, b + batchSize);
      const res = await extractor(idx.map((i) => texts[i]), { pooling: config.pooling, normalize: true });
      const [n, dim] = res.dims;
      for (let k = 0; k < n; k++) out[idx[k]] = res.data.slice(k * dim, (k + 1) * dim);
      if (firstBatchMs === null) firstBatchMs = now() - t;
    }
    runs.push({ totalMs: now() - t, firstBatchMs });
    if (r === 0) firstVectors = out;
    vectors = out;
  }
  const warm = runs.slice(1).map((x) => x.totalMs);
  const dim = vectors[0]?.length ?? 0;
  let nan = 0;
  let maxDiff = 0;
  for (let i = 0; i < vectors.length; i++) {
    for (let j = 0; j < dim; j++) {
      const v = vectors[i][j];
      if (!Number.isFinite(v)) nan++;
      maxDiff = Math.max(maxDiff, Math.abs(v - firstVectors[i][j]));
    }
  }

  return {
    config: config.id,
    fixture: fixture.name,
    text: fixture.text,
    device: config.device,
    dtype: config.dtype,
    gpu,
    crossOriginIsolated: self.crossOriginIsolated,
    wasmThreads: env.backends.onnx.wasm.numThreads ?? null,
    comments: { loaded: fixture.comments.length, embedded: texts.length, batchSize },
    tokens: {
      total: lengths.reduce((a, b) => a + b, 0),
      max: Math.max(...lengths),
      modelMaxLength: maxLen > 1e9 ? null : maxLen,
      over256: lengths.filter((n) => n > 256).length,
      over512: lengths.filter((n) => n > 512).length,
    },
    loadMs: round(loadMs),
    firstPass: { totalMs: round(runs[0].totalMs), firstBatchMs: round(runs[0].firstBatchMs) },
    warmPasses: { n: warm.length, medianMs: round(median(warm)), minMs: round(Math.min(...warm)), maxMs: round(Math.max(...warm)) },
    checks: {
      dim,
      nonFinite: nan,
      maxAbsDiffFirstVsLastPass: maxDiff,
      identicalAcrossPasses: maxDiff === 0,
    },
    nearPairs: nearPairs(items, vectors),
    network: network(),
  };
}

// The 15 most similar comment pairs, by ID only: later scored against the owner's R tags (Q6).
function nearPairs(items, vectors, k = 15) {
  const pairs = [];
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      let s = 0;
      for (let d = 0; d < vectors[i].length; d++) s += vectors[i][d] * vectors[j][d];
      pairs.push([items[i].id, items[j].id, Math.round(s * 1000) / 1000]);
    }
  }
  return pairs.sort((a, b) => b[2] - a[2]).slice(0, k);
}

const network = networkLog;

async function gpuInfo() {
  const a = await navigator.gpu?.requestAdapter({ powerPreference: 'high-performance' });
  if (!a) return { available: false };
  const { vendor, architecture, device, description } = a.info ?? {};
  return { available: true, vendor, architecture, device, description, shaderF16: a.features.has('shader-f16') };
}
