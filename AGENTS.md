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

## Security / Gitleaks

When generating content or code examples that include intentional fake credentials, API keys, or hashes (e.g., for AppSec/Red Team blog posts), you **must** append a Gitleaks ignore comment on the same line to prevent CI pipeline failures.

- In code blocks, use the language's native comment syntax: `# gitleaks:allow` or `// gitleaks:allow`
- In plain markdown text, use an HTML comment: `<!-- gitleaks:allow -->`
