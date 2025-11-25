import { createHeuristicRegistry, DEFAULT_HEURISTICS } from './plugins';
import type { XPathHeuristic } from './plugins';
import type { NormalizedOptions } from './options';
import { normalizeOptions } from './options';
import {
  createNamespaceResolver,
  findCommonAncestorElement,
  getContainingElement,
  getDocument,
  getElementIndex,
  getRootElement,
  hasSameTagSiblings,
  isElement,
} from './internal/dom';
import type { SelectionResult, XPathGenerator, XPathGeneratorConfig, XPathOptions } from './types';
import { normalizeXPath } from './utils/xpath';

function mergeOptions(defaults: XPathOptions | undefined, overrides?: XPathOptions): XPathOptions | undefined {
  if (!defaults) {
    return overrides;
  }
  if (!overrides) {
    return defaults;
  }
  return {
    ...defaults,
    ...overrides,
    preferUniqueAttributes:
      overrides.preferUniqueAttributes ?? defaults.preferUniqueAttributes,
  };
}

function shouldIncludeIndex(node: Element, strategy: NormalizedOptions['minIndex']): boolean {
  switch (strategy) {
    case 'always':
      return true;
    case 'never':
      return false;
    case 'auto':
    default:
      return hasSameTagSiblings(node);
  }
}

function buildSegment(node: Element, options: NormalizedOptions): string {
  let segment = node.tagName.toLowerCase();
  if (shouldIncludeIndex(node, options.minIndex)) {
    segment += `[${getElementIndex(node)}]`;
  }
  return segment;
}

export function createXPathGenerator(config?: XPathGeneratorConfig): XPathGenerator {
  const defaults = config?.defaultOptions;
  const registry = createHeuristicRegistry(DEFAULT_HEURISTICS);
  if (config?.plugins?.length) {
    registry.register(...config.plugins);
  }

  const listHeuristics = (): XPathHeuristic[] => registry.list();

  interface SelectorResult {
    selector: string;
    segments?: string[];
  }

  const buildSelectorResult = (
    node: Element,
    settings: NormalizedOptions,
    rootElement: Element,
    doc: Document | null,
    heuristics: XPathHeuristic[]
  ): SelectorResult => {
    const ancestorChain: Element[] = [];
    let walker: Element | null = node.parentElement;
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
      ancestors: ancestorChain,
    };

    for (const heuristic of heuristics) {
      const selector = heuristic.provideSelector?.(baseContext);
      if (selector) {
        return { selector: normalizeXPath(selector) };
      }
    }

    const segments: string[] = [];
    let current: Element | null = node;
    while (current) {
      const context = {
        node: current,
        doc: baseContext.doc,
        root: rootElement,
        options: settings,
        ancestors: ancestorChain,
      };

      for (const heuristic of heuristics) {
        heuristic.beforeSegment?.(context);
      }

      let segment = buildSegment(current, settings);
      for (const heuristic of heuristics) {
        const decorated = heuristic.decorateSegment?.({
          node: current,
          segment,
          indexStrategy: settings.minIndex,
        });
        if (typeof decorated === 'string' && decorated.length > 0) {
          segment = decorated;
        }
      }

      segments.unshift(segment);

      if (current === rootElement) {
        break;
      }
      current = current.parentElement;
    }

    const xpath = `/${segments.join('/')}`;
    let normalized = normalizeXPath(xpath);
    let finalizedSegments: string[] | undefined = [...segments];

    for (const heuristic of heuristics) {
      const adjusted = heuristic.afterGenerate?.(baseContext, normalized);
      if (typeof adjusted === 'string' && adjusted.length) {
        const updated = normalizeXPath(adjusted);
        if (updated !== normalized) {
          finalizedSegments = undefined;
        }
        normalized = updated;
      }
    }

    return {
      selector: normalized,
      segments: finalizedSegments,
    };
  };

  const buildEvaluationPlan = (xpath: string, context: Document | Element): { node?: Element; expression?: string } => {
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

  const buildShortestCandidates = (segments: string[]): string[] => {
    if (!segments.length) {
      return [];
    }
    const candidates = new Set<string>();
    const absolute = `/${segments.join('/')}`;
    candidates.add(absolute);
    candidates.add(`/${segments.map(stripSegmentIndex).join('/')}`);

    for (let i = 0; i < segments.length; i += 1) {
      const tail = segments.slice(i);
      candidates.add(`//${tail.join('/')}`);
      candidates.add(`//${tail.map(stripSegmentIndex).join('/')}`);
    }

    return Array.from(candidates)
      .map((candidate) => normalizeXPath(candidate))
      .filter((candidate) => candidate.length)
      .sort((a, b) => a.length - b.length);
  };

  const stripSegmentIndex = (segment: string): string => segment.replace(/\[\d+\]$/u, '');

  const matchesUniqueNode = (
    xpath: string,
    evalContext: Document | Element,
    doc: Document,
    resolver: XPathNSResolver | null,
    target: Element
  ): boolean => {
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

  function resolveXPath(
    xpath: string,
    context?: Document | Element,
    options?: XPathOptions
  ): Element | null {
    const normalizedPath = normalizeXPath(xpath);
    if (!normalizedPath) {
      return null;
    }

    const merged = mergeOptions(defaults, options);
    const settings = normalizeOptions(merged);
    const evalContext =
      settings.root ?? context ?? (typeof document !== 'undefined' ? document : null);
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

  function getXPathForNode(node: Element, options?: XPathOptions): string {
    if (!isElement(node)) {
      throw new TypeError('Expected an Element to compute XPath.');
    }

    const merged = mergeOptions(defaults, options);
    const settings = normalizeOptions(merged);

    const doc = getDocument(node);
    const rootElement = getRootElement(node, settings, doc);

    if (!rootElement) {
      throw new Error('Unable to determine a document root for XPath computation.');
    }

    if (!(rootElement === node || rootElement.contains(node))) {
      throw new Error('The provided node does not belong to the configured root.');
    }

    const heuristics = listHeuristics();
    const result = buildSelectorResult(node, settings, rootElement, doc, heuristics);
    return result.selector;
  }

  function getShortestUniqueXPath(node: Element, options?: XPathOptions): string {
    if (!isElement(node)) {
      throw new TypeError('Expected an Element to compute XPath.');
    }

    const merged = mergeOptions(defaults, options);
    const settings = normalizeOptions(merged);

    const doc = getDocument(node);
    const rootElement = getRootElement(node, settings, doc);

    if (!rootElement) {
      throw new Error('Unable to determine a document root for XPath computation.');
    }

    if (!(rootElement === node || rootElement.contains(node))) {
      throw new Error('The provided node does not belong to the configured root.');
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

  function findCommonAncestorXPath(
    nodes: Element[],
    options?: XPathOptions
  ): string | null {
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return null;
    }

    const elements = nodes.filter((node): node is Element => isElement(node));
    if (elements.length === 0) {
      return null;
    }

    const ancestor = findCommonAncestorElement(elements);
    if (!ancestor) {
      return null;
    }

    return getXPathForNode(ancestor, options);
  }

  function getXPathForSelection(
    selection?: Selection | null,
    options?: XPathOptions
  ): SelectionResult {
    const activeSelection = selection ?? (typeof window !== 'undefined' ? window.getSelection() : null);
    if (!activeSelection || activeSelection.rangeCount === 0) {
      return {
        text: '',
        range: null,
        startXPath: null,
        endXPath: null,
        commonXPath: null,
      };
    }

    const range = activeSelection.getRangeAt(0).cloneRange();
    const startElement = getContainingElement(range.startContainer);
    const endElement = getContainingElement(range.endContainer);

    const startXPath = startElement ? getXPathForNode(startElement, options) : null;
    const endXPath = endElement ? getXPathForNode(endElement, options) : null;

    const nodesForAncestor = [startElement, endElement].filter(
      (value): value is Element => isElement(value)
    );
    const commonXPath = nodesForAncestor.length
      ? findCommonAncestorXPath(nodesForAncestor, options)
      : null;

    return {
      text: activeSelection.toString(),
      range,
      startXPath,
      endXPath,
      commonXPath,
    };
  }

  function isXPathMatch(
    node: Element,
    xpath: string,
    context?: Document | Element,
    options?: XPathOptions
  ): boolean {
    if (!isElement(node)) {
      return false;
    }
    const resolved = resolveXPath(xpath, context ?? node.ownerDocument ?? undefined, options);
    return resolved === node;
  }

  return {
    resolveXPath,
    getXPathForNode,
    getShortestUniqueXPath,
    findCommonAncestorXPath,
    getXPathForSelection,
    normalizeXPath,
    isXPathMatch,
  };
}
