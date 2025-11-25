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

    // If evaluating from an Element context and the XPath starts with that element's tag,
    // strip the leading tag to make it relative to the context element
    let pathToEvaluate = normalizedPath;
    if (isElement(evalContext) && normalizedPath.startsWith(`/${evalContext.tagName.toLowerCase()}/`)) {
      // Remove the leading "/{tag}/" to get a relative path like "/p[1]/span"
      // Then change the leading "/" to "./" to make it explicitly relative
      const afterTag = normalizedPath.substring(evalContext.tagName.toLowerCase().length + 2);
      pathToEvaluate = `./${afterTag}`;
    } else if (isElement(evalContext) && normalizedPath === `/${evalContext.tagName.toLowerCase()}`) {
      // The path is exactly the context element itself
      return evalContext;
    }

    try {
      const result = doc.evaluate(
        pathToEvaluate,
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
        return normalizeXPath(selector);
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

    for (const heuristic of heuristics) {
      const adjusted = heuristic.afterGenerate?.(baseContext, normalized);
      if (typeof adjusted === 'string' && adjusted.length) {
        normalized = normalizeXPath(adjusted);
      }
    }

    return normalized;
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
    findCommonAncestorXPath,
    getXPathForSelection,
    normalizeXPath,
    isXPathMatch,
  };
}
