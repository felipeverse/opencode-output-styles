# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Entries up to 0.2.0 were written by hand. From 0.2.1 onward this file is maintained by release-please, generated from conventional commits.

## [0.2.1](https://github.com/felipeverse/opencode-output-styles/compare/v0.2.0...v0.2.1) (2026-11-02)


### Miscellaneous Chores

* release 0.2.1 ([d23e19a](https://github.com/felipeverse/opencode-output-styles/commit/d23e19afabf046c92012531201ee5d144dfa9c01))

## [0.2.0] - 2026-11-01

### Added

- Support for OpenCode 2.x via dual entry points: system transform hook on 1.x, agent transform on 2.x.
- `agent` option to scope the style to a single agent id or `all`.
- Unit test suite (vitest) and `typecheck` script.

### Changed

- Style resolution hardened: unknown names and missing files throw with the list of available styles and searched directories.
- Style files are cached by mtime: edits are picked up without restarting OpenCode.

## [0.1.0] - 2026-10-22

### Added

- First release. Opt-in output styles injected into the system prompt via tuple config.
- Built-in `learning` (active learning mode) and `default` (no-op) styles, with the `insights` option.
- Custom Markdown styles discovered from `styles/` directories (global and project), plus a direct path escape hatch.

[0.2.0]: https://github.com/felipeverse/opencode-output-styles/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/felipeverse/opencode-output-styles/releases/tag/v0.1.0
