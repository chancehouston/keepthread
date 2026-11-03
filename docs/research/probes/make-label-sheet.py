#!/usr/bin/env python3
"""Turn a saved Reddit thread ("Webpage, Complete" .htm) into a local labeling sheet (R5).

Usage: python3 -I make-label-sheet.py <saved-page.htm> <output-dir>

Writes <output-dir>/labels.csv (one row per comment, in page order) and
<output-dir>/material-points.md. Usernames, avatars and vote scores are left out on purpose
(docs/research/evaluation-rubric.md, principle 1). The output contains third-party comment text,
so it must stay out of git: use docs/research/fixtures/raw/<thread>/ (gitignored, RD3).
"""
import csv
import os
import re
import sys
from html.parser import HTMLParser

VOID = {"br", "img", "hr", "input", "meta", "link", "source", "wbr", "area", "col", "embed", "param", "track"}
BLOCK = {"p", "li", "blockquote", "pre", "h1", "h2", "h3", "h4", "h5", "h6", "tr"}


class Thread(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.comments = []  # dicts in page order
        self.by_id = {}
        self.body = None  # [thingid, open-tag depth, text parts, media count]
        self.title = ""
        self.total = ""

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "shreddit-post" and not self.title:
            self.title = a.get("post-title", "")
            self.total = a.get("comment-count", "")
        if tag == "shreddit-comment" and "thingid" in a:
            c = {
                "thingid": a["thingid"],
                "parent": a.get("parentid") or "",
                "depth": int(a.get("depth", "0")),
                "type": a.get("content-type", ""),
                "reddit_collapsed": "collapsed" in a,
                "deleted": "is-author-deleted" in a,
                "text": "",
            }
            self.comments.append(c)
            self.by_id[c["thingid"]] = c
        if tag == "div" and a.get("slot") == "comment" and (a.get("id") or "").endswith("-comment-rtjson-content"):
            self.body = [a["id"][: -len("-comment-rtjson-content")], 0, [], 0]
        if self.body is not None:
            if tag in ("img", "video", "shreddit-player", "figure"):
                self.body[3] += 1
            if tag == "blockquote":
                self.body[2].append("\n> ")
            if tag not in VOID:
                self.body[1] += 1

    def handle_endtag(self, tag):
        if self.body is None or tag in VOID:
            return
        if tag in BLOCK:
            self.body[2].append("\n")
        self.body[1] -= 1
        if self.body[1] == 0:
            thingid, _, parts, media = self.body
            text = re.sub(r"[ \t]+", " ", "".join(parts))
            text = re.sub(r"\s*\n\s*", "\n", text).strip()
            c = self.by_id.get(thingid)
            if c is not None:
                c["text"] = text
                c["media"] = media
            self.body = None

    def handle_data(self, data):
        if self.body is not None:
            self.body[2].append(data)


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    src, out = sys.argv[1], sys.argv[2]
    t = Thread()
    with open(src, encoding="utf-8", errors="replace") as f:
        t.feed(f.read())
    short = {c["thingid"]: f"c{i + 1:03d}" for i, c in enumerate(t.comments)}
    os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, "labels.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["id", "parent", "depth", "type", "reddit_collapsed", "text", "keep (K/N/C)", "tags", "notes", "thingid"])
        for c in t.comments:
            text = c["text"]
            if c["type"] == "giphy":
                text = (text + " [GIF]").strip()
            elif c["type"] in ("image", "video") or (not text and c.get("media")):
                text = (text + f" [{c['type'] or 'media'}]").strip()
            if c["deleted"]:
                text = text or "[deleted]"
            w.writerow([short[c["thingid"]], short.get(c["parent"], ""), c["depth"], c["type"],
                        "yes" if c["reddit_collapsed"] else "", text, "", "", "", c["thingid"]])
    with open(os.path.join(out, "material-points.md"), "w", encoding="utf-8") as f:
        f.write(f"# Material points: {t.title}\n\n")
        f.write("List 5-10 points a fair summary must contain (evaluation-rubric.md, Phase A).\n")
        f.write("Format: `- <one-line point> | ids: c012, c045 | minority? dissent?`\n\n- \n")
    print(f"{len(t.comments)} comments (post says {t.total} total) -> {out}")
    missing = sum(1 for c in t.comments if not c["text"])
    if missing:
        print(f"note: {missing} comments have no text (media-only or deleted)")


if __name__ == "__main__":
    main()
