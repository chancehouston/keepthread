# CLAUDE.md — Keepthread

Guidance for Claude Code (and other AI agents) working in this repository. Keep this file current. When a decision changes, update it here.

## Mission

**Keepthread** (working title until 2026-11-03: "Reddit Conversation Curator"): a personal, self-contained browser extension that helps a reader find meaningful conversation in Reddit comment threads. The charter is [docs/charter.md](docs/charter.md) (concept baseline, 2026-11-03); it is the source of the vision, the boundaries and the first experiment until the constitution is written. **North Star:** reduce manipulation and repetition without stripping away the humanity of the discussion.

- **First milestone:** a personal experimental extension, not a commercial Reddit client. One extension, one codebase (the "strategic monolith"), local inference, no separately installed AI service. Benchmark before adding infrastructure.
- **Shape:** a Reddit page adapter (already-rendered comments and native controls only) → a conversation representation (stable identifiers) → a curator (scores) → a source-linked TL;DR that keeps material disagreement and minority views → a UI executor that applies recommended states through Reddit's native collapse/expand controls → an evaluation harness. The model recommends identifiers and states; deterministic code performs the permitted UI actions. No model-directed browser actions.
- **First experiment:** about 100 already-loaded comments in one discussion, compared against unfiltered reading (memory, time to first result, relevance, missing counterarguments, false positives, preference).

## Boundaries (from the charter; the constitution will carry them)

- Never remove Reddit DOM nodes to hide comments, and never touch ads or promoted content. Use only positively identified native collapse/expand controls; otherwise do nothing.
- Never post, vote, moderate or act for the user. No extra automated requests, crawling or account-history collection.
- Inference stays local: no browsing data transmitted, no persistent user profiles.
- Never claim to identify bots, propaganda, coordinated networks or intent with certainty. Judge conversational behavior, never agreement with an ideology: strong disagreement and sincere advocacy are not manipulation.
- Do not assume the design complies with Reddit's terms: review the policies before implementation and before any distribution.

## Tone and claims policy

Stay neutral and technical. Never claim what has not been measured or verified; say "designed to…" or "assumed…" until it is. Record every assumption where the project keeps them (to be decided with the constitution).

## Workflow: Spec-Driven Development (GitHub Spec-Kit)

All features go through Spec-Kit. The project principles live in [.specify/memory/constitution.md](.specify/memory/constitution.md), and they override this file if the two ever conflict. The constitution is still the unfilled template: run `/speckit-constitution` first, from [docs/charter.md](docs/charter.md).

1. `/speckit-specify` → 2. `/speckit-clarify` → 3. `/speckit-plan` → 4. `/speckit-checklist` (optional) → 5. `/speckit-tasks` → 6. `/speckit-analyze` → 7. `/speckit-implement` → 8. `/speckit-converge`

- Specs live in `specs/NNN-feature-name/` (sequential numbering), each on its own `NNN-feature-name` branch, never on `main`.
- **The cadence:** specify with a Decisions-for-sign-off table → the draft reviews (coach, technical, product) applied at their defaults → `/speckit-clarify` (up to five questions to the owner, the reviews' open questions first, the answers encoded into the spec) → the owner's spec sign-off → plan with the three plan reviews → the owner's plan sign-off → tasks → test-first implementation → the post-implementation coach and technical reviews → the full gate → the PR → converge → the owner merges → the post-merge records.
- **Owner sign-offs** are at the spec, the plan and the merge only. Otherwise the agent proceeds at the recommended defaults and stops only on a failed check or a new decision. Documents lead with decisions and findings.
- **Restatements, not silent changes:** when implementation finds that an approved text cannot hold as written, record a dated restatement in the spec's Clarifications and amend the artifacts in place.
- **Every requirement, success criterion and acceptance scenario names a test**, and every named test must be able to fail (show it failing on a mutant before relying on it). Check that a quoted test command actually runs the tests it claims (its count).
- **Figures in the records are reproduced, not quoted:** a reviewer's or a run's number goes into a record only after the harness prints it, ideally from more than one run.

## The helpers (`.claude/agents/`)

- **`speckit-coach`**: "what's next?", "poke holes in my spec/plan/tasks", process and requirement quality.
- **`technical-reviewer`**: technical substance (correctness, architecture, performance, test validity, evidence gaps). Read-only: it reports findings and proposed fixes, and the main agent applies them.
- **`product-specialist`**: users, positioning, scope, store compliance and claims wording, and the capabilities the product needs (as ready-to-paste feature descriptions). It may write only under `docs/product/`.

## Repository standards

- **Conventional Commits** (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `ci:`).
- Commit or push only when asked; never on `main` directly (branch first). Revert a probe by the specific file, never `git checkout -- .`.
- The gate before declaring work done: to be set with the stack (format, lint with warnings as errors, the full test suite, coverage once it exists).
- A CHANGELOG (Keep a Changelog) once there is a first release.

## Current status

### Bookmark: resume here (set 2026-11-03)

PR [#1](https://github.com/chancehouston/keepthread/pull/1) (R1–R3, R5 draft) was merged into `main` on 2026-11-03. R4 work goes on the `research/r4-benchmark` branch. Public repo: https://github.com/chancehouston/keepthread.

- **Done:** R1 Reddit policy (go with constraints), R2 page adapter (current layout; set `details.open`, never synthesize clicks), R3 model shortlist (E1–E3, G1–G4, B0) and the R4 probe design, R5 rubric draft.
- **Waiting on the owner:**
  1. Label `docs/research/fixtures/raw/pics/labels.csv` and fill in its `material-points.md` (local, gitignored; about an hour). Don't run models on that thread first.
  2. Load the R4 probe (`docs/research/probes/r4/ext`, unpacked) and paste its JSON: steps in docs/research/benchmark-probe.md "How to run it".
- **R4 decisions (owner, 2026-11-03):** fetch model files once from Hugging Face at setup, then no network (R4-D1); ~3 GB downloads are acceptable (R4-D2). Stage 1 (embeddings E1–E3) run 1 is recorded in benchmark-probe.md (20 of 28 jobs; E3-webgpu-fp32 unfinished; the Chrome crashes are diagnosed: reading a packaged `chrome-extension://` file over ~1 GB crashes Chrome 156's browser process, streamed or buffered, so models must load from OPFS/Cache Storage or stay under ~1 GB per file). Next: stage 2 with an OPFS model store, tested first on a >1 GB read.
- **Next for the agent:** record stage 1's figures from the owner's JSON; add memory sampling; build stage 2 (G1–G4 on Transformers.js/WebLLM/wllama, and B0). Then score against the owner's labels, write `docs/research/recommendation.md`, then `/speckit-constitution` (from the charter plus reddit-policy.md's seven principles), then the first spec.
- **Later:** rename the local folder (`Conversation Curator` → `keepthread`), which moves the session memory path. Re-label 20 random comments, at least three days after the first labeling, for the rubric's reliability check.

### Log

- 2026-11-03: Repository bootstrapped from the rr-dr60-emu setup (Spec-Kit skills and scaffolding, the three helpers retargeted to be domain-generic, these conventions). The owner's charter is in `docs/charter.md`. Next: `/speckit-constitution` from the charter, then the first spec (the ~100-comment experiment). The charter's open research questions (which tiny local models judge well enough in a browser, calibrating to keep dissent and humor, finding native controls across layouts, Reddit's policies, partial loading) are candidates for the first research tasks.
- 2026-11-03: **Renamed to Keepthread**: Reddit's terms bar its trademark in an app name (docs/research/reddit-policy.md C9). **MIT license.** The repository is to be published publicly on GitHub, so nothing private goes in: no raw saved pages and no third-party comment text (RD3).
- 2026-11-03: **Research spike first** ([docs/research/README.md](docs/research/README.md)), on the `research/feasibility` branch. It is a documented exception to Spec-Kit, because it ships documents and throwaway probes, not product code. The constitution and the first spec follow it. **Chrome first**; Firefox and Safari are planned, so isolate Chrome-only APIs behind a seam.
- 2026-11-03: The three helpers now each have a "This project" section taken from the charter: the coach checks charter traceability, boundary FRs, operational definitions and claims wording; the technical reviewer covers adapter fragility, boundary-invariant tests, comments as untrusted input, local inference and evaluation validity; the product specialist is scoped to a personal milestone, Reddit policy and trademark, and the claims denylist.
