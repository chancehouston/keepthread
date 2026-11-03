// R2 live-page check (docs/research/page-adapter.md §5). Paste into the DevTools console on a live
// Reddit thread (current layout). It reports structure only, never usernames or comment text.
// It collapses one top-level comment with replies through its native <summary>, then re-expands it,
// and lists the network requests made during that window. Don't scroll or click while it runs (~5 s).
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const scrub = (u) => { try { return new URL(u).host + new URL(u).pathname.replace(/t[13]_\w+/g, 't_…'); } catch { return '?'; } };
  const out = { url: location.pathname.replace(/comments\/\w+\/[^/]*/, 'comments/…'), chrome: navigator.userAgentData?.brands?.map((b) => `${b.brand} ${b.version}`) };
  const cs = [...document.querySelectorAll('shreddit-comment')];
  out.comments = cs.length;
  out.withOpenShadowRoot = cs.filter((c) => c.shadowRoot).length;
  const controls = {};
  for (const c of cs.slice(0, 25)) {
    if (!c.shadowRoot) continue;
    for (const el of c.shadowRoot.querySelectorAll('button, [role="button"], summary, details')) {
      const label = (el.getAttribute('aria-label') || '').replace(/u\/\S+|from \S+/g, '…');
      const key = `${el.tagName.toLowerCase()} | aria-label="${label}" | aria-expanded=${el.getAttribute('aria-expanded')}`;
      controls[key] = (controls[key] || 0) + 1;
    }
  }
  out.shadowRootControls = controls;
  const target = cs.find((c) => c.getAttribute('depth') === '0' && c.querySelector(':scope > details[open]') && c.querySelector('shreddit-comment'));
  if (!target) { console.log('No expanded top-level comment with replies found.', out); return; }
  const det = target.querySelector(':scope > details');
  const sum = det.querySelector(':scope > summary');
  const state = () => ({ detailsOpen: det.open, collapsedAttr: target.hasAttribute('collapsed'), childVisible: !!target.querySelector('shreddit-comment')?.checkVisibility?.() });
  const n0 = performance.getEntriesByType('resource').length;
  out.before = state();
  sum.click(); await wait(2500); out.afterCollapse = state();
  sum.click(); await wait(2500); out.afterExpand = state();
  out.requestsDuringToggle = performance.getEntriesByType('resource').slice(n0).map((e) => `${e.initiatorType} ${scrub(e.name)}`);
  console.log(JSON.stringify(out, null, 2));
})();
