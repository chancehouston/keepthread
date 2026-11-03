# CLAUDE.md — Conversation Curator

Guidance for Claude Code (and other AI agents) working in this repository. Keep this file current. When a decision changes, update it here.

## Mission

*To be written.* The project has not been described yet. Start with `/speckit-constitution` to set its principles, then replace this section with: what the project is, who it is for, and what "done" means for its first release. Until then, ask the owner before assuming a domain, a language or a platform.

## Tone and claims policy

Stay neutral and technical. Never claim what has not been measured or verified; say "designed to…" or "assumed…" until it is. Record every assumption where the project keeps them (to be decided with the constitution).

## Workflow: Spec-Driven Development (GitHub Spec-Kit)

All features go through Spec-Kit. The project principles live in [.specify/memory/constitution.md](.specify/memory/constitution.md), and they override this file if the two ever conflict. The constitution is still the unfilled template: run `/speckit-constitution` first.

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

- 2026-11-03: Repository bootstrapped from the rr-dr60-emu setup (Spec-Kit skills and scaffolding, the three helpers retargeted to be domain-generic, these conventions). The project itself is not described yet: next is `/speckit-constitution`.
