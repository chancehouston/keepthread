# Keepthread — Project Charter
**Milestone:** Concept baseline · November 3, 2026  
**Status:** Agreed direction, not yet implemented  
**Name:** Keepthread (2026-11-03), formerly the working title "Reddit Conversation Curator". It was renamed because Reddit's terms bar its trademark in an app name.

## Vision
A personal, self-contained browser extension that helps a reader find meaningful conversation in Reddit comment threads. Reduce repetition, spam-like behavior, apparent steering and manipulation while preserving humor, disagreement, personality, and the ability to inspect everything.

**North Star:** Reduce manipulation and repetition without stripping away the humanity of the discussion.

## Experience
On opening a Reddit post, the extension analyzes **comments already loaded in the page**, including the post, parent comments, and conversational thread structure. It produces a concise, balanced TL;DR with links to supporting original comments. It recommends coherent exchanges to keep expanded and others to collapse. The reader can always override its choices with Reddit's native controls. Meaningful media and GIFs belonging to selected exchanges should remain visible where practical.

The summary should reflect disagreement and minority views, not simply the highest-voted or most repeated opinion. Clearly disclose when only a subset of comments has been analyzed.

## Architecture: strategic monolith
One browser extension, one codebase, local inference, no separately installed AI service initially. Keep internal responsibilities distinct:
1. Reddit page adapter: extract already-rendered comments and native controls.
2. Conversation representation: post, comments, parents, replies, media, stable identifiers.
3. Curator: score relevance, substance, repetition, contextual contribution and observable persuasion-oriented patterns.
4. Summarizer: source-linked TL;DR that preserves material disagreements.
5. UI executor: apply recommended states using native collapse/expand controls.
6. Evaluation harness: compare model quality, latency, memory, and user preference.

The model **recommends identifiers and states**; deterministic code performs permitted UI actions. No model-directed browser actions. Avoid introducing a local server unless measurement justifies it.

## Boundaries
- Never remove Reddit DOM nodes to hide comments, or manipulate ads/promoted content.
- Use only positively identified native comment collapse/expand controls; otherwise do nothing.
- Do not post, vote, moderate, or impersonate the user in social interactions.
- Do not make extra automated requests to crawl Reddit or collect account histories.
- Keep inference local; avoid transmitting browsing data or creating persistent user profiles.
- Do not assume this design guarantees compliance with Reddit's terms; review policies before implementation and distribution.
- Do not claim to identify bots, propaganda, coordinated networks, or human intent with certainty.
- Evaluate conversational behavior, not agreement with an ideology. Strong disagreement and sincere advocacy are not automatically manipulation.

## Model strategy
Search for existing very small local models first. Test compact classification/embedding models and a small instruction model for contextual assessment and summarization. Make model replacement easy. Fine-tune or distill only after establishing benchmark gaps. Model size alone does not guarantee acceptable judgment quality.

## First experiment
Limit to approximately 100 comments **already loaded** in one discussion. Extract the thread; create a source-linked TL;DR; score and select exchanges; apply reversible collapse/expand recommendations. Compare against unfiltered Reddit reading.

Measure: model download and resident memory, time to first useful result, total processing time, relevance of expanded exchanges, missing important counterarguments, false positives, and whether the curated experience is genuinely preferable.

## Explicitly deferred
Reddit-wide coordinated-influence detection; account history collection; sophisticated GIF/image interpretation; backend service; public distribution; model training from scratch; automatic analysis of unloaded comments.

## Open research questions
- Which tiny models deliver acceptable contextual judgments in a browser?
- How should scoring be calibrated to preserve dissent and humor?
- How reliably can Reddit's native controls be identified across layouts?
- What Reddit policy restrictions apply to this precise extension behavior?
- How should the system behave when only some comments are loaded?

## Decision record
The first milestone is **a personal experimental extension, not a commercial Reddit client**. Start with the strategic monolith, local models, source-linked TL;DR, and reversible native-control curation. Benchmark before adding infrastructure.
