// Imported first in the worker, before Transformers.js and ONNX Runtime capture `fetch`.
// Logs every fetch the worker attempts and refuses any URL outside the extension's own origin.
// Stage 1 run 1 showed that Resource Timing records nothing for chrome-extension:// fetches, so it
// could not show any request at all. This log is the replacement. Its positive control: the
// extension's own model files must appear in it (a job with an empty log is a failed check).
const ORIGIN = self.location.origin;
const log = { self: 0, selfBytesHint: [], foreign: [] };
const realFetch = self.fetch.bind(self);

self.fetch = (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, self.location.href);
  if (url.origin !== ORIGIN) {
    log.foreign.push(url.origin);
    return Promise.reject(new TypeError(`R4 probe: blocked fetch outside the extension (${url.origin})`));
  }
  log.self++;
  if (log.selfBytesHint.length < 20) log.selfBytesHint.push(url.pathname.split('/').slice(-2).join('/'));
  return realFetch(input, init);
};

export const networkLog = () => ({
  selfFetches: log.self,
  selfFiles: log.selfBytesHint,
  foreignAttempts: log.foreign,
  ok: log.self > 0 && log.foreign.length === 0,
});
