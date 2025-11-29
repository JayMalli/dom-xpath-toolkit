<p align="center">
  <img src="logo.svg" alt="DOM XPath Toolkit" width="200" height="60" />
</p>

# dom-xpath-toolkit

Modern, framework-agnostic XPath utilities for browsers, extensions, and testing tools. The toolkit focuses on producing *stable* selectors, decoding them safely, and exposing a high-level TypeScript API that works inside headless environments as well as interactive UIs.

<p align="left">
  <a href="https://www.npmjs.com/package/dom-xpath-toolkit"><img alt="npm" src="https://img.shields.io/npm/v/dom-xpath-toolkit.svg?color=0d9488"></a>
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/badge/license-MIT-0ea5e9.svg"></a>
  <a href="TOOLKIT.md"><img alt="docs" src="https://img.shields.io/badge/docs-typedoc-6366f1"></a>
</p>

## Quick links

- Playground: [https://jaymalli.github.io/dom-xpath-toolkit/](https://jaymalli.github.io/dom-xpath-toolkit/)
- API usage guide: [<a href="TOOLKIT.md"><img alt="docs" src="https://img.shields.io/badge/docs-typedoc-6366f1"></a>](TOOLKIT.md)

## Why this toolkit?

| Capability | What you get |
| --- | --- |
| Stable XPath generation | Deterministic heuristics that prefer IDs, data attributes, labels, and fallbacks in a predictable order. |
| Safe resolution | Utilities that respect custom roots, shadow trees, and error handling while resolving selectors. |
| Selection telemetry | Capture the active text selection with start/end/common ancestor XPaths for annotation or replay tools. |
| Batteries included | TypeScript types, ESM + CJS bundles, CLI, Vitest + Playwright suites, Husky, and npm-package-json-lint. |
| Extensible heuristics | Register custom plugins to teach the generator about application-specific data attributes. |

## Requirements

- Node.js **>= 18.18**
- npm 9+ (or pnpm/yarn modern equivalents)

## Installation

```bash
npm install dom-xpath-toolkit
# or
pnpm add dom-xpath-toolkit
# or
yarn add dom-xpath-toolkit
```

## Quick start

```ts
import { getXPathForNode, resolveXPath } from 'dom-xpath-toolkit';

const primaryAction = document.querySelector('[data-testid="primary-action"]');
if (!primaryAction) throw new Error('Missing button');

const xpath = getXPathForNode(primaryAction); // e.g. //*[@data-testid="primary-action"]
const resolved = resolveXPath(xpath);

resolved?.scrollIntoView({ block: 'center' });
```

## Playground & live testing

Experiment with every helper in the toolkit—XPath generation, selection capture, CSS/XPath conversions, custom heuristics, and the CLI shim—directly in the hosted playground. The demo runs the latest build of this package and mirrors the `test/fixtures/all-elements.html` page used in Playwright.

- **Live playground** (GitHub Pages): [https://jaymalli.github.io/dom-xpath-toolkit/](https://jaymalli.github.io/dom-xpath-toolkit/)

Features available in the playground:

1. Inspect any element and copy the generated XPath or resolved selectors.
2. Capture text selections to see start/end/common ancestor XPaths.
3. Convert CSS selectors to XPath (and back) with immediate previews.
4. Toggle heuristic plugins to observe how custom rules change the output.
5. Run CLI-like commands inside the browser console using the bundled toolkit.

## API usage docs

- **Full reference**: The  <a href="TOOLKIT.md">Toolkit README</a>
 documents every export (functions, types, CLI equivalents) with tables describing arguments, defaults, and return values.
- **Workflow tips**: Each section in the Toolkit README includes “When to use it” notes so you can pick the right helper for selection capture, XPath comparison, or DOM traversal insights.
- **Extensibility guidance**: The same document explains how to register custom heuristics, override attribute preference order, and plug the toolkit into headless or extension contexts.

## Project setup (local development)

1. **Fork** the repository on GitHub and clone your fork:
  ```bash
  git clone https://github.com/JayMalli/dom-xpath-toolkit.git
  cd dom-xpath-toolkit
  git checkout main
  ```
2. **Install** dependencies (Node.js ≥ 18.18 required):
  ```bash
  npm install
  ```
3. **Build** the toolkit bundles (ESM, CJS, d.ts):
  ```bash
  npm run build
  ```
4. **Run tests**:
  ```bash
  npm test             # Vitest suite
  npm run test:coverage
  npx playwright test  # optional Playwright integration run
  ```
5. **Lint & type-check** before opening a PR:
  ```bash
  npm run lint
  npm run format
  npm run type-check
  npm run security:test
  ```

## Testing & quality gates

- **Unit tests**: Vitest + jsdom for core helpers.
- **Integration / fixture tests**: Playwright (`playwright/fixture.spec.ts`) drives the bundled toolkit against `test/fixtures/all-elements.html` to validate real DOMs.
- **Coverage**: Branch coverage >= 65% enforced by `yarn test:coverage`.
- **Security**: `npm run security:test` must pass before release (audit + lockfile integrity + package metadata lint).

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for workflow expectations, coding standards, and release steps. Typical workflow:

1. Fork & create a feature branch.
2. `npm install && npm run check` to ensure the baseline is green.
3. Add tests for any new functionality.
4. Open a PR describing the change and any follow-up work.

## Security

Security disclosures follow the process in [SECURITY.md](SECURITY.md). For urgent reports, use the contact listed there rather than filing a public issue. To evaluate dependencies locally, run `npm run security:test` or `npm run security:report`.

## License

MIT © 2025 JayMalli
