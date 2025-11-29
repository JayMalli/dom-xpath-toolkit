<p align="center">
  <img src="logo.svg" alt="DOM XPath Toolkit" width="200" height="60" />
</p>

# DOM XPath Toolkit — Modern API Guide

This API reference was curated by auditing the full TypeScript surface area of the toolkit. Each section keeps descriptions short, highlights the most important parameters (especially booleans/flags), and finishes with runnable code snippets so you can copy/paste ideas straight into your test harness or CLI scripts.

> **API Guide version:** v0.1.0

> ✅ Use this guide when you want an approachable, modern explanation of every exported helper in `dom-xpath-toolkit` without digging through source comments or generated TypeDoc output.

## Table of Contents

1. [Core Generator APIs](#core-generator-apis)
2. [Element Helper Suite](#element-helper-suite)
3. [DOM Query Helpers](#dom-query-helpers)
4. [Conversion Utilities](#conversion-utilities)
5. [Plugin & Heuristic APIs](#plugin--heuristic-apis)
6. [Shared Option Objects](#shared-option-objects)

Each section below now contains a friendly description, parameter table, return details, and a runnable snippet so you can see exactly how the helpers behave.

## Core Generator APIs

### `getXPathForNode(node, options?)`

<a href="https://jaymalli.github.io/dom-xpath-toolkit/?fn=getXPathForNode" target="_blank" rel="noreferrer noopener" data-playground-link onclick="window.open(this.href, '_blank', 'noopener,noreferrer'); return false;">Try it now ↗</a>

Generates a stable, absolute XPath for the provided DOM `Element`. Use `XPathOptions` flags to influence how the path is assembled.

**Optional parameters**

- `options` — omit to use toolkit defaults (`preferId: true`, current document root, namespace resolver = `null`). Pass only the overrides you need; unspecified fields fall back to the defaults.

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `node` | `Element` | — | Target DOM element (must be inside the configured `root`). |
| `options` | `XPathOptions` | toolkit defaults | `preferId`, `preferUniqueAttributes`, and `minIndex` decide whether the XPath prefers attributes vs indexes. |

**Returns:** `string` — absolute XPath starting at the detected root.

**Boolean effects:**

- `preferId = true` (default) means a unique `id` yields an `//*[@id="foo"]` selector. Set to `false` to force structural paths.
- `minIndex = 'never'` strips positional `[n]` segments, even when siblings share a tag.

```ts
import { getXPathForNode } from 'dom-xpath-toolkit';

const button = document.querySelector('button.primary')!;
const xpath = getXPathForNode(button, { minIndex: 'never' });
// => //*[@id="cta"] or //main//button[@class="primary"] (depending on DOM)
```

### `getShortestUniqueXPath(node, options?)`

<a href="https://jaymalli.github.io/dom-xpath-toolkit/?fn=getShortestUniqueXPath" target="_blank" rel="noreferrer noopener" data-playground-link onclick="window.open(this.href, '_blank', 'noopener,noreferrer'); return false;">Try it now ↗</a>

Finds the shortest XPath that still uniquely resolves to `node`. Uses heuristics + attribute prioritization before falling back to structure.

**Optional parameters**

- `options` — same object as `getXPathForNode`. Skip it to keep default heuristics, or override items like `preferId`/`minIndex` for one-off calls.

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `node` | `Element` | — | Target element. |
| `options` | `XPathOptions` | toolkit defaults | `minIndex: 'always'` can force positional suffixes when uniqueness requires them. |

```ts
const unique = getShortestUniqueXPath(button, { preferId: false });
// Might return //*[@data-testid="primary_cta"]
```

### `resolveXPath(xpath, context?, options?)`

<a href="https://jaymalli.github.io/dom-xpath-toolkit/?fn=resolveXPath" target="_blank" rel="noreferrer noopener" data-playground-link onclick="window.open(this.href, '_blank', 'noopener,noreferrer'); return false;">Try it now ↗</a>

Evaluates an XPath string and returns the first matching `Element`.

**Optional parameters**

- `context` — defaults to `document`. Provide a root element or document fragment to evaluate relative expressions without touching the global document.
- `options` — only `root` and `namespaceResolver` are considered. Leave undefined for default document root + automatic namespace resolution.

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `xpath` | `string` | — | Expression to evaluate (will be normalized). |
| `context` | `Document | Element` | `document` | Limits evaluation to a subtree/root. |
| `options` | `XPathOptions` | toolkit defaults | Only `root`/`namespaceResolver` apply; others are ignored. |

```ts
const node = resolveXPath('//*[@data-testid="primary_cta"]');
```

### `findCommonAncestorXPath(nodes, options?)`

<a href="https://jaymalli.github.io/dom-xpath-toolkit/?fn=findCommonAncestorXPath" target="_blank" rel="noreferrer noopener" data-playground-link onclick="window.open(this.href, '_blank', 'noopener,noreferrer'); return false;">Try it now ↗</a>

Returns the XPath of the nearest shared ancestor of the provided `Element[]`.

**Optional parameters**

- `options` — honor the same generation flags; handy if you need to scope ancestors within a custom `root` or adjust indexing.

```ts
const ancestor = findCommonAncestorXPath([emailInput, passwordInput]);
// => //form[@id="login"]
```

### `getXPathForSelection(selection?, options?)`

<a href="https://jaymalli.github.io/dom-xpath-toolkit/?fn=getXPathForSelection" target="_blank" rel="noreferrer noopener" data-playground-link onclick="window.open(this.href, '_blank', 'noopener,noreferrer'); return false;">Try it now ↗</a>

Captures XPath metadata for the current `Selection` (or provided selection object).

**Optional parameters**

- `selection` — defaults to `window.getSelection()` when omitted, which keeps browser integrations terse.
- `options` — forwarded to `getXPathForNode` for each boundary; override when you need a different root or indexing rule.

| Field | Type | Description |
| --- | --- | --- |
| `text` | `string` | Selected text content. |
| `range` | `Range | null` | Clone of the DOM range (safe to inspect). |
| `startXPath` | `string | null` | `getXPathForNode` result for the start container. |
| `endXPath` | `string | null` | Same for the end container. |
| `commonXPath` | `string | null` | XPath for the shared ancestor of start/end. |

```ts
const snapshot = getXPathForSelection(window.getSelection());
console.log(snapshot.startXPath, snapshot.text);
```

### `normalizeXPath(xpath)`

<a href="https://jaymalli.github.io/dom-xpath-toolkit/?fn=normalizeXPath" target="_blank" rel="noreferrer noopener" data-playground-link onclick="window.open(this.href, '_blank', 'noopener,noreferrer'); return false;">Try it now ↗</a>

Cleans up an XPath string by trimming, removing redundant slashes, and dropping trailing separators.

```ts
normalizeXPath(' //div///span// '); // => //div//span
```

### `isXPathMatch(node, xpath, context?, options?)`

<a href="https://jaymalli.github.io/dom-xpath-toolkit/?fn=isXPathMatch" target="_blank" rel="noreferrer noopener" data-playground-link onclick="window.open(this.href, '_blank', 'noopener,noreferrer'); return false;">Try it now ↗</a>

Returns `true` if resolving `xpath` (under the optional context/options) identifies the same `node`.

**Optional parameters**

- `context` — pass a subtree root if the XPath should be evaluated relative to a component shadow DOM or iframe.
- `options` — same semantics as `resolveXPath`; mostly useful for custom namespace resolvers or alternate roots.

```ts
const matches = isXPathMatch(button, getXPathForNode(button)); // true
```

### `createXPathGenerator(config?)`

<a href="https://jaymalli.github.io/dom-xpath-toolkit/?fn=createXPathGenerator" target="_blank" rel="noreferrer noopener" data-playground-link onclick="window.open(this.href, '_blank', 'noopener,noreferrer'); return false;">Try it now ↗</a>

Builds an isolated generator instance with custom defaults or plugins. Useful when you need several strategies in one app.

**Optional parameters**

- `config` — you can call `createXPathGenerator()` with no arguments to clone the default behavior. Provide only the `defaultOptions` or `plugins` fields you want to override.

| Config Field | Type | Notes |
| --- | --- | --- |
| `defaultOptions` | `XPathOptions` | Overrides toolkit-wide defaults for this generator. |
| `plugins` | `XPathHeuristic[]` | Additional heuristics run before built-in ones. |

```ts
const generator = createXPathGenerator({
	defaultOptions: { minIndex: 'never' },
	plugins: [{
		name: 'data-seq',
		provideSelector({ node }) {
			const seq = node.getAttribute('data-seq');
			return seq ? `//*[@data-seq="${seq}"]` : null;
		},
	}],
});

const xpath = generator.getXPathForNode(node);
```

## Element Helper Suite

Utility wrappers that sit on top of the core generator and DOM APIs. These helpers keep imperative DOM code terse inside extensions, content scripts, or tests where you just need “give me the XPath for X”.

### `getElementByXPath(xpath, context?, options?)`

- Resolves the first element that matches `xpath`, respecting the same `XPathOptions` as the generator (custom root, namespace resolver, etc.).
- Pass a scoping `context` (document or element) to evaluate relative expressions.

**Optional parameters**

- `context` — defaults to `document` when omitted.
- `options` — inherits toolkit defaults unless you pass overrides.

```ts
import { getElementByXPath } from 'dom-xpath-toolkit';

const modal = getElementByXPath('//dialog[@open="true"]');
const scoped = getElementByXPath('.//button', modal);
```

### `getElementText(element, trim = true)`

- Returns `element.textContent` while safely handling `null` and whitespace control.
- Set `trim = false` when you need the raw text including spacing.

**Optional parameters**

- `trim` — defaults to `true`. Flip to `false` to preserve whitespace.

```ts
const labelText = getElementText(document.querySelector('label[for="email"]')!);
```

### Selector-driven XPath helpers

All of the following utilities locate DOM nodes via common selectors, then feed them through `getXPathForNode`. Each accepts `ElementSelectorOptions`, which extend `XPathOptions` with a `multiple` flag (`'first'` or `'all'`). When `multiple === 'all'`, the helpers return an array of XPath strings; otherwise a single string (or `null`).

| Helper | What it targets | Example |
| --- | --- | --- |
| `getXPathById(id, options?)` | `document.getElementById` result | `getXPathById('login-form')` |
| `getXPathByClass(className, options?)` | `document.getElementsByClassName` collection | `getXPathByClass('btn', { multiple: 'all' })` |
| `getXPathByTag(tagName, options?)` | Elements by tag (`div`, `input`, …) | `getXPathByTag('input')` |
| `getXPathByLabel(labelText, options?)` | Associated control for matching `<label>` text | `getXPathByLabel('Password')` |
| `getXPathByAttribute(name, value?, options?)` | Attribute presence or equality | `getXPathByAttribute('data-testid', 'submit')` |
| `getXPathBySelector(selector, options?)` | Arbitrary CSS selector | `getXPathBySelector('.toast[data-open="true"]')` |
| `getXPathByText(text, exact?, options?)` | Visible text content (exact or fuzzy) | `getXPathByText('Click me', false)` |

**Optional parameters**

- `options` — omit to fall back to toolkit defaults (`multiple: 'first'`). Set `multiple: 'all'` plus any `XPathOptions` overrides you need.
- `attributeValue` — the second argument of `getXPathByAttribute`. Leave undefined to match any presence of the attribute regardless of value.
- `exact` — second argument of `getXPathByText`; defaults to `true`. Set to `false` for substring searches.

```ts
import { getXPathByAttribute, getXPathByText } from 'dom-xpath-toolkit';

const toastXPath = getXPathByAttribute('role', 'alert');
const allSubmitButtons = getXPathByText('Submit', true, { multiple: 'all' });
```

## DOM Query Helpers

These helpers embrace the native XPath evaluator for cases where you need raw nodes, attribute values, or validity checks without fully generating selectors.

### `select(expression, contextNode?)`

- Returns an ordered array of `Node`s that satisfy the XPath expression.
- Normalizes whitespace and silently swallows syntax errors (returns `[]`).

**Optional parameters**

- `contextNode` — defaults to the global `document`. Supply a node to scope relative expressions (e.g., when running inside shadow roots or fragments).

```ts
const listItems = select('//ul[@role="menu"]/li');
listItems.forEach(node => console.log(node.textContent));
```

### `selectOne(expression, contextNode?)`

- Thin wrapper over `select` that only returns the first node (or `null`).

**Optional parameters**

- `contextNode` — behaves exactly like the second argument to `select` and defaults to `document`.

```ts
const firstError = selectOne('//*[@aria-invalid="true"]');
```

### `isXPathSyntaxValid(expression, contextNode?)`

- Quickly lint an expression without throwing exceptions—returns `true` iff the browser’s XPath engine can parse it.

**Optional parameters**

- `contextNode` — defaults to `document` but can be any node whose ownerDocument has the namespaces you care about.

```ts
if (!isXPathSyntaxValid(candidate)) {
	throw new Error('Please enter a valid XPath');
}
```

### `doesXPathResolveToElement(expression, contextNode?, options?)`

- Uses `getElementByXPath` under the hood to confirm that the expression resolves to an element node (useful before persisting selectors).

**Optional parameters**

- `contextNode` — defaults to the global document; override to scope the lookup.
- `options` — forwarded to `getElementByXPath` so you can reuse custom roots or namespace resolvers.

### Attribute helpers

| Helper | Behavior |
| --- | --- |
| `getAttributeValue(expression, contextNode?)` | Returns the first attribute value matched by an expression like `//a/@href`. |
| `getAttributeValues(expression, contextNode?)` | Returns **all** attribute values ordered as the XPath engine produces them. |

**Optional parameters**

- `contextNode` — defaults to `document`; provide a node to evaluate relative attribute expressions.

```ts
const primaryHref = getAttributeValue('//nav//a[contains(@class, "primary")]/@href');
const imageAlts = getAttributeValues('//img/@alt');
```

## Conversion Utilities

### `cssToXPath(selector)`

- Deterministic conversion that covers tags, IDs, classes, attribute operators (`=`, `*=`, `^=`, `$=`, `~=`), descendant/child combinators, comma-separated selectors, and `:nth-of-type`.
- Throws when the selector is empty or contains unsupported pseudo-classes.

```ts
cssToXPath('.prose > a[href^="/docs"]');
// => //*[contains(concat(' ', normalize-space(@class), ' '), ' prose ')]/a[starts-with(@href, "/docs")]
```

### `xpathToCss(xpath)`

- Best-effort reverse conversion for simple axes (`//`, `/`) and the same predicate subset (id/class/attribute equals + nth-of-type).
- Returns `null` when the XPath contains predicates that cannot be represented safely in CSS.

```ts
xpathToCss('//*[@id="cta"]//button[@data-variant="ghost"]');
// => #cta button[data-variant="ghost"]
```

## Plugin & Heuristic APIs

### `createHeuristicRegistry(initialHeuristics?)`

- Builds a lightweight registry you can mutate without touching the global defaults. Call `register()` with custom heuristics (newest inserted first) or `list()` to inspect the active order.
- Pass the registry’s `.list()` into `createXPathGenerator({ plugins: ... })` to spin up a generator with your overrides.

**Optional parameters**

- `initialHeuristics` — defaults to `DEFAULT_HEURISTICS`. Provide your own array to seed the registry with a different baseline.

```ts
import { createHeuristicRegistry, createXPathGenerator, DEFAULT_HEURISTICS } from 'dom-xpath-toolkit';

const registry = createHeuristicRegistry(DEFAULT_HEURISTICS);
registry.register({
	name: 'aria-controls',
	provideSelector({ node }) {
		const target = node.getAttribute('aria-controls');
		return target ? `//*[@id="${target}"]` : null;
	},
});

const generator = createXPathGenerator({ plugins: registry.list() });
```

### `DEFAULT_HEURISTICS`

- Exported array of the heuristics the default generator ships with (IDs first, then `data-*`, ARIA landmarks, positional fallbacks, etc.). Examine or clone it when you need to tweak ordering without rewriting every rule.

### `XPathHeuristic` interface (TypeScript)

- `name` (string, required) — used for deduping when registering.
- Optional hooks:
  - `beforeSegment` / `afterGenerate` for lifecycle instrumentation.
  - `provideSelector` to short-circuit generation with your own selector string.
  - `shouldUseAttribute` to veto/allow attribute predicates.
  - `decorateSegment` to mutate each XPath segment before it is joined.

## Shared Option Objects

These types are exported for both runtime consumption (plain objects) and compile-time ergonomics.

### `XPathOptions`

All fields are optional; unspecified values fall back to the defaults below.

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `preferId` | `boolean` | `true` | Use `//*[@id="foo"]` when unique IDs exist; disable to force structural selectors. |
| `preferUniqueAttributes` | `string[]` | `['data-testid', 'name', 'aria-label']` | Ordered preference list for attribute-based selectors. |
| `minIndex` | `'auto' | 'always' | 'never'` | `'auto'` | Controls when positional `[n]` pieces are emitted. |
| `root` | `Document | Element` | `document` | Scopes both generation and resolution to a subtree. |
| `namespaceResolver` | `XPathNSResolver | null` | `null` | Injected into DOM `evaluate` for XML namespaces. |

### `ElementSelectorOptions`

- Extends `XPathOptions` and adds `multiple?: 'first' | 'all'` to determine whether selector helpers return one XPath or an array. Every property remains optional; omit the object entirely to stick with toolkit defaults.

### `SelectionResult`

- Shape returned by `getXPathForSelection`. Fields: `text`, `range`, `startXPath`, `endXPath`, `commonXPath`.

### `XPathGeneratorConfig`

- Accepted by `createXPathGenerator`. Supports `defaultOptions` (object merged into every call) and `plugins` (array of `XPathHeuristic`). Both keys are optional, so you can override one without touching the other.

Keep these option objects versioned in your own code so you can persist/restore generator behavior across browser sessions or worker contexts.
