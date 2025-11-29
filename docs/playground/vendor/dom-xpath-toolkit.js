// src/internal/dom.ts
function isElement(node) {
  return node != null && typeof node === "object" && node.nodeType === Node.ELEMENT_NODE && typeof node.tagName === "string";
}
function getDocument(context) {
  if (context instanceof Document) {
    return context;
  }
  return context.ownerDocument ?? (typeof document !== "undefined" ? document : null);
}
function createNamespaceResolver(doc, context) {
  if (typeof doc.createNSResolver !== "function") {
    return null;
  }
  const rootForResolver = context instanceof Document ? context.documentElement : context;
  return rootForResolver ? doc.createNSResolver(rootForResolver) : null;
}
function getRootElement(node, options, doc) {
  if (isElement(options.root)) {
    return options.root;
  }
  if (options.root instanceof Document) {
    return options.root.documentElement;
  }
  if (doc?.documentElement) {
    return doc.documentElement;
  }
  return node.ownerDocument?.documentElement ?? null;
}
function getContainingElement(node) {
  if (!node) {
    return null;
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    return node;
  }
  if (node.nodeType === Node.DOCUMENT_NODE) {
    return node.documentElement;
  }
  if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    return node.firstElementChild;
  }
  return node.parentElement;
}
function hasSameTagSiblings(node) {
  const parent = node.parentElement;
  if (!parent) {
    return false;
  }
  const tag = node.tagName;
  for (const sibling of Array.from(parent.children)) {
    if (sibling === node) {
      continue;
    }
    if (sibling.tagName === tag) {
      return true;
    }
  }
  return false;
}
function getElementIndex(node) {
  let index = 1;
  let sibling = node.previousElementSibling;
  while (sibling) {
    if (sibling.tagName === node.tagName) {
      index += 1;
    }
    sibling = sibling.previousElementSibling;
  }
  return index;
}
function findCommonAncestorElement(nodes) {
  if (nodes.length === 0) {
    return null;
  }
  let candidate = nodes[0];
  while (candidate) {
    const current = candidate;
    const containsAll = nodes.every((node) => current === node || current.contains(node));
    if (containsAll) {
      return current;
    }
    candidate = current.parentElement;
  }
  return null;
}
function cssEscape(value) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/[\0-\x1f\x7f-\x9f!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, (char) => `\\${char}`);
}
function escapeXPathString(value) {
  if (!value.includes('"')) {
    return `"${value}"`;
  }
  if (!value.includes("'")) {
    return `'${value}'`;
  }
  const parts = value.split('"');
  const concatParts = [];
  for (let i = 0; i < parts.length; i += 1) {
    const segment = parts[i];
    concatParts.push(segment ? `"${segment}"` : '""');
    if (i < parts.length - 1) {
      concatParts.push(`'"'`);
    }
  }
  return `concat(${concatParts.join(", ")})`;
}

// src/internal/attributes.ts
function resolveScope(scope) {
  if (scope instanceof Document) {
    return {
      scopeRoot: scope,
      queryRoot: scope
    };
  }
  const owner = scope.ownerDocument;
  if (!owner) {
    return null;
  }
  return {
    scopeRoot: scope,
    queryRoot: scope
  };
}
function isAttributeUnique(node, attribute, scope) {
  if (!scope) {
    return false;
  }
  const scopeInfo = resolveScope(scope);
  if (!scopeInfo) {
    return false;
  }
  const value = node.getAttribute(attribute);
  if (value == null) {
    return false;
  }
  const selector = `[${attribute}="${cssEscape(value)}"]`;
  let count = 0;
  try {
    const nodes = scopeInfo.queryRoot.querySelectorAll(selector);
    count = nodes.length;
  } catch {
    count = countAttributeMatchesFallback(scopeInfo.scopeRoot, attribute, value);
  }
  return count === 1;
}
function countAttributeMatchesFallback(scope, attribute, value) {
  const rootElement = scope instanceof Document ? scope.documentElement : scope;
  if (!rootElement) {
    return 0;
  }
  let count = 0;
  const stack = [rootElement];
  while (stack.length) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    if (current.getAttribute(attribute) === value) {
      count += 1;
      if (count > 1) {
        break;
      }
    }
    for (const child of Array.from(current.children)) {
      stack.push(child);
    }
  }
  return count;
}
function buildAttributeSelector(attribute, value) {
  return `//*[@${attribute}=${escapeXPathString(value)}]`;
}

// src/plugins/default.ts
function getScope(options, node) {
  if (isElement(options.root)) {
    return options.root;
  }
  if (options.root instanceof Document) {
    return options.root;
  }
  return node.ownerDocument ?? null;
}
var idHeuristic = {
  name: "default:id",
  provideSelector(context) {
    const { node, options, doc } = context;
    if (!options.preferId || !node.id) {
      return null;
    }
    const isCustomRoot = isElement(options.root) && options.root !== doc.documentElement;
    if (isCustomRoot) {
      return null;
    }
    const scope = getScope(options, node);
    if (!isAttributeUnique(node, "id", scope)) {
      return null;
    }
    return `//*[@id=${escapeXPathString(node.id)}]`;
  }
};
var ATTRIBUTE_MATCHERS = [
  (name) => name.startsWith("data-"),
  (name) => name.startsWith("aria-"),
  (name) => name === "role",
  (name) => name === "name",
  (name) => name === "placeholder",
  (name) => name === "title"
];
var uniqueAttributeHeuristic = {
  name: "default:unique-attribute",
  provideSelector(context) {
    const { node, options, doc } = context;
    const isCustomRoot = isElement(options.root) && options.root !== doc.documentElement;
    if (isCustomRoot) {
      return null;
    }
    const scope = getScope(options, node);
    const attributeEntries = Array.from(node.attributes ?? []);
    if (options.preferUniqueAttributes.length) {
      for (const attribute of options.preferUniqueAttributes) {
        if (!node.hasAttribute(attribute)) {
          continue;
        }
        const value = node.getAttribute(attribute);
        if (!value) {
          continue;
        }
        if (isAttributeUnique(node, attribute, scope)) {
          return buildAttributeSelector(attribute, value);
        }
      }
    }
    for (const matcher of ATTRIBUTE_MATCHERS) {
      const matchedAttribute = attributeEntries.find((attr) => matcher(attr.name.toLowerCase()));
      if (!matchedAttribute || !matchedAttribute.value) {
        continue;
      }
      if (isAttributeUnique(node, matchedAttribute.name, scope)) {
        return buildAttributeSelector(matchedAttribute.name, matchedAttribute.value);
      }
    }
    return null;
  }
};
var segmentNormalizationHeuristic = {
  name: "default:segment-normalization",
  decorateSegment(context) {
    const { segment } = context;
    return segment;
  }
};
var rootHeuristic = {
  name: "default:root-element",
  provideSelector(context) {
    const { node, root } = context;
    if (node === root) {
      return `/${node.tagName.toLowerCase()}`;
    }
    return null;
  }
};
var DEFAULT_HEURISTICS = [
  idHeuristic,
  uniqueAttributeHeuristic,
  rootHeuristic,
  segmentNormalizationHeuristic
];

// src/plugins/index.ts
function createHeuristicRegistry(initial = DEFAULT_HEURISTICS) {
  const heuristics = [...initial];
  return {
    list() {
      return [...heuristics];
    },
    register(...entries) {
      for (let i = entries.length - 1; i >= 0; i -= 1) {
        const entry = entries[i];
        if (!heuristics.find((existing) => existing.name === entry.name)) {
          heuristics.unshift(entry);
        }
      }
    }
  };
}

// src/options.ts
var DEFAULT_UNIQUE_ATTRIBUTES = [
  "data-testid",
  "data-test",
  "aria-label",
  "aria-labelledby",
  "name",
  "class"
];
var DEFAULT_OPTIONS = {
  preferId: true,
  preferUniqueAttributes: DEFAULT_UNIQUE_ATTRIBUTES,
  minIndex: "auto",
  namespaceResolver: null
};
function normalizeOptions(options) {
  return {
    preferId: options?.preferId ?? DEFAULT_OPTIONS.preferId,
    preferUniqueAttributes: options?.preferUniqueAttributes?.length ? [...options.preferUniqueAttributes] : [...DEFAULT_OPTIONS.preferUniqueAttributes],
    minIndex: options?.minIndex ?? DEFAULT_OPTIONS.minIndex,
    root: options?.root,
    namespaceResolver: options?.namespaceResolver ?? DEFAULT_OPTIONS.namespaceResolver
  };
}

// src/utils/xpath.ts
function normalizeXPath(xpath) {
  if (!xpath || typeof xpath !== "string") {
    return "";
  }
  const trimmed = xpath.trim();
  if (!trimmed) {
    return "";
  }
  const withoutTrailing = trimmed.replace(/\/+$/g, "");
  return withoutTrailing.replace(/\/{3,}/g, "//");
}

// src/generator.ts
function mergeOptions(defaults, overrides) {
  if (!defaults) {
    return overrides;
  }
  if (!overrides) {
    return defaults;
  }
  return {
    ...defaults,
    ...overrides,
    preferUniqueAttributes: overrides.preferUniqueAttributes ?? defaults.preferUniqueAttributes
  };
}
function shouldIncludeIndex(node, strategy) {
  switch (strategy) {
    case "always":
      return true;
    case "never":
      return false;
    case "auto":
    default:
      return hasSameTagSiblings(node);
  }
}
function buildSegment(node, options) {
  let segment = node.tagName.toLowerCase();
  if (shouldIncludeIndex(node, options.minIndex)) {
    segment += `[${getElementIndex(node)}]`;
  }
  return segment;
}
function createXPathGenerator(config) {
  const defaults = config?.defaultOptions;
  const registry = createHeuristicRegistry(DEFAULT_HEURISTICS);
  if (config?.plugins?.length) {
    registry.register(...config.plugins);
  }
  const listHeuristics = () => registry.list();
  const buildSelectorResult = (node, settings, rootElement, doc, heuristics) => {
    const ancestorChain = [];
    let walker = node.parentElement;
    while (walker) {
      ancestorChain.push(walker);
      if (walker === rootElement) {
        break;
      }
      walker = walker.parentElement;
    }
    const baseContext = {
      node,
      doc: doc ?? node.ownerDocument ?? document,
      root: rootElement,
      options: settings,
      ancestors: ancestorChain
    };
    for (const heuristic of heuristics) {
      const selector = heuristic.provideSelector?.(baseContext);
      if (selector) {
        return { selector: normalizeXPath(selector) };
      }
    }
    const segments = [];
    let current = node;
    while (current) {
      const context = {
        node: current,
        doc: baseContext.doc,
        root: rootElement,
        options: settings,
        ancestors: ancestorChain
      };
      for (const heuristic of heuristics) {
        heuristic.beforeSegment?.(context);
      }
      let segment = buildSegment(current, settings);
      for (const heuristic of heuristics) {
        const decorated = heuristic.decorateSegment?.({
          node: current,
          segment,
          indexStrategy: settings.minIndex
        });
        if (typeof decorated === "string" && decorated.length > 0) {
          segment = decorated;
        }
      }
      segments.unshift(segment);
      if (current === rootElement) {
        break;
      }
      current = current.parentElement;
    }
    const xpath = `/${segments.join("/")}`;
    let normalized = normalizeXPath(xpath);
    let finalizedSegments = [...segments];
    for (const heuristic of heuristics) {
      const adjusted = heuristic.afterGenerate?.(baseContext, normalized);
      if (typeof adjusted === "string" && adjusted.length) {
        const updated = normalizeXPath(adjusted);
        if (updated !== normalized) {
          finalizedSegments = void 0;
        }
        normalized = updated;
      }
    }
    return {
      selector: normalized,
      segments: finalizedSegments
    };
  };
  const buildEvaluationPlan = (xpath, context) => {
    if (isElement(context)) {
      const tagName = context.tagName.toLowerCase();
      if (xpath === `/${tagName}`) {
        return { node: context };
      }
      if (xpath.startsWith(`/${tagName}/`)) {
        const afterTag = xpath.substring(tagName.length + 2);
        return { expression: `./${afterTag}` };
      }
    }
    return { expression: xpath };
  };
  const buildShortestCandidates = (segments) => {
    if (!segments.length) {
      return [];
    }
    const candidates = /* @__PURE__ */ new Set();
    const absolute = `/${segments.join("/")}`;
    candidates.add(absolute);
    candidates.add(`/${segments.map(stripSegmentIndex).join("/")}`);
    for (let i = 0; i < segments.length; i += 1) {
      const tail = segments.slice(i);
      candidates.add(`//${tail.join("/")}`);
      candidates.add(`//${tail.map(stripSegmentIndex).join("/")}`);
    }
    return Array.from(candidates).map((candidate) => normalizeXPath(candidate)).filter((candidate) => candidate.length).sort((a, b) => a.length - b.length);
  };
  const stripSegmentIndex = (segment) => segment.replace(/\[\d+\]$/u, "");
  const matchesUniqueNode = (xpath, evalContext, doc, resolver, target) => {
    const normalized = normalizeXPath(xpath);
    if (!normalized) {
      return false;
    }
    const plan = buildEvaluationPlan(normalized, evalContext);
    if (plan.node) {
      return plan.node === target;
    }
    try {
      const result = doc.evaluate(
        plan.expression ?? normalized,
        evalContext,
        resolver,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );
      if (result.snapshotLength !== 1) {
        return false;
      }
      const node = result.snapshotItem(0);
      return node === target;
    } catch {
      return false;
    }
  };
  function resolveXPath2(xpath, context, options) {
    const normalizedPath = normalizeXPath(xpath);
    if (!normalizedPath) {
      return null;
    }
    const merged = mergeOptions(defaults, options);
    const settings = normalizeOptions(merged);
    const evalContext = settings.root ?? context ?? (typeof document !== "undefined" ? document : null);
    if (!evalContext) {
      return null;
    }
    const doc = getDocument(evalContext);
    if (!doc) {
      return null;
    }
    const resolver = settings.namespaceResolver ?? createNamespaceResolver(doc, evalContext);
    const plan = buildEvaluationPlan(normalizedPath, evalContext);
    if (plan.node) {
      return plan.node;
    }
    try {
      const result = doc.evaluate(
        plan.expression ?? normalizedPath,
        evalContext,
        resolver,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      const node = result.singleNodeValue;
      return isElement(node) ? node : null;
    } catch {
      return null;
    }
  }
  function getXPathForNode2(node, options) {
    if (!isElement(node)) {
      throw new TypeError("Expected an Element to compute XPath.");
    }
    const merged = mergeOptions(defaults, options);
    const settings = normalizeOptions(merged);
    const doc = getDocument(node);
    const rootElement = getRootElement(node, settings, doc);
    if (!rootElement) {
      throw new Error("Unable to determine a document root for XPath computation.");
    }
    if (!(rootElement === node || rootElement.contains(node))) {
      throw new Error("The provided node does not belong to the configured root.");
    }
    const heuristics = listHeuristics();
    const result = buildSelectorResult(node, settings, rootElement, doc, heuristics);
    return result.selector;
  }
  function getShortestUniqueXPath2(node, options) {
    if (!isElement(node)) {
      throw new TypeError("Expected an Element to compute XPath.");
    }
    const merged = mergeOptions(defaults, options);
    const settings = normalizeOptions(merged);
    const doc = getDocument(node);
    const rootElement = getRootElement(node, settings, doc);
    if (!rootElement) {
      throw new Error("Unable to determine a document root for XPath computation.");
    }
    if (!(rootElement === node || rootElement.contains(node))) {
      throw new Error("The provided node does not belong to the configured root.");
    }
    const heuristics = listHeuristics();
    const result = buildSelectorResult(node, settings, rootElement, doc, heuristics);
    if (!result.segments?.length) {
      return result.selector;
    }
    const evalContext = settings.root ?? rootElement;
    if (!evalContext) {
      return result.selector;
    }
    const evaluationDoc = getDocument(evalContext) ?? doc ?? node.ownerDocument ?? null;
    if (!evaluationDoc) {
      return result.selector;
    }
    const resolver = settings.namespaceResolver ?? createNamespaceResolver(evaluationDoc, evalContext);
    const candidates = buildShortestCandidates(result.segments);
    for (const candidate of candidates) {
      if (matchesUniqueNode(candidate, evalContext, evaluationDoc, resolver, node)) {
        return candidate;
      }
    }
    return result.selector;
  }
  function findCommonAncestorXPath2(nodes, options) {
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return null;
    }
    const elements = nodes.filter((node) => isElement(node));
    if (elements.length === 0) {
      return null;
    }
    const ancestor = findCommonAncestorElement(elements);
    if (!ancestor) {
      return null;
    }
    return getXPathForNode2(ancestor, options);
  }
  function getXPathForSelection2(selection, options) {
    const activeSelection = selection ?? (typeof window !== "undefined" ? window.getSelection() : null);
    if (!activeSelection || activeSelection.rangeCount === 0) {
      return {
        text: "",
        range: null,
        startXPath: null,
        endXPath: null,
        commonXPath: null
      };
    }
    const range = activeSelection.getRangeAt(0).cloneRange();
    const startElement = getContainingElement(range.startContainer);
    const endElement = getContainingElement(range.endContainer);
    const startXPath = startElement ? getXPathForNode2(startElement, options) : null;
    const endXPath = endElement ? getXPathForNode2(endElement, options) : null;
    const nodesForAncestor = [startElement, endElement].filter(
      (value) => isElement(value)
    );
    const commonXPath = nodesForAncestor.length ? findCommonAncestorXPath2(nodesForAncestor, options) : null;
    return {
      text: activeSelection.toString(),
      range,
      startXPath,
      endXPath,
      commonXPath
    };
  }
  function isXPathMatch2(node, xpath, context, options) {
    if (!isElement(node)) {
      return false;
    }
    const resolved = resolveXPath2(xpath, context ?? node.ownerDocument ?? void 0, options);
    return resolved === node;
  }
  return {
    resolveXPath: resolveXPath2,
    getXPathForNode: getXPathForNode2,
    getShortestUniqueXPath: getShortestUniqueXPath2,
    findCommonAncestorXPath: findCommonAncestorXPath2,
    getXPathForSelection: getXPathForSelection2,
    normalizeXPath,
    isXPathMatch: isXPathMatch2
  };
}

// src/default-generator.ts
var defaultGenerator = createXPathGenerator();

// src/utils/element-helpers.ts
var CLASS_ATTRIBUTE_WRAPPER = "concat(' ', normalize-space(@class), ' ')";
var SIMPLE_SELECTOR_TOKEN = /^[^.#[]+/;
function getElementByXPath(xpath, context, options) {
  return defaultGenerator.resolveXPath(xpath, context, options);
}
function getElementText(element, trim = true) {
  if (!element) {
    return "";
  }
  const text = element.textContent ?? "";
  return trim ? text.trim() : text;
}
function getXPathById(id, options) {
  const element = document.getElementById(id);
  if (!element) {
    return null;
  }
  return defaultGenerator.getXPathForNode(element, options);
}
function getXPathByClass(className, options) {
  const elements = document.getElementsByClassName(className);
  if (elements.length === 0) {
    return null;
  }
  if (options?.multiple === "all") {
    return Array.from(elements).map(
      (el) => defaultGenerator.getXPathForNode(el, options)
    );
  }
  return defaultGenerator.getXPathForNode(elements[0], options);
}
function getXPathByTag(tagName, options) {
  const elements = document.getElementsByTagName(tagName);
  if (elements.length === 0) {
    return null;
  }
  if (options?.multiple === "all") {
    return Array.from(elements).map(
      (el) => defaultGenerator.getXPathForNode(el, options)
    );
  }
  return defaultGenerator.getXPathForNode(elements[0], options);
}
function getXPathByLabel(labelText, options) {
  const labels = Array.from(document.getElementsByTagName("label")).filter(
    (label) => label.textContent?.trim() === labelText
  );
  if (labels.length === 0) {
    return null;
  }
  const elements = [];
  for (const label of labels) {
    const forAttr = label.getAttribute("for");
    if (forAttr) {
      const element = document.getElementById(forAttr);
      if (element) {
        elements.push(element);
      }
    } else {
      const input = label.querySelector("input, select, textarea, button");
      if (input) {
        elements.push(input);
      }
    }
  }
  if (elements.length === 0) {
    return null;
  }
  if (options?.multiple === "all") {
    return elements.map((el) => defaultGenerator.getXPathForNode(el, options));
  }
  return defaultGenerator.getXPathForNode(elements[0], options);
}
function getXPathByAttribute(attributeName, attributeValue, options) {
  const selector = attributeValue ? `[${attributeName}="${attributeValue}"]` : `[${attributeName}]`;
  const elements = document.querySelectorAll(selector);
  if (elements.length === 0) {
    return null;
  }
  if (options?.multiple === "all") {
    return Array.from(elements).map(
      (el) => defaultGenerator.getXPathForNode(el, options)
    );
  }
  return defaultGenerator.getXPathForNode(elements[0], options);
}
function getXPathBySelector(selector, options) {
  const elements = document.querySelectorAll(selector);
  if (elements.length === 0) {
    return null;
  }
  if (options?.multiple === "all") {
    return Array.from(elements).map(
      (el) => defaultGenerator.getXPathForNode(el, options)
    );
  }
  return defaultGenerator.getXPathForNode(elements[0], options);
}
function getXPathByText(text, exact = true, options) {
  const allElements = document.getElementsByTagName("*");
  const matches = [];
  for (let i = 0; i < allElements.length; i++) {
    const element = allElements[i];
    const elementText = element.textContent?.trim() ?? "";
    if (exact ? elementText === text : elementText.includes(text)) {
      matches.push(element);
    }
  }
  if (matches.length === 0) {
    return null;
  }
  if (options?.multiple === "all") {
    return matches.map((el) => defaultGenerator.getXPathForNode(el, options));
  }
  return defaultGenerator.getXPathForNode(matches[0], options);
}
function getEvaluationContext(contextNode) {
  const fallbackDoc = typeof document !== "undefined" ? document : null;
  const context = contextNode ?? fallbackDoc;
  if (!context) {
    return null;
  }
  const doc = context.nodeType === Node.DOCUMENT_NODE ? context : context.ownerDocument ?? fallbackDoc;
  if (!doc) {
    return null;
  }
  return { context, doc };
}
function select(expression, contextNode) {
  const normalized = normalizeXPath(expression);
  if (!normalized) {
    return [];
  }
  const evaluationContext = getEvaluationContext(contextNode);
  if (!evaluationContext) {
    return [];
  }
  const { context, doc } = evaluationContext;
  const resolver = doc.createNSResolver?.(doc.documentElement ?? context) ?? void 0;
  try {
    const result = doc.evaluate(
      normalized,
      context,
      resolver,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    const nodes = [];
    for (let i = 0; i < result.snapshotLength; i += 1) {
      const node = result.snapshotItem(i);
      if (node) {
        nodes.push(node);
      }
    }
    return nodes;
  } catch {
    return [];
  }
}
function selectOne(expression, contextNode) {
  const nodes = select(expression, contextNode);
  return nodes.length ? nodes[0] : null;
}
function isXPathSyntaxValid(expression, contextNode) {
  const normalized = normalizeXPath(expression);
  if (!normalized) {
    return false;
  }
  const evaluationContext = getEvaluationContext(contextNode);
  if (!evaluationContext) {
    return false;
  }
  const { context, doc } = evaluationContext;
  const resolver = doc.createNSResolver?.(doc.documentElement ?? context) ?? void 0;
  try {
    doc.evaluate(normalized, context, resolver, XPathResult.ANY_TYPE, null);
    return true;
  } catch {
    return false;
  }
}
function doesXPathResolveToElement(expression, contextNode, options) {
  return Boolean(getElementByXPath(expression, contextNode, options));
}
function isAttributeNode(node) {
  return node.nodeType === Node.ATTRIBUTE_NODE;
}
function getAttributeNodes(expression, contextNode) {
  return select(expression, contextNode).filter(isAttributeNode);
}
function getAttributeValue(expression, contextNode) {
  const attributes = getAttributeNodes(expression, contextNode);
  if (!attributes.length) {
    return null;
  }
  return attributes[0].value;
}
function getAttributeValues(expression, contextNode) {
  return getAttributeNodes(expression, contextNode).map((attr) => attr.value);
}
function cssToXPath(selector) {
  const trimmed = selector.trim();
  if (!trimmed) {
    throw new Error("CSS selector cannot be empty.");
  }
  const selectors = splitSelectors(trimmed);
  const xpathSegments = selectors.map(convertSingleCssSelector).filter(Boolean);
  if (!xpathSegments.length) {
    throw new Error(`Unable to convert CSS selector "${selector}" to XPath.`);
  }
  return xpathSegments.join(" | ");
}
function xpathToCss(xpath) {
  const normalized = normalizeXPath(xpath);
  if (!normalized) {
    return null;
  }
  const segments = parseXPathAxes(normalized);
  if (!segments.length) {
    return null;
  }
  const cssParts = [];
  for (const segment of segments) {
    if (!segment.selector) {
      continue;
    }
    const cssSegment = convertXPathSegmentToCss(segment.selector);
    if (!cssSegment) {
      return null;
    }
    if (!cssParts.length) {
      cssParts.push(cssSegment);
    } else {
      const combinator = segment.combinator === "child" ? " > " : " ";
      cssParts.push(`${combinator}${cssSegment}`);
    }
  }
  return cssParts.join("");
}
function splitSelectors(selector) {
  const result = [];
  let current = "";
  let depth = 0;
  for (let i = 0; i < selector.length; i += 1) {
    const ch = selector[i];
    if (ch === "[") {
      depth += 1;
    } else if (ch === "]") {
      depth = Math.max(0, depth - 1);
    } else if (ch === "," && depth === 0) {
      if (current.trim()) {
        result.push(current.trim());
      }
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) {
    result.push(current.trim());
  }
  return result;
}
function convertSingleCssSelector(selector) {
  const tokens = tokenizeSelector(selector);
  if (!tokens.length) {
    return null;
  }
  const xpathParts = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token.selector) {
      continue;
    }
    const simple = buildSimpleSelectorXPath(token.selector);
    if (!simple) {
      return null;
    }
    if (i === 0) {
      xpathParts.push(`//${simple}`);
    } else {
      const axis = token.combinator === "child" ? "/" : "//";
      xpathParts.push(`${axis}${simple}`);
    }
  }
  return xpathParts.join("");
}
function tokenizeSelector(selector) {
  const tokens = [];
  let buffer = "";
  let depth = 0;
  let pending = "descendant";
  const flush = () => {
    if (buffer.trim()) {
      tokens.push({ selector: buffer.trim(), combinator: pending });
      buffer = "";
    }
  };
  for (let i = 0; i < selector.length; i += 1) {
    const ch = selector[i];
    if (ch === "[") {
      depth += 1;
      buffer += ch;
      continue;
    }
    if (ch === "]") {
      depth = Math.max(0, depth - 1);
      buffer += ch;
      continue;
    }
    if (depth === 0) {
      if (ch === ">") {
        flush();
        pending = "child";
        continue;
      }
      if (ch === " ") {
        if (buffer) {
          flush();
          pending = "descendant";
        }
        while (selector[i + 1] === " ") {
          i += 1;
        }
        continue;
      }
    }
    buffer += ch;
  }
  flush();
  return tokens;
}
function buildSimpleSelectorXPath(selector) {
  let remaining = selector;
  let tag = "*";
  const predicates = [];
  const tagMatch = remaining.match(/^[a-zA-Z_][\w-]*/);
  if (tagMatch) {
    tag = tagMatch[0];
    remaining = remaining.slice(tag.length);
  }
  while (remaining.length) {
    const ch = remaining[0];
    if (ch === "#") {
      const idMatch = remaining.slice(1).match(SIMPLE_SELECTOR_TOKEN);
      if (!idMatch) {
        return null;
      }
      const value = idMatch[0];
      predicates.push(`@id="${value}"`);
      remaining = remaining.slice(value.length + 1);
      continue;
    }
    if (ch === ".") {
      const classMatch = remaining.slice(1).match(SIMPLE_SELECTOR_TOKEN);
      if (!classMatch) {
        return null;
      }
      const value = classMatch[0];
      predicates.push(`contains(${CLASS_ATTRIBUTE_WRAPPER}, ' ${value} ')`);
      remaining = remaining.slice(value.length + 1);
      continue;
    }
    if (ch === "[") {
      const closingIndex = remaining.indexOf("]");
      if (closingIndex === -1) {
        return null;
      }
      const attrBody = remaining.slice(1, closingIndex).trim();
      predicates.push(parseAttributeSelector(attrBody));
      remaining = remaining.slice(closingIndex + 1);
      continue;
    }
    if (ch === ":") {
      const pseudoMatch = remaining.match(/^:nth-of-type\((\d+)\)/);
      if (pseudoMatch) {
        predicates.push(`position()=${pseudoMatch[1]}`);
        remaining = remaining.slice(pseudoMatch[0].length);
        continue;
      }
      return null;
    }
    return null;
  }
  const predicate = predicates.length ? `[${predicates.join(" and ")}]` : "";
  return `${tag}${predicate}`;
}
function parseAttributeSelector(body) {
  const equalityMatch = body.match(/^(\w[\w-]*)([*^$|~]?=)?(.+)?$/);
  if (!equalityMatch) {
    return "@*";
  }
  const [, attr, operator, rawValue] = equalityMatch;
  if (!operator) {
    return `@${attr}`;
  }
  const value = rawValue?.trim().replace(/^['"]|['"]$/g, "") ?? "";
  switch (operator) {
    case "=":
      return `@${attr}="${value}"`;
    case "^=":
      return `starts-with(@${attr}, "${value}")`;
    case "$=":
      return `substring(@${attr}, string-length(@${attr}) - string-length("${value}") + 1) = "${value}"`;
    case "*=":
      return `contains(@${attr}, "${value}")`;
    case "~=":
      return `contains(concat(' ', normalize-space(@${attr}), ' '), ' ${value} ')`;
    case "|=":
      return `(@${attr}="${value}" or starts-with(@${attr}, "${value}-"))`;
    default:
      return `@${attr}`;
  }
}
function parseXPathAxes(xpath) {
  const segments = [];
  let i = 0;
  let combinator = "descendant";
  while (i < xpath.length) {
    if (xpath[i] === "/") {
      if (xpath[i + 1] === "/") {
        combinator = "descendant";
        i += 2;
      } else {
        combinator = "child";
        i += 1;
      }
    }
    let buffer = "";
    let depth = 0;
    while (i < xpath.length) {
      const ch = xpath[i];
      if (ch === "/" && depth === 0) {
        break;
      }
      if (ch === "[") {
        depth += 1;
      } else if (ch === "]") {
        depth = Math.max(0, depth - 1);
      }
      buffer += ch;
      i += 1;
    }
    if (buffer) {
      segments.push({ combinator, selector: buffer });
    }
  }
  return segments;
}
function convertXPathSegmentToCss(segment) {
  const match = segment.match(/^([a-zA-Z_][\w-]*|\*)(.*)$/);
  if (!match) {
    return null;
  }
  const [, tag, predicatePart] = match;
  let css = tag === "*" ? "*" : tag;
  const predicates = predicatePart.match(/\[[^\]]+\]/g) ?? [];
  for (const predicate of predicates) {
    const inner = predicate.slice(1, -1).trim();
    if (inner.startsWith("@id=")) {
      const value = inner.split("=")[1]?.replace(/^"|"$/g, "") ?? "";
      css += `#${value}`;
    } else if (inner.startsWith("@") && inner.includes("=")) {
      const [attr, val] = inner.split("=");
      const cleanAttr = attr.replace("@", "").trim();
      const cleanVal = val.replace(/^"|"$/g, "");
      css += `[${cleanAttr}="${cleanVal}"]`;
    } else if (inner.startsWith("contains") && inner.includes("@class")) {
      const classMatch = inner.match(/' ([^']+) '/);
      if (classMatch) {
        css += `.${classMatch[1]}`;
      }
    } else if (/^position\(\)=\d+$/.test(inner)) {
      const index = inner.split("=")[1];
      css += `:nth-of-type(${index})`;
    } else {
      return null;
    }
  }
  return css;
}

// src/index.ts
var {
  resolveXPath,
  getXPathForNode,
  getShortestUniqueXPath,
  findCommonAncestorXPath,
  getXPathForSelection,
  normalizeXPath: normalizeXPath2,
  isXPathMatch
} = defaultGenerator;

export { DEFAULT_HEURISTICS, createHeuristicRegistry, createXPathGenerator, cssToXPath, doesXPathResolveToElement, findCommonAncestorXPath, getAttributeValue, getAttributeValues, getElementByXPath, getElementText, getShortestUniqueXPath, getXPathByAttribute, getXPathByClass, getXPathById, getXPathByLabel, getXPathBySelector, getXPathByTag, getXPathByText, getXPathForNode, getXPathForSelection, isXPathMatch, isXPathSyntaxValid, normalizeXPath2 as normalizeXPath, resolveXPath, select, selectOne, xpathToCss };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map