# Contributing

Thanks for your interest in improving opencode-output-styles.

## Project scope

Opt-in output styles for OpenCode: Markdown system prompts injected alongside
the base system. Styles are text only (no code execution). The plugin supports
OpenCode 1.x (hook) and 2.x (agent transform).

Good first contributions: documentation fixes, tests, resolution edge cases,
and new built-in styles (plain Markdown).

## Development setup

- Node.js 22+
- `npm ci`
- `npm run typecheck` — type checks
- `npm test` — vitest suite

These are the same checks CI runs on every push and pull request. There is no
build step: the package ships TypeScript source consumed by OpenCode's runtime.

## Making changes

- Branch from `main`; keep each PR focused on one logical change.
- Tests describe behavior. For non-trivial changes, add or extend
  `src/*.test.ts` alongside the code.
- Match the existing patterns before introducing new ones.

## Commit messages

Conventional Commits, lowercase after the prefix, imperative mood:

```
feat: add glob support in style discovery
fix: resolve project styles against xdg config home
docs: document the agent option
```

Allowed prefixes: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`.
The message describes the change itself, not the authorship. No authorship
trailers (`Co-Authored-By` and similar).

## Pull requests

- Describe what changes and why; link the issue if one exists.
- CI (typecheck + tests) must be green before review.
- Small PRs get reviewed faster.

## Questions

Open an issue for anything unclear. For security reports, see
[SECURITY.md](SECURITY.md) instead of a public issue.
