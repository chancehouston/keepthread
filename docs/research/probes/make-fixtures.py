#!/usr/bin/env python3
"""Turn a saved Reddit thread ("Webpage, Complete" .htm) into R4 benchmark fixtures.

Usage: python3 -I make-fixtures.py <saved-page.htm> <name>

Writes two files, with the same comment IDs (c001, ... in page order) as make-label-sheet.py:

- docs/research/fixtures/structural/<name>.json: committable (RD3). The thread's shape only: parent,
  depth, content type and word count per comment, with **synthetic text** of the same word count drawn
  from a fixed word list. No usernames, Reddit IDs, scores, titles or original sentences.
- docs/research/fixtures/raw/<name>/thread.json: local and gitignored. The same shape with the real
  comment text, for the quality runs scored against the owner's labels. Never commit it.
"""
import importlib.util
import json
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
FIXTURES = os.path.join(HERE, "..", "fixtures")

# Common English words of mixed length, so the tokens-per-word ratio of the synthetic text is plausible.
WORDS = (
    "the of and to in is that it was for on are as with they be at one have this from or had by not but "
    "what some we can out other were all there when up use your how said an each she which do their time "
    "if will way about many then them write would like so these her long make thing see him two has look "
    "more day could go come did number sound no most people my over know water than call first who may down "
    "side been now find any new work part take get place made live where after back little only round man "
    "year came show every good me give our under name very through just form sentence great think say help "
    "low line differ turn cause much mean before move right boy old too same tell does set three want air "
    "well also play small end put home read hand port large spell add even land here must big high such "
    "follow act why ask men change went light kind off need house picture try us again animal point mother "
    "world near build self earth father head stand own page should country found answer school grow study "
    "still learn plant cover food sun four between state keep eye never last let thought city tree cross "
    "farm hard start might story saw far sea draw left late run while press close night real life few north "
    "honestly basically probably definitely literally actually everyone somebody whatever anyway"
).split()


def load_parser():
    spec = importlib.util.spec_from_file_location("labelsheet", os.path.join(HERE, "make-label-sheet.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.Thread


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    src, name = sys.argv[1], sys.argv[2]
    Thread = load_parser()
    t = Thread()
    with open(src, encoding="utf-8", errors="replace") as f:
        t.feed(f.read())
    short = {c["thingid"]: f"c{i + 1:03d}" for i, c in enumerate(t.comments)}
    rng = random.Random(f"keepthread-r4-{name}")  # deterministic per fixture
    structural, real = [], []
    for c in t.comments:
        words = len(c["text"].split())
        base = {"id": short[c["thingid"]], "parent": short.get(c["parent"]) or None, "depth": c["depth"],
                "type": c["type"] or "text", "deleted": c["deleted"], "redditCollapsed": c["reddit_collapsed"],
                "words": words}
        structural.append({**base, "text": " ".join(rng.choice(WORDS) for _ in range(words))})
        real.append({**base, "text": c["text"]})
    meta = {"fixture": name, "loaded": len(t.comments), "total": int(t.total or 0), "source": "R2 saved page"}
    out_s = os.path.join(FIXTURES, "structural", f"{name}.json")
    out_r = os.path.join(FIXTURES, "raw", name, "thread.json")
    os.makedirs(os.path.dirname(out_s), exist_ok=True)
    os.makedirs(os.path.dirname(out_r), exist_ok=True)
    with open(out_s, "w", encoding="utf-8") as f:
        json.dump({**meta, "text": "synthetic", "comments": structural}, f, indent=1)
        f.write("\n")
    with open(out_r, "w", encoding="utf-8") as f:
        json.dump({**meta, "text": "real (local only, never commit)", "comments": real}, f, indent=1)
        f.write("\n")
    print(f"{name}: {len(structural)} comments, {sum(c['words'] for c in structural)} words -> {out_s} (+ local raw)")


if __name__ == "__main__":
    main()
