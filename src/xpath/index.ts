import { defaultGenerator } from '../default-generator';

export const {
  resolveXPath,
  getXPathForNode,
  getShortestUniqueXPath,
  findCommonAncestorXPath,
  getXPathForSelection,
  normalizeXPath,
  isXPathMatch,
} = defaultGenerator;

export { createXPathGenerator } from '../generator';
export { createHeuristicRegistry, DEFAULT_HEURISTICS } from '../plugins';
export type {
  XPathOptions,
  SelectionResult,
  XPathGenerator,
  XPathGeneratorConfig,
  IndexingStrategy,
} from '../types';
export type {
  XPathHeuristic,
  XPathHeuristicContext,
  XPathSegmentContext,
} from '../plugins';
