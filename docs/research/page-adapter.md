# R2: Finding comments, structure and native controls in Reddit's pages

**Status:** first pass, 2026-11-03, from the saved pages only; one live-page check is still open (§5). The owner saved five threads, logged in, on the current Reddit layout, as both "Webpage, Complete" and "Webpage, Single File" (MHTML). They are kept outside the repository (RD3). The analysis scripts read the files as data and kept no comment text; only counts and markup structure appear below.

## Verdict

**The current layout looks adapter-friendly.** Every loaded comment is a `shreddit-comment` element with a stable ID, its depth and its parent's ID as attributes, and its collapse state is a native `<details open>` element. Toggling `<details>` is client-side by definition (whether Reddit's own listener sends a request is the open check in §5). "More replies" controls are distinct elements that send a POST, so the executor can exclude them by construction. Ad slots are siblings of comments, never their ancestors.

**old.reddit was not sampled.** Given its restriction to recently active logged-in users (reddit-policy.md C14), the recommendation is to **support the current layout only** in the first experiment, and to have the adapter report "unsupported layout" anywhere else.

## 1. The sample

| Thread (subreddit) | Loaded / total comments | Words per comment: mean / median / max | Depth distribution (0, 1, 2, …) | Comments with media | Already collapsed by Reddit | "More replies" controls |
|---|---|---|---|---|---|---|
| r/Fauxmoi | 100 / 573 | 15.1 / 7 / 220 | 23, 32, 25, 11, 7, 2 | 20 (11 GIFs, 9 images) | 0 | 52 |
| r/SipsTea | 100 / 527 | 26.7 / 15 / 265 | 78, 15, 7 | 13 | 2 | 29 |
| r/AdviceAnimals | 100 / 671 | 38.0 / 31 / 155 | 60, 31, 7, 1, 1 | 1 | 0 | 47 |
| r/BrandNewSentence | 53 / 63 | 12.6 / 9 / 65 | 25, 14, 9, 3, 2 | 7 | 2 | 0 |
| r/pics | 100 / 502 | 42.2 / 25.5 / 323 | 34, 35, 20, 8, 3 | 3 | 2 | 30 |

Word counts are whitespace-separated tokens of the comment body's text, links and markup excluded.

**Findings:**

- **Reddit's initial load is about 100 comments**, capped at 100 in four of the five threads and complete in the fifth (53 of 63, where the rest were presumably removed or deleted). This matches the charter's first experiment exactly: "about 100 already-loaded comments" is what a reader sees without clicking anything.
- **Comments are short**: a mean of 13–42 words, against R3's central guess of 50. R3's input formula, `100 × (words × 1.33 + 12) + 1000`, gives about **3.9k–7.8k input tokens** per thread [est.]. That fits a 9k window in one prompt, though not WebLLM's prebuilt 4k one. The subtree map/reduce stays the default for headroom.
- **Thread shapes differ a lot**: from flat (r/SipsTea, 78 of 100 top-level) to deep (r/Fauxmoi, depth 5). The fixture set should keep both shapes.
- **Media is common in some subreddits**: GIF and image replies make up up to 20% of the comments. The charter's "keep meaningful media visible where practical" applies to these. A text-only model sees no content for them (see §3, `content-type`).

## 2. The markup (current layout)

| Element | Identification | Signals | Notes |
|---|---|---|---|
| The post | `shreddit-post` | `id` (`t3_…`), `comment-count` (total comments), `post-title`, `post-type`, `user-logged-in` | `comment-count` gives the M in "analyzed N of M" |
| A comment | `shreddit-comment` (exact tag; **not** a prefix match, because `shreddit-comment-tree-ad` and `shreddit-comment-badges` share the prefix) | `thingid` (`t1_…`, stable), `depth`, `parentid` (absent at depth 0), `postid`, `permalink`, `content-type` (`text`, `image`, `giphy`, `video`), `score`, `created`, `collapsed` (present when collapsed), `is-author-deleted`, `is-mod-distinguished` | Every `parentid` resolved to a loaded comment (0 orphans in all five threads). Children sit in a `slot="children-<parent id>-<n>"` |
| A comment's body | `div[slot="comment"]` whose `id` is `<thingid>-comment-rtjson-content` | | One per comment. Two comments had no body (one deleted author, one media-only) |
| Collapse state and control | `shreddit-comment > details[role="article"]`, toggled by its `summary` | `open` present = expanded. Reddit's stylesheet shows a `.uncollapse-icon` and a `.comment-expand-control` only when it is not `open` | Native HTML `<details>`. Reddit had already collapsed comments that were mod-distinguished or by deleted authors |
| "More replies" | `faceplate-partial[loading="action"][method="post"]` with `slot="children"` | A hidden `cursor` input | **Sends a POST when activated: the executor must never touch it** (reddit-policy.md constraint 1). Other `faceplate-partial` elements use `loading="programmatic"` or `"lazy"`, which Reddit triggers itself |
| Ad slots | `shreddit-comment-tree-ad` | `comment-id`, `placement`, `ad-type`, … | **Siblings after top-level comments, never ancestors of a comment** (0 of 453 comments sat inside one). Most were empty placeholders in the saved state. The adapter ignores them entirely: it never reads, counts, moves or toggles them |

**Personal data in the markup**, all of which the scrubber must remove from any committed fixture:

- `author`, `avatar` and `arialabel` on `shreddit-comment`;
- `aria-label` on the `details` element ("… Reply from <username> …");
- profile links;
- the comment bodies themselves (RD3);
- **the owner's own chat sidebar**, which is serialized into every saved page (room names and direct-chat partners).

## 3. Signals worth keeping for the curator (not decisions yet)

- `content-type` distinguishes text from GIF, image and video replies. A GIF reply can be humor that a text model can't see. The default is to keep the media reply's state tied to its parent exchange, never to score it as empty.
- `is-author-deleted` and `is-mod-distinguished`: Reddit collapses these itself, so the executor should leave them as they are.
- `score` is available, but the charter warns against simply following the highest-voted opinion. If it is used at all, it is a weak feature, never the ranking.
- `author` (and per-author grouping) is **not** used: comments are judged, not people (reddit-policy.md constraint 4).

## 4. Save formats

| Format | `shreddit-comment` count | Declarative shadow DOM | Comment's own shadow root | Recommendation |
|---|---|---|---|---|
| "Webpage, Complete" (`.htm`) | 100 | 746–1,130 `template[shadowrootmode]` per page | not serialized | **Use for fixtures** |
| "Webpage, Single File" (`.mhtml`) | 100 | 0 | not serialized | Not needed |

Neither format captures `shreddit-comment`'s own shadow root. Whether the live comment also renders a separate collapse button there (for example in the thread line) is unknown from the saved pages, so the live check covers it.

## 5. Open: the live-page check

Run once by the owner on a live thread, in Chrome DevTools: a short console snippet that reports structure only (no usernames or text), plus the Network tab while toggling.

1. Does `shreddit-comment` have an open `shadowRoot`, and which buttons with which `aria-label` values does it contain? This answers whether the positively identified control is the `summary` or a button in the shadow root.
2. Does toggling a comment through its native control send any network request (reddit-policy.md Q1)? Collapsing and expanding already-loaded children should not.
3. Does a manual toggle change the `collapsed` attribute and `details[open]` together? The executor and the override detection both depend on that.

## 6. Recommendations for the first spec

- **Supported layout:** the current Reddit layout only. Positive identification is the exact tags and attributes above, and all of them must be present; otherwise the adapter does nothing.
- **The executor's allowlist:** the native toggle of `shreddit-comment > details` (the control the live check confirms), and nothing else. Explicitly excluded: `faceplate-partial`, `shreddit-comment-tree-ad`, and every vote, award, share, reply and menu button.
- **Disclosure:** "analyzed N of M", with N the loaded `shreddit-comment` count and M the post's `comment-count`.
- **Fixtures:** generated from the "Webpage, Complete" saves by a scrubber that keeps the tags, attributes and tree shape, replaces text with synthetic text of the same word count, and removes the personal data listed in §2. A test asserts that no username or original sentence survives.
