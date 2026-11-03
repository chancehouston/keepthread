# Research spike: feasibility (2026-11-03)

This spike settles the charter's riskiest unknowns before the first spec, so that spec's success criteria are reachable. Its outputs are documents, fixtures and throwaway probes, not product code. It is not a Spec-Kit feature, because it ships nothing; it runs on the `research/feasibility` branch.

## Decisions

| ID | Decision | Date | Alternatives | Reason |
|---|---|---|---|---|
| RD1 | The spike runs before the constitution and the first spec | 2026-11-03 | The constitution first; the spike inside the first spec's plan | The stack and the quality gate depend on the findings; the model choice decides which success criteria are reachable |
| RD2 | Target browser: **Chrome first**. Firefox and Safari are planned, not dropped | 2026-11-03 | Cross-browser from the start | Chrome has the most mature WebGPU support and an on-device model API. Designs should keep a seam (avoid Chrome-only APIs, or isolate them behind an interface) so a later port is possible |
| RD3 | Fixtures carry structure, not other people's words; raw pages stay local | 2026-11-03 | Committing scrubbed full-text fixtures | User ownership of content and Reddit's ban on sharing data (reddit-policy.md C7, C12) |

## Questions

| # | Question | Method | Output | Status |
|---|---|---|---|---|
| R1 | What do Reddit's current terms allow for this behavior (reading the rendered page, activating native collapse controls)? | Desk research: current policy text, dated | `reddit-policy.md` | Done: go with constraints for personal use |
| R2 | Can comments, stable IDs, thread structure and native collapse controls be identified reliably, across layouts? | The owner saves thread pages manually (no automated requests); these are scrubbed into fixtures and their DOM is mapped | `page-adapter.md`, `fixtures/` | Done for the current layout (5 saved threads, 2 live checks); recommends setting `details.open`, not clicking |
| R3 | Which in-browser runtimes and tiny models are realistic in Chrome, and what carries over to Firefox and Safari? | Desk research | `model-landscape.md` | Done: shortlist E1–E3, G1–G4, B0; probe design ready |
| R4 | How do the shortlisted models perform on real threads? | A throwaway probe page that measures download size, memory, time to first result and total time | `benchmark-probe.md` | Needs R2 and R3 |
| R5 | How are "meaningful", "repetition", "dissent preserved" and "humor" judged? | A draft rubric; the owner labels one ~100-comment thread before seeing model output | `evaluation-rubric.md`, a labeled fixture | Not started |

The spike ends with a recommendation memo (`recommendation.md`) covering go/no-go, the stack, the model shortlist, the supported layouts and draft success criteria. It feeds `/speckit-constitution`, then `/speckit-specify`.

## Rules for this folder

- Every external claim cites a URL and the date it was checked. Policy text and library capabilities change, so nothing is quoted from memory.
- Figures come only from a probe run that printed them, ideally more than one run.
- **No third-party comment text in git** (reddit-policy.md, risky behavior 1). Raw saved pages stay outside the repo or under the gitignored `fixtures/raw/`. Committed fixtures are structural only: the DOM shape with the text replaced by placeholders or synthetic text, and no usernames.
- Reddit content is used for inference and evaluation only, never for training or fine-tuning (reddit-policy.md, C5/C12).
