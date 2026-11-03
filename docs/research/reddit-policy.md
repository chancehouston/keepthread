# R1: What Reddit's current policies say about this extension

**Checked:** 2026-11-03, by the product specialist (desk research). **Not legal advice.** Each interpretation carries a confidence level; the quoted text is verbatim from the sources as fetched on that date.

**How the text was retrieved:** WebFetch is blocked on redditinc.com, so its pages were downloaded with `curl`. The Reddit Help Center HTML pages return 403, so those two articles came from the Help Center's public Zendesk API, which also supplied their `edited_at` dates. The Reddit brand-guidelines site renders in JavaScript, so its text could not be retrieved (see Q4).

## Verdict

**Personal, unpublished use: go with constraints.** No clause found prohibits a user's own extension from reading a page they have already loaded, running a local model on it, and toggling native collapse controls. Two broad User Agreement clauses could be read against it: §7, which bars collecting data "by any means (automated or otherwise)", and §3, which bars modifying or preparing derivative works of Content. Everything quoted that covers AI concerns **training**, not inference.

**Public distribution: plausible later, but not as designed today.** Three things block or condition it:

1. The name. "Reddit" in an app name needs written consent.
2. Any monetization, which needs a separate agreement.
3. Chrome's rules on browsing data.

The main risk is **the project's own data handling**, not the extension: committed fixtures of other people's comments, and the charter's "fine-tune or distill" path.

## The clauses

Legend for the last two columns: (a) personal and unpublished; (b) later public distribution.

| # | Source and clause | What the text says | (a) Personal, unpublished | (b) Public distribution | Confidence |
|---|---|---|---|---|---|
| C1 | **User Agreement §7** ("Things You Cannot Do"). Effective 2026-07-01, last revised 2026-05-26 | "Access, search, or collect data from the Services by any means (automated or otherwise) except as permitted in these Terms or in a separate agreement with Reddit (… scraping the Services without Reddit's prior written consent is prohibited)" | The user accesses the page themselves, and the extension makes no requests. In our reading, processing content the browser has already received, in memory, without storing it, is not "scraping". The clause is broad enough to argue otherwise, but enforcement visibly targets bulk collection: Reddit's 2026 RSS, .json and API shutdowns all cite "large-scale scraping". **Low risk** | The same reading applies. A store listing that says "reads Reddit comments" will draw more scrutiny than a private build. **Low to medium risk** | Medium |
| C2 | **User Agreement §3** (license restrictions) | "you may not, without our written agreement: … modify, prepare derivative works of, disassemble, decompile, or reverse engineer any part of the Services or Content; or access the Services or Content in order to build a similar or competitive website, product, or service" | Collapsing through native controls does not modify the Services. A TL;DR shown only to the reader is arguably a "derivative work" of Content, but it is ephemeral and private. **Low risk** | This is the clause Reddit would point to against a distributed summarizer. Mitigations: make every TL;DR line source-linked, keep nothing, never present the result as a substitute site. **Medium risk** | Medium |
| C3 | **User Agreement §7** and **Reddit Rules, Rule 8** (Rules effective 2026-07-01) | §7: "Use the Services in any manner (automated, including via bots, or otherwise) that could interfere with, disable, disrupt, overburden, or otherwise impair the Services". Rule 8: "Don't break the site or do anything that interferes with normal use of Reddit." | Client-side collapse toggles add no server load, provided they really are client-side (Q1). Automatically clicking "load more comments" or "continue thread" **would** generate requests. **Low risk if the executor never triggers a network fetch** | Same | Medium-high |
| C4 | **User Agreement §16** (Additional Terms) | "If you use any of our Developer Services (including our APIs), you must also agree to the Reddit Developer Terms." | The extension uses no Developer Services, so in our reading the Developer Terms and Data API Terms do not bind it directly. They show how Reddit thinks about apps, which is why they appear below. | If the product ever used the API (for example to "load more"), all of the Developer Terms would apply. Keep it API-free. | Medium |
| C5 | **Developer Terms**, preamble and §4.2. Effective 2024-09-24, last revised 2026-03-24 | §4.2 bars any App that would "access or use the Reddit Services and Data through any means (including by accessing our API or indexing, caching, or crawling …) to train large language, artificial intelligence, or other algorithmic models or related services without our permission" | Does not apply directly (C4). The restriction covers **training**; no clause restricting content as **inference input** was found. **Design constraint: no training or fine-tuning on Reddit content.** | Same constraint. It also shapes the charter's "fine-tune or distill" path. | High (on what the text says) |
| C6 | **Developer Terms §4.2** | Bars Apps that "interfere with, modify, disrupt, or disable features or functionality of any Reddit Services and Data", and any behavior "likely to violate our Public Content Policy" | Using native controls (no DOM removal, no ad interference) stays clear of "disable features" in spirit. | Same | Medium |
| C7 | **Developer Terms §5.2** and **Data API Terms §2.4** (Data API Terms last revised 2026-07-20) | "no other rights or licenses are granted or implied, including any right to use User Content for other purposes, such as for training a machine learning or artificial intelligence model, without the express permission of rightsholders". §5.2 also requires apps to provide "a link back to the User Content on our Services, cite the applicable User's username" | Reinforces C5: users own their comments. Source-linking every TL;DR line matches the attribution expectation. | Attribution is cheap and should be kept | High (on what the text says) |
| C8 | **Developer Terms §3.3** (deletion) | "if any User Content is deleted … you will delete or modify that User Content … as soon as possible" | Satisfied automatically if nothing is stored (in memory, per page view). | Becomes an explicit privacy guarantee | Medium-high |
| C9 | **Developer Terms §5.3** and **Data API Terms §4.1** (trademarks) | "you are not permitted to use the Reddit Trademarks in the name of your App or to promote or identify your App … without Reddit's prior written consent". Data API Terms §4.2 grants a "[name] for Reddit" wordmark license **only** "When you use the Data APIs" | The working name is harmless in a private build | **Blocker.** Without the Data API, even "X for Reddit" is not licensed. Rename (for example "Conversation Curator") and use "Reddit" only descriptively. No Snoo, and no logo derived from Reddit's logo. | High |
| C10 | **Developer Terms §4.1** (commercial use) | Bars use "by or on behalf of a business or as part of a service or product that is monetized" and deriving "revenues of any kind … including from any data derived" | Not applicable | Monetization needs a separate agreement with Reddit | High |
| C11 | **Public Content Policy** (Help Center; edited 2026-10-06) | "you can use Reddit content for non-commercial uses, such as learning and community, but talk to us if you have commercial purposes in mind." Licensees may not "use public content to segment, target, or profile users based on their … political affiliation or beliefs" or perform "individual profiling, psychographic segmentation" | Supports personal, non-commercial use. The profiling restrictions signal where Reddit draws lines. | Same | Medium |
| C12 | **Responsible Builder Policy** (Help Center; created 2025-10-28, edited 2026-10-05) | "applies to everyone —whether you're a developer, moderator, researcher, or an app." "You must not sell, license, share, or otherwise commercialize Reddit data … This extends to commercial and non-commercial mining, scraping, or using data for purposes like ads targeting or to train machine learning or AI models." "**Zero Tolerance**: You are strictly prohibited from processing data to derive or infer potentially sensitive characteristics about Reddit users (e.g., health, political affiliation, sexual orientation)." "Apps must not manipulate Reddit's features (e.g., voting, karma)" | The policy most likely to bite. (1) Training is out, even non-commercial. (2) **The curator must score comments and exchanges, never people.** Per-username aggregates, labels or stance inferences risk the zero-tolerance clause. (3) No voting satisfies the feature-manipulation clause. | Same; a reviewer will read "detects manipulation" as profiling users, so the claims denylist is a compliance matter as well as an honesty one | Medium-high |
| C13 | **robots.txt** (fetched 2026-11-03) | `User-agent: * / Disallow: /`, with a pointer to the Public Content Policy | Applies to crawlers; the extension does not crawl | Same | High |
| C14 | **Context, not policy:** Reddit's 2026 anti-scraping changes | Secondary reporting: unauthenticated .json endpoints closed (around May 2026), RSS ends 2026-11-13, new Data API requests closed 2026-10-31, public API access ends March 2027, and Old Reddit is being limited to logged-in users active in the last six months | Enforcement direction: anything that fetches looks like scraping. **Old Reddit is a shrinking layout to support (R2).** | Recheck immediately before any distribution | Medium (secondary sources; the primary posts were not fetched) |
| C15 | **Chrome Web Store program policies** (last updated 2025-05-22; Limited Use page 2022-11-01) | "Collection and use of web browsing activity is prohibited, except to the extent required for a user-facing feature described prominently in the Product's Chrome Web Store page and in the Product's user interface." Limited Use "also appl[ies] to scraped content or otherwise automatically gathered user data." "Request access to the narrowest permissions necessary." No implied endorsement. MV3: the "full functionality … must be easily discernible from its submitted code" | Not applicable while unpacked or unlisted | **Deferred:** (1) host permissions limited to reddit.com comment pages; (2) comment reading disclosed in both the listing and the UI; (3) runtime and logic bundled; model weights downloaded as data are plausibly fine (interpretation, to recheck); (4) no implied Reddit endorsement; avoid the word "bots" | Medium |

## Design choices that reduce risk (each one is load-bearing)

| Choice | Clauses it addresses |
|---|---|
| No network requests to Reddit: no API, no .json, no "load more" clicks | C1, C3, C4, C14 |
| Content processed in memory per page view; no comment text persisted | C1, C8, Chrome Limited Use |
| Inference only. No training, fine-tuning or distillation on Reddit content | C5, C7, C12 |
| Score comments and exchanges, never authors. No per-username history, aggregates or labels | C11, C12, the charter's "no account histories" |
| Native collapse controls only; no DOM removal; ads untouched | C2, C3, C6 |
| No posting, voting or moderation | C12 |
| Every TL;DR line links to its source comment | C2, C7 |
| Nothing leaves the machine | C12, Chrome Limited Use |
| Non-commercial | C10, C11 |

## Behaviors that look risky

1. **Committing fixtures of real comment text** redistributes other users' content (C7, C12 "share"). Scrubbing usernames is not enough: the comment text is the content. **Adopted (2026-11-03):** raw saved pages and full-text fixtures stay out of git. Only structural fixtures, with text replaced by placeholders or synthetic text, and the DOM map are committed. *Confidence: medium.*
2. **Using labeled Reddit threads to fine-tune or distill** counts as training (C5, C7, C12). Default: calibration (thresholds, prompt choices, choosing among pretrained models) is allowed; gradient updates on Reddit content are not, without permission. If a training gap appears, use non-Reddit or synthetic data. *Confidence: medium-high on the text; medium on where calibration ends.*
3. **Any per-author signal**, even within one thread, moves toward C12's profiling line. Default: labels attach to comments ("repeats an earlier point"), never to usernames. *Confidence: medium.*
4. **Auto-expanding "more replies" or "continue this thread"** creates extra requests (C3, C14). Default: never; disclose "analyzed N of M loaded comments".
5. **Expanding a comment may lazy-load its children** on some layouts. Verify before relying on it (Q1).

## Design constraints to carry into the constitution

1. **No requests on Reddit's behalf.** The extension sends no network request to Reddit domains and never triggers a control that does ("load more", "continue thread"). *Why:* User Agreement §7; 2026 anti-scraping enforcement.
2. **Ephemeral content.** Comment text and derived representations live only in memory for the current page view and are discarded on navigation. Only the owner's own evaluation records, with no third-party text, may persist. *Why:* Developer Terms §3.3; Chrome Limited Use; the charter.
3. **Inference, never training, on Reddit content**, without Reddit's and the rightsholders' permission. *Why:* Developer Terms §4.2 and §5.2, Data API Terms §2.4, Responsible Builder Policy.
4. **Content is judged, people are not.** Nothing is aggregated or labeled per username; no sensitive characteristic (including political affiliation) is inferred. *Why:* the Responsible Builder Policy's zero-tolerance clause; Public Content Policy.
5. **Fixtures carry structure, not other people's words.** *Why:* Developer Terms §5.2; the Responsible Builder Policy.
6. **No Reddit marks in the name or icon** of any build that leaves the owner's machine. *Why:* Developer Terms §5.3, Data API Terms §4.1, Chrome's impersonation rule.
7. **A policy recheck gates distribution**, and the date of every check is recorded here. *Why:* all five Reddit documents were revised in 2026; the API changes run through March 2027.

## Open questions

| # | Question | How to settle it | Default until settled |
|---|---|---|---|
| Q1 | Do the native collapse and expand controls trigger network requests on each supported layout? | R2: the owner watches the DevTools network panel while toggling, on live pages | The executor only collapses and never expands into unloaded content |
| Q2 | Is reading the rendered DOM in memory "collecting data" under User Agreement §7? | Only Reddit can answer; consider an inquiry through developer support before distribution | Proceed for personal use; ask before any public listing |
| Q3 | Does tuning thresholds or prompts on threads count as "training"? | Ask alongside Q2 | Allowed if no weights change and no Reddit text is kept as a dataset |
| Q4 | What do Reddit's brand guidelines say about third-party names and descriptive use? | Open https://redditbrand.lingoapp.com/s/Overview-orqY1E/ in a real browser; record the text and date | Assume the strictest reading (C9) |
| Q5 | Firefox Add-ons and Safari policies | Deferred with distribution | Note only |

## Product notes

- Pricing, monetization, launch and store listing are out of scope (personal milestone). Record "non-commercial" as a standing assumption.
- Rename the working title early; renaming at distribution touches more. **Done 2026-11-03: renamed to Keepthread.**
- The claims denylist also has a compliance reason: "detects manipulation" or "detects bots" reads as user profiling (C12).

## Sources (all checked 2026-11-03)

- Reddit User Agreement (effective 2026-07-01, last revised 2026-05-26): https://redditinc.com/policies/user-agreement
- Reddit Developer Terms (effective 2024-09-24, last revised 2026-03-24): https://redditinc.com/policies/developer-terms
- Reddit Data API Terms (effective 2023-06-19, last revised 2026-07-20): https://redditinc.com/policies/data-api-terms
- Reddit Rules (effective 2026-07-01): https://redditinc.com/policies/reddit-rules
- Public Content Policy (edited 2026-10-06): https://support.reddithelp.com/hc/en-us/articles/26410290525844-Public-Content-Policy (retrieved through https://support.reddithelp.com/api/v2/help_center/en-us/articles/26410290525844.json)
- Responsible Builder Policy (created 2025-10-28, edited 2026-10-05): https://support.reddithelp.com/hc/en-us/articles/42728983564564 (retrieved through https://support.reddithelp.com/api/v2/help_center/en-us/articles/42728983564564.json)
- Reddit robots.txt: https://www.reddit.com/robots.txt
- Reddit brand page: https://redditinc.com/brand. Guidelines at https://redditbrand.lingoapp.com/s/Overview-orqY1E/ not retrieved (rendered in JavaScript).
- Chrome Web Store program policies (last updated 2025-05-22): https://developer.chrome.com/docs/webstore/program-policies/policies
- Chrome Web Store Limited Use (last updated 2022-11-01): https://developer.chrome.com/docs/webstore/program-policies/limited-use
- Context, secondary sources: https://9to5mac.com/2026/10/01/reddit-is-making-two-changes-some-long-time-users-wont-like/ (2026-10-01); https://mjtsai.com/blog/2026/10/06/reddit-to-remove-rss/ (2026-10-06). Primary posts cited by them, not fetched: https://www.reddit.com/r/modnews/comments/1wubgvt/continuing_our_infrastructure_updates_whats/ and https://www.reddit.com/r/redditdev/comments/1wubcvf/moving_data_api_apps_to_the_developer_platform/
