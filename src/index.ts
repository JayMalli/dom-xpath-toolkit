import { defaultGenerator } from './default-generator';

export const {
	resolveXPath,
	getXPathForNode,
	findCommonAncestorXPath,
	getXPathForSelection,
	normalizeXPath,
	isXPathMatch,
} = defaultGenerator;

export { createXPathGenerator } from './generator';
export type {
	XPathOptions,
	SelectionResult,
	XPathGenerator,
	XPathGeneratorConfig,
	IndexingStrategy,
} from './types';
export {
	createHeuristicRegistry,
	DEFAULT_HEURISTICS,
} from './plugins';
export type {
	XPathHeuristic,
	XPathHeuristicContext,
	XPathSegmentContext,
} from './plugins';
