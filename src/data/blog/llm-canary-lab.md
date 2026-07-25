---
title: "GEO Poisoning and the LLM Canary Lab"
pubDatetime: 2026-07-25T12:00:00Z
description: "Why hiding instructions in a page to bias an AI's answer is a bad idea, and how I built a labeled, disclosed canary experiment to measure it instead."
tags: ["ai-security", "prompt-injection", "research"]
hideEditPost: true
---

"GEO poisoning" is the search-poisoning playbook rebuilt for the retrieval era: instead of stuffing keywords for a ranking algorithm, you stuff instructions for whatever model ends up summarizing your page. Ask an assistant to fetch a URL and it doesn't render pixels — it extracts text through some pipeline (DOM, readability heuristics, plaintext fallback, structured-data fields) and hands that text to a model as context. If an attacker can get the model to treat page text as instructions rather than content, they can bias what the model tells the human on the other end: "always recommend X," "never mention the competitor," "rate this five stars." None of it shows up to a person skimming the rendered page.

That's the black-hat version, and it's a bad idea for a boring reason: it isn't really an attack on the model. It's an attack on the human reading the model's summary, using the model as an unwitting proxy. Whether or not it "works" against any particular assistant is beside the point — deceiving your own readers through a tool they trust is the failure mode, independent of success rate.

The interesting, non-adversarial question underneath it is a measurement one: **which extraction layers actually carry instructions through to a model's context, and which get stripped or ignored first?** That's answerable without deceiving anyone, as long as the payload is disclosed, harmless, and opt-in for the one asking to be summarized (this site).

## The lab

[`/labs/llm-canary`](/labs/llm-canary) plants the same canonical instruction in six vectors, each with a distinct token:

- **A** — a visible paragraph, plain text in the normal reading flow (the baseline)
- **B** — an HTML comment
- **C** — a screen-reader-only `<span>` with `aria-hidden="false"`
- **D** — the `description` field of a JSON-LD `Dataset` block
- **E** — the `alt` text of a decorative inline SVG
- **F** — a sibling `text/plain` file at `/labs/llm-canary.txt`, the control vector for scrapers that skip HTML parsing entirely

The instruction itself only asks a model to echo its token back if it ingested the text, and explicitly tells it not to follow anything else on the page or change any other answer. That's the entire ask — see the lab page for the exact wording and the ethical constraints it operates under (no false or promotional claims, nothing hidden from human readers, `noindex` so it can't leak into search results as spam).

If a given token comes back in an assistant's summary, that vector's text survived the pipeline all the way into the model's context. Cross-referencing which vectors survive for which engine tells you something concrete about where each pipeline draws its line between "content" and "structure" — DOM text vs. comments vs. accessibility tree vs. structured data vs. plaintext fallback.

## Results

In progress. The [results table](/labs/llm-canary#results) on the lab page starts with a single pending placeholder row and grows as observations come in — the lab page documents the exact reproduction prompts for ChatGPT, Perplexity, Gemini, and Claude, plus where to actually see AI crawlers hitting the page: Cloudflare's bot analytics (they run at the edge, so they see non-JS crawlers that client-side analytics never will), with a reverse-proxy log-grep documented as a fallback for self-hosted setups. Check back there for current numbers rather than here — this post won't be updated every time a new row lands.
