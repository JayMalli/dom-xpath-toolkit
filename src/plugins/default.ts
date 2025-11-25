import type { NormalizedOptions } from '../options';
import { buildAttributeSelector, isAttributeUnique } from '../internal/attributes';
import { escapeXPathString, isElement } from '../internal/dom';
import type { XPathHeuristic, XPathHeuristicContext, XPathSegmentContext } from './types';

function getScope(options: NormalizedOptions, node: Element): Document | Element | null {
  if (isElement(options.root)) {
    return options.root;
  }
  if (options.root instanceof Document) {
    return options.root;
  }
  return node.ownerDocument ?? null;
}

const idHeuristic: XPathHeuristic = {
  name: 'default:id',
  provideSelector(context: XPathHeuristicContext): string | null {
    const { node, options, doc } = context;
    if (!options.preferId || !node.id) {
      return null;
    }
    // Skip universal selectors when a custom root (non-document-root) is specified
    const isCustomRoot = isElement(options.root) && options.root !== doc.documentElement;
    if (isCustomRoot) {
      return null;
    }
    const scope = getScope(options, node);
    if (!isAttributeUnique(node, 'id', scope)) {
      return null;
    }
    return `//*[@id=${escapeXPathString(node.id)}]`;
  },
};

const uniqueAttributeHeuristic: XPathHeuristic = {
  name: 'default:unique-attribute',
  provideSelector(context: XPathHeuristicContext): string | null {
    const { node, options, doc } = context;
    if (!options.preferUniqueAttributes.length) {
      return null;
    }
    // Skip universal selectors when a custom root (non-document-root) is specified
    const isCustomRoot = isElement(options.root) && options.root !== doc.documentElement;
    if (isCustomRoot) {
      return null;
    }
    const scope = getScope(options, node);
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
    return null;
  },
};

const segmentNormalizationHeuristic: XPathHeuristic = {
  name: 'default:segment-normalization',
  decorateSegment(context: XPathSegmentContext): string | null {
    const { segment } = context;
    return segment;
  },
};

const rootHeuristic: XPathHeuristic = {
  name: 'default:root-element',
  provideSelector(context: XPathHeuristicContext): string | null {
    const { node, root } = context;
    if (node === root) {
      return `/${node.tagName.toLowerCase()}`;
    }
    return null;
  },
};

export const DEFAULT_HEURISTICS: XPathHeuristic[] = [
  idHeuristic,
  uniqueAttributeHeuristic,
  rootHeuristic,
  segmentNormalizationHeuristic,
];
