import { defaultGenerator } from './default-generator';

export const {
	resolveXPath,
	getXPathForNode,
	getShortestUniqueXPath,
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

// Element helper utilities
export {
	getElementByXPath,
	getElementText,
	getXPathById,
	getXPathByClass,
	getXPathByTag,
	getXPathByLabel,
	getXPathByAttribute,
	getXPathBySelector,
	getXPathByText,
	select,
	selectOne,
	getAttributeValue,
	getAttributeValues,
	isXPathSyntaxValid,
	doesXPathResolveToElement,
	cssToXPath,
	xpathToCss,
} from './utils/element-helpers';
export type { ElementSelectorOptions } from './utils/element-helpers';
