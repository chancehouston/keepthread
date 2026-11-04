// R4 probe service worker: opens the bench page, and answers the context checks R3 left open
// (can an MV3 service worker construct a Worker? does it see the Prompt API?).
chrome.action.onClicked.addListener(() => chrome.tabs.create({ url: 'bench.html' }));

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.target !== 'background' || msg.cmd !== 'env') return;
  (async () => {
    let workerConstructible = false;
    let workerError = null;
    try {
      new Worker('worker.js', { type: 'module' }).terminate();
      workerConstructible = true;
    } catch (e) {
      workerError = String(e?.message ?? e);
    }
    reply({
      context: 'service worker',
      workerDefined: typeof Worker !== 'undefined',
      workerConstructible,
      workerError,
      webgpu: !!self.navigator?.gpu,
      ...(await promptApi()),
    });
  })();
  return true;
});

async function promptApi() {
  if (typeof LanguageModel === 'undefined') return { languageModel: 'undefined' };
  try {
    return { languageModel: await LanguageModel.availability() };
  } catch (e) {
    return { languageModel: `error: ${e?.message ?? e}` };
  }
}
