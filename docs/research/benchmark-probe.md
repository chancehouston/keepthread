# R4: Benchmark probe

**Status:** 2026-11-03. Stage 1 (embeddings) is built and has not been run yet. No figures yet. Every figure here will come from the probe's printed JSON (README, folder rules).

## Decisions (owner, 2026-11-03)

| # | Decision | Consequence |
|---|---|---|
| R4-D1 | **Model files are fetched once from Hugging Face at setup**, then there is no network at all | [probes/r4/setup-models.mjs](probes/r4/setup-models.mjs) downloads pinned revisions (checked against the size and SHA-256 that Hugging Face lists) into `probes/r4/ext/models/` (gitignored). The extension's CSP is `connect-src 'self'`, and every result records the origins its worker fetched from. Anything other than the extension's own origin fails the result |
| R4-D2 | **Downloads of about 3 GB are acceptable** for the largest candidates | The full shortlist stays in: E1–E3, G1–G4 and B0 (model-landscape.md §3) |

## What is built (stage 1: embeddings)

- **Fixtures:** [probes/make-fixtures.py](probes/make-fixtures.py) turns each saved thread into
  - `fixtures/structural/<name>.json` (committed): the tree shape, content types and word counts, with synthetic text of the same word count;
  - `fixtures/raw/<name>/thread.json` (local, gitignored): the same comments with their real text, for the quality runs.

  Both use the label sheet's comment IDs (`c001`, …). [probes/check-fixtures.py](probes/check-fixtures.py) fails if any 4-word run of real text, a Reddit ID, a username or a URL reaches a structural file, or if the shape differs from the raw copy. It passed on all five fixtures, and it was shown to fail (exit 1) on a mutant with one real comment and a `t1_` ID planted in it.
- **The extension** ([probes/r4/](probes/r4/)): unpacked MV3, Transformers.js 4.3.2 (ONNX Runtime Web 1.31.0-dev), built with esbuild.
  - The bench page (`bench.html`) sends each job to an offscreen document (reason `WORKERS`). The offscreen document runs every job in a fresh dedicated Worker and terminates it afterwards.
  - Remote models are turned off. ONNX Runtime's wasm is served from the package; **Transformers.js's default fetches it from `cdn.jsdelivr.net`** (read in the 4.3.2 source; this settles that R3 question for Transformers.js).
  - The wasm cache is turned off, because it loads ONNX Runtime from a `blob:` URL, which the MV3 CSP forbids.
  - The manifest sets COOP and COEP, so that multi-threaded wasm can be used. The result records whether the context is cross-origin isolated.
- **EmbeddingGemma 2 loads as text only.** Transformers.js 4.3.2 loads its vision and audio encoders whenever the config has those sections. The setup script removes them from the local `config.json`, so the probe doesn't need those files (about 1.8 GB for the fp32 encoders alone).
- **Configurations:**
  - E1 all-MiniLM-L6-v2 (wasm q8, WebGPU fp32);
  - E2 bge-small-en-v1.5 (wasm q8, WebGPU fp32);
  - E3 EmbeddingGemma 2 (wasm q4, WebGPU q4, WebGPU fp32; never fp16 or q4f16).
- **Per job:** the load time. Then one first pass (the time to the first batch and to all comments) and three warm passes (median, min and max), each embedding all text comments in length-sorted batches of 16. Also recorded:
  - token counts (how many comments exceed 256 and 512 tokens);
  - the embedding dimension and a count of non-finite values;
  - whether the passes are bit-identical;
  - the 15 most similar pairs, by comment ID only;
  - the GPU adapter's info;
  - the origins fetched from.
- **Context checks** (button 1). Do the extension page, the offscreen document and the service worker each see WebGPU and the Prompt API (`LanguageModel.availability()`)? Can the service worker construct a Worker (an open R3 question)?

## How to run it (owner)

1. Optional, needed only if `ext/` was deleted: in `docs/research/probes/r4/`, run `npm install`, then `node setup-models.mjs` (about 1.6 GB, once), then `node build.mjs`.
2. In Chrome, open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and choose `docs/research/probes/r4/ext`.
3. Click the extension's toolbar button (pin it from the puzzle-piece menu). It opens the bench page.
4. Plug in to power, quit other heavy apps, and keep the bench tab in front.
5. Click **1. Check contexts**, then **2. Run checked**. The default is 7 configurations on 4 synthetic fixtures; the run should take a few minutes.
6. Click **Copy JSON** and paste the result into the chat. It contains only IDs and numbers.

## Not built yet

- **Memory sampling** (the macOS `footprint` of Chrome's GPU and renderer processes, design §5.5).
- **Stage 2, generation:** G1–G4 on Transformers.js, WebLLM and wllama, and B0 (the Prompt API). It follows once stage 1 runs cleanly.
- **The quality runs** on the real-text fixtures (`node build.mjs --local`), scored against the owner's labels. These wait for the r/pics labels, and the probe must not be run on r/pics before then.

## Incidents

### 2026-11-03: Chrome crashed twice during "Run checked"

- **What crashed:** the **browser process** of Chrome 156.0.8078.80 (macOS 27.2, arm64), not a renderer or the GPU process. The crash was `EXC_BREAKPOINT` (SIGTRAP), which is how a Chrome `CHECK` failure ends. It happened on a `ThreadPoolForegroundWorker` thread, with an identical stack (the same frame offsets) both times. That makes it deterministic, not a one-off.
- **What's known:** the two crashes were 4 minutes apart. The first hit a Chrome session that had been running for 4.7 hours, so the probe's run is the likely trigger. The dumps are unsymbolicated, and the crash keys name no assertion, so the failing check is unknown.
- **What isn't known:** which job and which stage was running. The bench page lost its state with the browser.
- **Hypotheses, unverified:**
  1. Reading a very large extension resource. The browser process serves `chrome-extension://` files on its thread pool, and E3 fp32 reads a 1.08 GB `model.onnx_data`.
  2. Something else in the browser-side handling of the offscreen document and the Worker, such as COOP/COEP.
- **Change (probe v2):**
  - Before each job, before each file load and at each stage, the bench saves a breadcrumb to `chrome.storage.local`. It also saves each result as soon as the job finishes. Completed writes survive a browser crash.
  - On reopening, the page records the job it lost as a crash, and **Run checked** resumes with the remaining jobs.
  - E3 fp32, the only job with a file over 1 GB, runs last.
- The crash reports stay local (`docs/crash-report/` is gitignored), because they carry machine identifiers.

### 2026-11-04: third crash, located by the breadcrumbs

- **Where:** run 1 (probe v2) finished 20 jobs. Chrome's browser process then crashed during **E3-webgpu-fp32 on adviceanimals**. The last saved stage was `done tokenizer.json` (00:03:01 UTC), so the crash came while the ONNX files were loading, not during inference. The page recorded the job as a crash when it was reopened, as designed.
- **The pattern:** that job is the first one to load `onnx/model.onnx_data`, which is **1,084,170,240 bytes, just over 1 GiB** (1,073,741,824). Both earlier crashes came about 2.5–4 minutes into a run, which is consistent with reaching the same job. Every other file loaded without trouble; the largest was E3 q4's 174 MB data file.
- **Leading hypothesis (unverified):** Chrome's browser process fails a check while serving or buffering an extension resource over some size limit, perhaps 1 GiB. The browser process, not the renderer or the GPU process, is the one that serves `chrome-extension://` files.
- **The test (probe v4):** three diagnostic jobs that read files with no model involved, run one at a time:
  - stream the 1.08 GB file, with a breadcrumb every 128 MB, to see whether it dies near 1,024 MiB;
  - `arrayBuffer()` on the same file, the way Transformers.js loads it;
  - `arrayBuffer()` on the 174 MB q4 file, as the control that should pass.

  E3-webgpu-fp32 and E3-wasm-fp32 are now off by default.
- **Why it matters beyond the probe:** G3 (Qwen3.5-4B, ~2.8 GB) and G4 (~2.1 GB) ship files over 1 GiB. If extension resources over 1 GiB crash Chrome, the product must store models in OPFS or Cache Storage (fetched once, R4-D1) rather than in the package, or split them into shards. The fix depends on which variant crashes.

### 2026-11-04: diagnosis — packaged files over about 1 GB crash Chrome 156's browser process

Diagnostic run (probe v4; each job run on its own, Chrome restarted after each crash):

| Job | Result |
|---|---|
| DIAG-read-arraybuffer-174MB (control) | **passed**: 174,028,800 bytes in 74.4 ms. The fetch log recorded 1 extension fetch and 0 foreign attempts (its positive control holds) |
| DIAG-read-stream-1.08GB | **browser crash**. The last breadcrumb was `1026 MB read`, saved at 00:11:09 UTC. The stream held one chunk at a time |
| DIAG-read-arraybuffer-1.08GB | **browser crash**. The last breadcrumb was `arrayBuffer() started`, at 00:11:38 UTC |

- **Finding (n = 1 per variant, plus the three model-load crashes):** reading the 1,084,170,240-byte packaged file through `chrome-extension://` crashes Chrome's browser process. It crashes **whether the file is streamed or buffered**, so this is not the worker running out of memory. The streamed read died after at least 1,026 MB and before the end of the file (1,084 MB); 1 GiB (1,073.7 MB) lies inside that window. The exact threshold is not measured.
- `content-length` is `null` for `chrome-extension://` responses. Progress for packaged files can't use it.
- **No public report was found** (one web search, 2026-11-04). Filing a Chromium bug with a minimal reproduction is the owner's call, because it is outward-facing.
- **Consequences:**
  1. **The product never serves a model file over ~1 GB from the extension package.** Models live in OPFS or Cache Storage, fetched once at setup (R4-D1), which was the likely product design anyway.
  2. **Stage 2 must load ONNX models from OPFS,** or keep every file under ~1 GB. G3 (~2.8 GB) and G4 (~2.1 GB) ship larger files; WebLLM's parameter shards are small.
  3. **Whether OPFS or Cache Storage reads of over 1 GB are safe is a separate question.** Stage 2 tests it before relying on it.
- E3 fp32 stays off in the packaged probe. E3 q4 (174 MB) is the E3 configuration to carry forward.

## Results

### Stage 1, run 1 (2026-11-04 00:00 UTC, probe v2; n = 1 run)

**Conditions:** Chrome 156.0.8078.80, macOS 27.2, arm64, 10 cores, on AC power. WebGPU adapter: `apple` / `metal-3`, with `shader-f16`. Four synthetic fixtures (adviceanimals, fauxmoi, pics, sipstea). Each job ran in a fresh Worker in the offscreen document: one first pass, then three warm passes.

**The figures cover 20 of 28 jobs.**
- E3-wasm-q4 (4 jobs) failed to load (see below).
- E3-webgpu-fp32 (4 jobs) has no result. The record has no `finishedAt` and no crash entry, so the run was still in that job, or stalled there, when the JSON was copied. It is not a measured failure.

**Times in ms** (warm median per fixture, in the order adviceanimals / fauxmoi / pics / sipstea; every warm min-to-max range was under 10% of its median):

| Config | Load | First pass (all comments) | Warm pass median |
|---|---|---|---|
| E1-wasm-q8 | 154 / 153 / 151 / 154 | 899 / 626 / 1,156 / 878 | 874 / 588 / 1,141 / 894 |
| E1-webgpu-fp32 | 361 / 397 / 406 / 467 | 149 / 136 / 189 / 173 | 118 / 90 / 153 / 122 |
| E2-wasm-q8 | 254 / 227 / 206 / 204 | 2,085 / 1,220 / 2,302 / 1,826 | 2,005 / 1,219 / 2,218 / 1,683 |
| E2-webgpu-fp32 | 601 / 635 / 680 / 694 | 217 / 168 / 284 / 230 | 193 / 142 / 259 / 204 |
| E3-webgpu-q4 | 1,399 / 1,602 / 1,946 / 1,242 | 1,373 / 894 / 1,550 / 1,256 | 1,304 / 834 / 1,487 / 1,199 |

Tokens embedded per fixture: E1 and E2 (the same BERT vocabulary) 4,005 / 1,674 / 4,411 / 2,842; E3 (with its task prefix) 4,705 / 2,290 / 5,090 / 3,465.

**Findings (one run, synthetic text: the timings are indicative, the similarity values mean nothing):**

- **WebGPU is 6.5–10× faster than wasm for the small embedders** (warm medians, per fixture). E1 embeds about 100 comments in 90–153 ms warm on WebGPU, against 588–1,141 ms on wasm q8 with 4 threads. The model loads in under 0.5 s either way. That is well inside an interactive budget [one run].
- **E3 (EmbeddingGemma 2, q4 on WebGPU) costs about 10× E1** (834–1,487 ms warm, 1.2–1.9 s load). Whether its quality is worth that is a question for the real-text runs.
- **E3 has no quantized wasm path in this build.** Both `model_q4.onnx` and `model_quantized.onnx` contain a `GatherBlockQuantized` node (read from the graph files), and ONNX Runtime Web's wasm execution provider reports no implementation for it. Its only wasm option is fp32, which needs the 1.08 GB file. That matters for the portability floor (model-landscape.md risk 8).
- **No non-finite values** in any embedding, including E3 q4 on WebGPU (risk 6: no NaN seen at q4 with fp32 activations).
- **Bit-identical output across the four passes** of every job (`maxAbsDiff` 0), on wasm and on WebGPU alike, within one session. Whether it is identical across sessions isn't measured yet.
- **The raw cosine level differs a lot by model.** The top pairs on synthetic text score about 0.6–0.75 (E1), 0.8–0.86 (E2) and 0.91–0.93 (E3). A near-duplicate threshold therefore has to be set per model, on real text.
- **Long comments are rare.** On synthetic text with real word counts, at most one comment per fixture exceeded 256 tokens, and none exceeded 512. The real-text run will give the actual counts, since real text tokenizes differently.

**Contexts:**

| Context | Cross-origin isolated | WebGPU | `LanguageModel.availability()` | Worker |
|---|---|---|---|---|
| Extension page | yes | yes | `downloadable` | n/a |
| Offscreen document | yes | yes | `downloadable` | jobs ran here |
| Service worker | n/a | yes | `downloadable` | **`Worker is not defined`** |

- **Settled: an MV3 service worker can't construct a Worker** (R3's inference, now observed). Inference needs the offscreen document.
- **B0 is eligible on this Mac.** The Prompt API exists in all three contexts and reports `downloadable`: the model isn't on disk yet. Stage 2 must trigger and time that download.
- **Multi-threaded wasm works.** With COOP/COEP in the manifest, the contexts are cross-origin isolated, and ONNX Runtime used 4 threads.

**A check that didn't work, and its fix:** every job reported `network.ok: true` with **no resource entries at all**, not even the extension's own model files. Resource Timing evidently records nothing for these fetches, so run 1's network check couldn't have caught anything; it is not evidence. The CSP (`connect-src 'self'`) was the only guard in run 1. In v3, a module that loads before Transformers.js wraps `fetch`: it logs each URL and **refuses** any URL outside the extension. A job passes only if the log contains its own model files (the positive control) and no foreign attempt.

**Changes for run 2 (probe v3):** the fetch log above; an E3-wasm-fp32 configuration; and a **Download JSON** button, which saves the record to the Downloads folder.
