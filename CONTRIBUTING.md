# Contributing to dom-xpath-toolkit

Thanks for your interest in improving the project! This guide contains everything you need to build, test, and propose changes safely.

## Prerequisites

- Node.js ≥ 18.18
- npm ≥ 9 (pnpm/yarn supported but npm scripts power CI)
- Git configured locally

## Getting Started

```bash
git clone https://github.com/JayMalli/dom-xpath-toolkit.git
cd dom-xpath-toolkit
npm install
```

## Useful Commands

| Command | Purpose |
| ------- | ------- |
| `npm run build` | Bundle the library with tsup |
| `npm run test` | Execute the Vitest suite (jsdom environment) |
| `npm run test:coverage` | Enforce 95%+ coverage thresholds (includes snapshot tests) |
| `npm run lint` | Type-aware ESLint checks |
| `npm run format` | Prettier auto-format |
| `npm run check` | Composite type-check + lint + test (pre-push hook) |
| `npm run lint:pkg` | Lint `package.json` metadata |
| `npm run audit` | Dependency vulnerability scan |

Husky hooks run `lint-staged` on commit and `npm run check` on push. If you need to bypass hooks for emergencies, use `HUSKY=0 git commit ...`.

## Coding Standards

- TypeScript only inside `src/`
- Prefer small, pure functions with unit tests
- Keep coverage ≥ 95% for statements/branches/functions
- Update snapshots intentionally (`UPDATE_SNAPSHOTS=1 npm run test`) and review diffs before committing
- Follow Prettier formatting and ESLint rules (`npm run format` before committing)
- Add succinct inline comments only when logic is non-obvious

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat: add namespace resolver option`) to keep automated changelog generation simple.

## Pull Requests

1. Fork and branch from `main`
2. Ensure `npm run check && npm run test:coverage` pass locally
3. Update documentation and add tests for new features
4. Describe intent, testing strategy, and potential follow-ups in the PR body

## Reporting Issues

Please include:

- Expected vs actual behaviour
- Browser/environment details
- Minimal reproduction (HTML/XPath snippets)

## Security Disclosure

Report vulnerabilities privately before broadcasting. If unsure, open a draft issue marked **security** and request contact instructions.
