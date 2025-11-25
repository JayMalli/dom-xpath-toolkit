import type { XPathHeuristic } from './plugins';

export type IndexingStrategy = 'auto' | 'always' | 'never';

export interface XPathOptions {
  preferId?: boolean;
  preferUniqueAttributes?: string[];
  minIndex?: IndexingStrategy;
  root?: Document | Element;
  namespaceResolver?: XPathNSResolver | null;
}

export interface SelectionResult {
  text: string;
  range: Range | null;
  startXPath: string | null;
  endXPath: string | null;
  commonXPath: string | null;
}

export interface XPathGeneratorConfig {
  defaultOptions?: XPathOptions;
  plugins?: XPathHeuristic[];
}

export interface XPathGenerator {
  resolveXPath: (
    xpath: string,
    context?: Document | Element,
    options?: XPathOptions
  ) => Element | null;
  getXPathForNode: (node: Element, options?: XPathOptions) => string;
  getShortestUniqueXPath: (node: Element, options?: XPathOptions) => string;
  findCommonAncestorXPath: (nodes: Element[], options?: XPathOptions) => string | null;
  getXPathForSelection: (selection?: Selection | null, options?: XPathOptions) => SelectionResult;
  normalizeXPath: (xpath: string) => string;
  isXPathMatch: (
    node: Element,
    xpath: string,
    context?: Document | Element,
    options?: XPathOptions
  ) => boolean;
}
