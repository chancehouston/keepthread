// R4 probe offscreen document (reason WORKERS): runs each job in a fresh dedicated Worker, so that
// one configuration's memory and caches never carry into the next, and relays progress to the bench.
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.target !== 'offscreen') return;
  const work = msg.cmd === 'env' ? env() : runJob(msg.job);
  work.then(reply, (e) => reply({ error: String(e?.stack ?? e) }));
  return true;
});

async function env() {
  let languageModel = 'undefined';
  if (typeof LanguageModel !== 'undefined') {
    try { languageModel = await LanguageModel.availability(); } catch (e) { languageModel = `error: ${e?.message ?? e}`; }
  }
  return { context: 'offscreen document', crossOriginIsolated: self.crossOriginIsolated, webgpu: !!navigator.gpu, languageModel };
}

function runJob(job) {
  const w = new Worker('worker.js', { type: 'module' });
  return new Promise((ok, fail) => {
    w.onmessage = (e) => {
      if (e.data?.progress) chrome.runtime.sendMessage({ target: 'bench', progress: e.data.progress }).catch(() => {});
      else ok(e.data);
    };
    w.onerror = (e) => fail(new Error(`worker error: ${e.message}`));
    w.postMessage(job);
  }).finally(() => w.terminate());
}
