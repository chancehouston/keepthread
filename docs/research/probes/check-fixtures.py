#!/usr/bin/env python3
"""Leak check for the committable structural fixtures (RD3). Exit status 1 on any leak.

Usage: python3 -I check-fixtures.py [structural-dir] [raw-dir]

For each docs/research/fixtures/structural/<name>.json with a local raw/<name>/thread.json, it fails if:
- any run of 4 consecutive words from a real comment appears in the synthetic text;
- a Reddit ID (t1_/t3_/t2_), a "u/" username or a URL appears anywhere in the file;
- the shape differs from the raw copy (IDs, parents, depths, word counts), which would break the IDs
  that the owner's labels refer to.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
S_DIR = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "fixtures", "structural")
R_DIR = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, "..", "fixtures", "raw")
FORBIDDEN = re.compile(r"\bt[123]_[0-9a-z]+|\bu/[A-Za-z0-9_-]+|https?://|www\.", re.I)


def shingles(text, n=4):
    w = re.findall(r"[a-z0-9']+", text.lower())
    return {" ".join(w[i:i + n]) for i in range(len(w) - n + 1)}


def main():
    problems, checked = [], 0
    for fn in sorted(os.listdir(S_DIR)):
        if not fn.endswith(".json"):
            continue
        name = fn[:-5]
        s_raw = open(os.path.join(S_DIR, fn), encoding="utf-8").read()
        if m := FORBIDDEN.search(s_raw):
            problems.append(f"{name}: forbidden token {m.group(0)!r}")
        s = json.loads(s_raw)
        rp = os.path.join(R_DIR, name, "thread.json")
        if not os.path.exists(rp):
            print(f"{name}: no local raw copy; only the token check ran")
            continue
        r = json.load(open(rp, encoding="utf-8"))
        real = set().union(*(shingles(c["text"]) for c in r["comments"]))
        synth = set().union(*(shingles(c["text"]) for c in s["comments"]))
        if overlap := real & synth:
            problems.append(f"{name}: {len(overlap)} real 4-word sequences in synthetic text, e.g. {sorted(overlap)[0]!r}")
        key = lambda c: (c["id"], c["parent"], c["depth"], c["words"])
        if [key(c) for c in s["comments"]] != [key(c) for c in r["comments"]]:
            problems.append(f"{name}: shape differs from the raw copy")
        checked += 1
    for p in problems:
        print("LEAK:", p)
    print(f"{checked} fixtures compared with their raw copies; {len(problems)} problems")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
