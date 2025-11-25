import { defaultGenerator } from '../default-generator';
import type { XPathOptions } from '../types';
import { normalizeXPath } from './xpath';

type Combinator = 'descendant' | 'child';

const CLASS_ATTRIBUTE_WRAPPER = "concat(' ', normalize-space(@class), ' ')";
const SIMPLE_SELECTOR_TOKEN = /^[^.#[]+/;

/**
 * Get element/node by XPath expression
 * @param xpath - XPath expression to locate the element
 * @param context - Optional context (Document or Element) to evaluate XPath from
 * @param options - Optional XPath generation options
 * @returns The matched Element or null if not found
 * @example
 * ```typescript
 * const element = getElementByXPath('/html/body/div[1]/p[2]');
 * const contextElement = getElementByXPath('./span', document.getElementById('container'));
 * ```
 */
export function getElementByXPath(
  xpath: string,
  context?: Document | Element,
  options?: XPathOptions
): Element | null {
  return defaultGenerator.resolveXPath(xpath, context, options);
}

/**
 * Get text content of an element
 * @param element - The element to extract text from
 * @param trim - Whether to trim whitespace (default: true)
 * @returns The text content of the element
 * @example
 * ```typescript
 * const element = document.getElementById('myElement');
 * const text = getElementText(element);
 * const rawText = getElementText(element, false);
 * ```
 */
export function getElementText(element: Element, trim = true): string {
  if (!element) {
    return '';
  }
  const text = element.textContent ?? '';
  return trim ? text.trim() : text;
}

/**
 * Options for getting XPath by various selectors
 */
export interface ElementSelectorOptions extends XPathOptions {
  /**
   * If multiple elements match, return XPath for which one
   * - 'first': First matching element (default)
   * - 'all': Array of XPaths for all matching elements
   */
  multiple?: 'first' | 'all';
}

/**
 * Get XPath of element(s) by ID
 * @param id - Element ID to search for
 * @param options - Optional selector and XPath options
 * @returns XPath string or array of XPath strings, or null if not found
 * @example
 * ```typescript
 * const xpath = getXPathById('myElement');
 * const allXPaths = getXPathById('myClass', { multiple: 'all' });
 * ```
 */
export function getXPathById(
  id: string,
  options?: ElementSelectorOptions
): string | string[] | null {
  const element = document.getElementById(id);
  if (!element) {
    return null;
  }
  return defaultGenerator.getXPathForNode(element, options);
}

/**
 * Get XPath of element(s) by class name
 * @param className - Class name to search for
 * @param options - Optional selector and XPath options
 * @returns XPath string, array of XPath strings, or null if not found
 * @example
 * ```typescript
 * const xpath = getXPathByClass('btn-primary');
 * const allXPaths = getXPathByClass('btn', { multiple: 'all' });
 * ```
 */
export function getXPathByClass(
  className: string,
  options?: ElementSelectorOptions
): string | string[] | null {
  const elements = document.getElementsByClassName(className);
  if (elements.length === 0) {
    return null;
  }

  if (options?.multiple === 'all') {
    return Array.from(elements).map(el => 
      defaultGenerator.getXPathForNode(el as Element, options)
    );
  }

  return defaultGenerator.getXPathForNode(elements[0] as Element, options);
}

/**
 * Get XPath of element(s) by tag name
 * @param tagName - Tag name to search for (e.g., 'div', 'span', 'p')
 * @param options - Optional selector and XPath options
 * @returns XPath string, array of XPath strings, or null if not found
 * @example
 * ```typescript
 * const xpath = getXPathByTag('button');
 * const allXPaths = getXPathByTag('input', { multiple: 'all' });
 * ```
 */
export function getXPathByTag(
  tagName: string,
  options?: ElementSelectorOptions
): string | string[] | null {
  const elements = document.getElementsByTagName(tagName);
  if (elements.length === 0) {
    return null;
  }

  if (options?.multiple === 'all') {
    return Array.from(elements).map(el => 
      defaultGenerator.getXPathForNode(el as Element, options)
    );
  }

  return defaultGenerator.getXPathForNode(elements[0] as Element, options);
}

/**
 * Get XPath of element(s) by label text
 * @param labelText - Label text to search for
 * @param options - Optional selector and XPath options
 * @returns XPath string, array of XPath strings, or null if not found
 * @example
 * ```typescript
 * const xpath = getXPathByLabel('Username');
 * const allXPaths = getXPathByLabel('Email', { multiple: 'all' });
 * ```
 */
export function getXPathByLabel(
  labelText: string,
  options?: ElementSelectorOptions
): string | string[] | null {
  const labels = Array.from(document.getElementsByTagName('label')).filter(
    label => label.textContent?.trim() === labelText
  );

  if (labels.length === 0) {
    return null;
  }

  // Get the associated input/form elements
  const elements: Element[] = [];
  for (const label of labels) {
    const forAttr = label.getAttribute('for');
    if (forAttr) {
      const element = document.getElementById(forAttr);
      if (element) {
        elements.push(element);
      }
    } else {
      // Check for nested input
      const input = label.querySelector('input, select, textarea, button');
      if (input) {
        elements.push(input);
      }
    }
  }

  if (elements.length === 0) {
    return null;
  }

  if (options?.multiple === 'all') {
    return elements.map(el => defaultGenerator.getXPathForNode(el, options));
  }

  return defaultGenerator.getXPathForNode(elements[0], options);
}

/**
 * Get XPath of element(s) by attribute
 * @param attributeName - Attribute name to search for
 * @param attributeValue - Optional attribute value to match
 * @param options - Optional selector and XPath options
 * @returns XPath string, array of XPath strings, or null if not found
 * @example
 * ```typescript
 * const xpath = getXPathByAttribute('data-testid', 'submit-btn');
 * const allXPaths = getXPathByAttribute('role', 'button', { multiple: 'all' });
 * const anyXPaths = getXPathByAttribute('disabled'); // Any element with disabled attribute
 * ```
 */
export function getXPathByAttribute(
  attributeName: string,
  attributeValue?: string,
  options?: ElementSelectorOptions
): string | string[] | null {
  const selector = attributeValue 
    ? `[${attributeName}="${attributeValue}"]`
    : `[${attributeName}]`;
  
  const elements = document.querySelectorAll(selector);
  if (elements.length === 0) {
    return null;
  }

  if (options?.multiple === 'all') {
    return Array.from(elements).map(el => 
      defaultGenerator.getXPathForNode(el as Element, options)
    );
  }

  return defaultGenerator.getXPathForNode(elements[0] as Element, options);
}

/**
 * Get XPath of element(s) by CSS selector
 * @param selector - CSS selector to search for
 * @param options - Optional selector and XPath options
 * @returns XPath string, array of XPath strings, or null if not found
 * @example
 * ```typescript
 * const xpath = getXPathBySelector('.container > .btn-primary');
 * const allXPaths = getXPathBySelector('div[data-active="true"]', { multiple: 'all' });
 * ```
 */
export function getXPathBySelector(
  selector: string,
  options?: ElementSelectorOptions
): string | string[] | null {
  const elements = document.querySelectorAll(selector);
  if (elements.length === 0) {
    return null;
  }

  if (options?.multiple === 'all') {
    return Array.from(elements).map(el => 
      defaultGenerator.getXPathForNode(el as Element, options)
    );
  }

  return defaultGenerator.getXPathForNode(elements[0] as Element, options);
}

/**
 * Get XPath of element(s) by text content
 * @param text - Text content to search for
 * @param exact - Whether to match exact text (default: true) or partial match
 * @param options - Optional selector and XPath options
 * @returns XPath string, array of XPath strings, or null if not found
 * @example
 * ```typescript
 * const xpath = getXPathByText('Click me');
 * const partialXPath = getXPathByText('Click', false);
 * const allXPaths = getXPathByText('Submit', true, { multiple: 'all' });
 * ```
 */
export function getXPathByText(
  text: string,
  exact = true,
  options?: ElementSelectorOptions
): string | string[] | null {
  const allElements = document.getElementsByTagName('*');
  const matches: Element[] = [];

  for (let i = 0; i < allElements.length; i++) {
    const element = allElements[i];
    const elementText = element.textContent?.trim() ?? '';
    
    if (exact ? elementText === text : elementText.includes(text)) {
      matches.push(element);
    }
  }

  if (matches.length === 0) {
    return null;
  }

  if (options?.multiple === 'all') {
    return matches.map(el => defaultGenerator.getXPathForNode(el, options));
  }

  return defaultGenerator.getXPathForNode(matches[0], options);
}

function getEvaluationContext(
  contextNode?: Node | Document
): { context: Node; doc: Document } | null {
  const fallbackDoc = typeof document !== 'undefined' ? document : null;
  const context = contextNode ?? fallbackDoc;
  if (!context) {
    return null;
  }

  const doc =
    context.nodeType === Node.DOCUMENT_NODE
      ? (context as Document)
      : context.ownerDocument ?? fallbackDoc;

  if (!doc) {
    return null;
  }

  return { context, doc };
}

/**
 * Execute an XPath expression and return all matching nodes.
 * @param expression - XPath expression to evaluate
 * @param contextNode - Optional context node to scope the evaluation
 * @returns Array of matching nodes in document order
 */
export function select(
  expression: string,
  contextNode?: Node | Document
): Node[] {
  const normalized = normalizeXPath(expression);
  if (!normalized) {
    return [];
  }

  const evaluationContext = getEvaluationContext(contextNode);
  if (!evaluationContext) {
    return [];
  }

  const { context, doc } = evaluationContext;
  const resolver = doc.createNSResolver?.(doc.documentElement ?? context) ?? undefined;

  try {
    const result = doc.evaluate(
      normalized,
      context,
      resolver,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );

    const nodes: Node[] = [];
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

/**
 * Execute an XPath expression and return the first matching node (if any).
 * @param expression - XPath expression to evaluate
 * @param contextNode - Optional context node to scope the evaluation
 * @returns First matching node or null when none found
 */
export function selectOne(
  expression: string,
  contextNode?: Node | Document
): Node | null {
  const nodes = select(expression, contextNode);
  return nodes.length ? nodes[0] : null;
}

/**
 * Check whether an XPath expression is syntactically valid.
 * @param expression - XPath expression to validate
 * @param contextNode - Optional node to use as evaluation scope
 * @returns true when the expression parses; false otherwise
 */
export function isXPathSyntaxValid(
  expression: string,
  contextNode?: Node | Document
): boolean {
  const normalized = normalizeXPath(expression);
  if (!normalized) {
    return false;
  }

  const evaluationContext = getEvaluationContext(contextNode);
  if (!evaluationContext) {
    return false;
  }

  const { context, doc } = evaluationContext;
  const resolver = doc.createNSResolver?.(doc.documentElement ?? context) ?? undefined;
  try {
    doc.evaluate(normalized, context, resolver, XPathResult.ANY_TYPE, null);
    return true;
  } catch {
    return false;
  }
}

/**
 * Determine whether an XPath resolves to an actual Element node.
 * @param expression - XPath expression to test
 * @param contextNode - Optional context to scope evaluation
 * @param options - XPath generation options (e.g., custom root)
 * @returns true if the expression resolves to an Element
 */
export function doesXPathResolveToElement(
  expression: string,
  contextNode?: Document | Element,
  options?: XPathOptions
): boolean {
  return Boolean(getElementByXPath(expression, contextNode, options));
}

function isAttributeNode(node: Node | Attr): node is Attr {
  return node.nodeType === Node.ATTRIBUTE_NODE;
}

function getAttributeNodes(
  expression: string,
  contextNode?: Node | Document
): Attr[] {
  return select(expression, contextNode).filter(isAttributeNode);
}

/**
 * Execute an XPath attribute expression and return the first attribute value.
 * @param expression - XPath expression that selects attribute nodes (e.g. //a/@href)
 * @param contextNode - Optional context node for relative evaluation
 * @returns Attribute value (string) or null when no attribute matches
 */
export function getAttributeValue(
  expression: string,
  contextNode?: Node | Document
): string | null {
  const attributes = getAttributeNodes(expression, contextNode);
  if (!attributes.length) {
    return null;
  }
  return attributes[0].value;
}

/**
 * Execute an XPath attribute expression and return all attribute values.
 * @param expression - XPath expression that selects attribute nodes (e.g. //img/@alt)
 * @param contextNode - Optional context node for relative evaluation
 * @returns Array of attribute values (empty when none match)
 */
export function getAttributeValues(
  expression: string,
  contextNode?: Node | Document
): string[] {
  return getAttributeNodes(expression, contextNode).map(attr => attr.value);
}

/**
 * Convert a CSS selector into an equivalent XPath expression.
 * Supports tag, id, class, attribute selectors, descendant and child combinators.
 * Multiple selectors separated by commas become XPath unions.
 */
export function cssToXPath(selector: string): string {
  const trimmed = selector.trim();
  if (!trimmed) {
    throw new Error('CSS selector cannot be empty.');
  }

  const selectors = splitSelectors(trimmed);
  const xpathSegments = selectors.map(convertSingleCssSelector).filter(Boolean) as string[];

  if (!xpathSegments.length) {
    throw new Error(`Unable to convert CSS selector "${selector}" to XPath.`);
  }

  return xpathSegments.join(' | ');
}

/**
 * Best-effort conversion from XPath back to CSS.
 * Only handles simple descendant/child axes with attribute and class predicates.
 */
export function xpathToCss(xpath: string): string | null {
  const normalized = normalizeXPath(xpath);
  if (!normalized) {
    return null;
  }

  const segments = parseXPathAxes(normalized);
  if (!segments.length) {
    return null;
  }

  const cssParts: string[] = [];
  for (const segment of segments) {
    if (!segment.selector) {
      continue;
    }
    const cssSegment = convertXPathSegmentToCss(segment.selector);
    if (!cssSegment) {
      return null; // unsupported predicate
    }

    if (!cssParts.length) {
      cssParts.push(cssSegment);
    } else {
      const combinator = segment.combinator === 'child' ? ' > ' : ' ';
      cssParts.push(`${combinator}${cssSegment}`);
    }
  }

  return cssParts.join('');
}

function splitSelectors(selector: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;
  for (let i = 0; i < selector.length; i += 1) {
    const ch = selector[i];
    if (ch === '[') {
      depth += 1;
    } else if (ch === ']') {
      depth = Math.max(0, depth - 1);
    } else if (ch === ',' && depth === 0) {
      if (current.trim()) {
        result.push(current.trim());
      }
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) {
    result.push(current.trim());
  }
  return result;
}

function convertSingleCssSelector(selector: string): string | null {
  const tokens = tokenizeSelector(selector);
  if (!tokens.length) {
    return null;
  }

  const xpathParts: string[] = [];
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
      const axis = token.combinator === 'child' ? '/' : '//';
      xpathParts.push(`${axis}${simple}`);
    }
  }
  return xpathParts.join('');
}

function tokenizeSelector(selector: string): Array<{ selector: string; combinator: Combinator }>
{
  const tokens: Array<{ selector: string; combinator: Combinator }> = [];
  let buffer = '';
  let depth = 0;
  let pending: Combinator = 'descendant';

  const flush = () => {
    if (buffer.trim()) {
      tokens.push({ selector: buffer.trim(), combinator: pending });
      buffer = '';
    }
  };

  for (let i = 0; i < selector.length; i += 1) {
    const ch = selector[i];
    if (ch === '[') {
      depth += 1;
      buffer += ch;
      continue;
    }
    if (ch === ']') {
      depth = Math.max(0, depth - 1);
      buffer += ch;
      continue;
    }
    if (depth === 0) {
      if (ch === '>') {
        flush();
        pending = 'child';
        continue;
      }
      if (ch === ' ') {
        if (buffer) {
          flush();
          pending = 'descendant';
        }
        while (selector[i + 1] === ' ') {
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

function buildSimpleSelectorXPath(selector: string): string | null {
  let remaining = selector;
  let tag = '*';
  const predicates: string[] = [];

  const tagMatch = remaining.match(/^[a-zA-Z_][\w-]*/);
  if (tagMatch) {
    tag = tagMatch[0];
    remaining = remaining.slice(tag.length);
  }

  while (remaining.length) {
    const ch = remaining[0];
    if (ch === '#') {
      const idMatch = remaining.slice(1).match(SIMPLE_SELECTOR_TOKEN);
      if (!idMatch) {
        return null;
      }
      const value = idMatch[0];
      predicates.push(`@id="${value}"`);
      remaining = remaining.slice(value.length + 1);
      continue;
    }
    if (ch === '.') {
      const classMatch = remaining.slice(1).match(SIMPLE_SELECTOR_TOKEN);
      if (!classMatch) {
        return null;
      }
      const value = classMatch[0];
      predicates.push(`contains(${CLASS_ATTRIBUTE_WRAPPER}, ' ${value} ')`);
      remaining = remaining.slice(value.length + 1);
      continue;
    }
    if (ch === '[') {
      const closingIndex = remaining.indexOf(']');
      if (closingIndex === -1) {
        return null;
      }
      const attrBody = remaining.slice(1, closingIndex).trim();
      predicates.push(parseAttributeSelector(attrBody));
      remaining = remaining.slice(closingIndex + 1);
      continue;
    }
    if (ch === ':') {
      // limited pseudo support (nth-child)
      const pseudoMatch = remaining.match(/^:nth-of-type\((\d+)\)/);
      if (pseudoMatch) {
        predicates.push(`position()=${pseudoMatch[1]}`);
        remaining = remaining.slice(pseudoMatch[0].length);
        continue;
      }
      return null; // unsupported pseudo-class
    }
    // unsupported token
    return null;
  }

  const predicate = predicates.length ? `[${predicates.join(' and ')}]` : '';
  return `${tag}${predicate}`;
}

function parseAttributeSelector(body: string): string {
  const equalityMatch = body.match(/^(\w[\w-]*)([*^$|~]?=)?(.+)?$/);
  if (!equalityMatch) {
    return '@*';
  }
  const [, attr, operator, rawValue] = equalityMatch;
  if (!operator) {
    return `@${attr}`;
  }
  const value = rawValue?.trim().replace(/^['"]|['"]$/g, '') ?? '';
  switch (operator) {
    case '=':
      return `@${attr}="${value}"`;
    case '^=':
      return `starts-with(@${attr}, "${value}")`;
    case '$=':
      return `substring(@${attr}, string-length(@${attr}) - string-length("${value}") + 1) = "${value}"`;
    case '*=':
      return `contains(@${attr}, "${value}")`;
    case '~=':
      return `contains(concat(' ', normalize-space(@${attr}), ' '), ' ${value} ')`;
    case '|=':
      return `(@${attr}="${value}" or starts-with(@${attr}, "${value}-"))`;
    default:
      return `@${attr}`;
  }
}

interface XPathSegment {
  combinator: Combinator;
  selector: string | null;
}

function parseXPathAxes(xpath: string): XPathSegment[] {
  const segments: XPathSegment[] = [];
  let i = 0;
  let combinator: Combinator = 'descendant';
  while (i < xpath.length) {
    if (xpath[i] === '/') {
      if (xpath[i + 1] === '/') {
        combinator = 'descendant';
        i += 2;
      } else {
        combinator = 'child';
        i += 1;
      }
    }
    let buffer = '';
    let depth = 0;
    while (i < xpath.length) {
      const ch = xpath[i];
      if (ch === '/' && depth === 0) {
        break;
      }
      if (ch === '[') {
        depth += 1;
      } else if (ch === ']') {
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

function convertXPathSegmentToCss(segment: string): string | null {
  const match = segment.match(/^([a-zA-Z_][\w-]*|\*)(.*)$/);
  if (!match) {
    return null;
  }
  const [, tag, predicatePart] = match;
  let css = tag === '*' ? '*' : tag;
  const predicates = predicatePart.match(/\[[^\]]+\]/g) ?? [];

  for (const predicate of predicates) {
    const inner = predicate.slice(1, -1).trim();
    if (inner.startsWith('@id=')) {
      const value = inner.split('=')[1]?.replace(/^"|"$/g, '') ?? '';
      css += `#${value}`;
    } else if (inner.startsWith('@') && inner.includes('=')) {
      const [attr, val] = inner.split('=');
      const cleanAttr = attr.replace('@', '').trim();
      const cleanVal = val.replace(/^"|"$/g, '');
      css += `[${cleanAttr}="${cleanVal}"]`;
    } else if (inner.startsWith('contains') && inner.includes('@class')) {
      const classMatch = inner.match(/' ([^']+) '/);
      if (classMatch) {
        css += `.${classMatch[1]}`;
      }
    } else if (/^position\(\)=\d+$/.test(inner)) {
      const index = inner.split('=')[1];
      css += `:nth-of-type(${index})`;
    } else {
      return null;
    }
  }

  return css;
}
