// R2 live-page check, run 2 (docs/research/page-adapter.md §5): does toggling make Reddit send analytics events?
// Paste into the DevTools console on a live Reddit thread (current layout). Don't scroll, click or move
// the mouse over the page while it runs (~45 s). It reports counts only, never usernames or comment text.
// It collapses and re-expands six top-level comments, three by clicking <summary> and three by setting
// details.open, and leaves everything expanded as it found it.
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const entries = () => performance.getEntriesByType('resource');
  const isEvent = (e) => /\/svc\/shreddit\/events/.test(e.name);
  const visible = (c) => !!c.querySelector('shreddit-comment')?.checkVisibility?.();
  const targets = [...document.querySelectorAll('shreddit-comment[depth="0"]')]
    .filter((c) => c.querySelector(':scope > details[open]') && c.querySelector('shreddit-comment'))
    .slice(0, 6);
  if (targets.length < 6) { console.log(`Need 6 expanded top-level comments with replies; found ${targets.length}. Try a bigger thread.`); return; }
  const byClick = targets.slice(0, 3);
  const byProperty = targets.slice(3, 6);
  const details = (c) => c.querySelector(':scope > details');
  const out = { chrome: navigator.userAgentData?.brands?.map((b) => `${b.brand} ${b.version}`) };
  const measure = async (label, act) => {
    const n0 = entries().length;
    await act();
    await wait(6000);
    const added = entries().slice(n0);
    out[label] = { analyticsEvents: added.filter(isEvent).length, otherRequests: added.filter((e) => !isEvent(e)).map((e) => { try { return new URL(e.name).pathname.replace(/t[13]_\w+/g, 't_…'); } catch { return '?'; } }) };
  };
  await measure('1 idle, no toggles', async () => {});
  await measure('2 collapse 3 by summary click', async () => { for (const c of byClick) { details(c).querySelector(':scope > summary').click(); await wait(400); } });
  out['2 state'] = byClick.map((c) => ({ open: details(c).open, repliesVisible: visible(c) }));
  await measure('3 expand 3 by summary click', async () => { for (const c of byClick) { details(c).querySelector(':scope > summary').click(); await wait(400); } });
  await measure('4 collapse 3 by details.open=false', async () => { for (const c of byProperty) { details(c).open = false; await wait(400); } });
  out['4 state'] = byProperty.map((c) => ({ open: details(c).open, repliesVisible: visible(c), collapsedAttr: c.hasAttribute('collapsed') }));
  await measure('5 expand 3 by details.open=true', async () => { for (const c of byProperty) { details(c).open = true; await wait(400); } });
  await measure('6 idle again', async () => {});
  out['final all open'] = targets.every((c) => details(c).open);
  console.log(JSON.stringify(out, null, 2));
})();
