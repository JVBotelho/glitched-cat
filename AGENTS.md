## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Editorial positioning

Personal technical blog for João Victor Botelho (JV Botelho). Audience: offensive security practitioners. Not a general-purpose dev blog and not a commentary outlet.

**Focus: red team, malware development, and offensive tool development.** Decided; treat as settled.

The framing is "both sides of the hook": offensive work published with the defender's view attached, which the author can produce because he also builds a runtime interception engine (RASP.Net). The defensive material belongs *inside* offensive posts as detection engineering. It is not a second content line.

Anchors are GhostHound (Active Directory tombstone enumeration, BloodHound OpenGraph extension) and skewrun (Kerberos clock-skew resolution). Adjacent and in scope: Rust and C# offensive tooling, evasion, AD tradecraft, .NET internals applied to attack and defense.

The author also maintains AppSec and AI-security projects (query-net-hardening, mcp-hardening, LLM Canary Lab). These are side projects. They may produce an occasional post, but they do not set the blog's direction and should not be treated as a series.

Hard constraint: roughly 2 to 4 hours per week for the blog in total, including lab work and distribution. Recommendations that assume more are not useful.

## Post conventions

Posts live in `src/data/blog/*.md`. Frontmatter: `title`, `pubDatetime`, `description`, `tags`, `hideEditPost`.

Open every post with a self-contained summary of what was built or measured and what was found.

Title the way a practitioner phrases the problem. Exact error strings win searches that have no incumbent — `KRB_AP_ERR_SKEW without root` is both a good title and the literal query. Creative titles lose here.

Ship working code with technique posts. In this field a technique described without a proof of concept is treated as a claim rather than a result.

Pair technique posts with a scoped detection section: telemetry, event IDs, a starter query, honest limitations. Production-grade Sigma or KQL rule packs are out of scope.

**Never publish a number that did not come from something the author ran and can reproduce in front of someone else.** If a claim's origin is "a model said so" or "a report said so", it does not ship. Where a claim is a prediction rather than a measurement, label it and state what would falsify it.

Philosophy and ethics belong as a coda inside technical posts, never as standalone essays.

Do not publish to fill a calendar. The test for any post is whether it carries something only this author has.

Three early posts (GhostHound, skewrun, RASP.Net) are project READMEs pasted into posts. They are duplicate content that loses the canonical fight to GitHub and are slated for stubbing or `noindex`. Do not use them as a model.

## Strategy and research notes

Content strategy, distribution planning, the 90-day plan, and the underlying research live in `docs/strategy/`, which is gitignored and local to the author's machine. Start at `docs/strategy/README.md`.

If that directory is not present in your working copy, you are missing context that affects editorial and distribution decisions. Ask rather than inferring.

## Security / Gitleaks

When generating content or code examples that include intentional fake credentials, API keys, or hashes (e.g., for AppSec/Red Team blog posts), you **must** append a Gitleaks ignore comment on the same line to prevent CI pipeline failures.

- In code blocks, use the language's native comment syntax: `# gitleaks:allow` or `// gitleaks:allow`
- In plain markdown text, use an HTML comment: `<!-- gitleaks:allow -->`
