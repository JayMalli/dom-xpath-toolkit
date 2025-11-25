import { cssEscape, escapeXPathString } from './dom';

interface UniquenessScope {
  scopeRoot: Document | Element;
  queryRoot: Document | Element;
}

function resolveScope(scope: Document | Element): UniquenessScope | null {
  if (scope instanceof Document) {
    return {
      scopeRoot: scope,
      queryRoot: scope,
    };
  }
  const owner = scope.ownerDocument;
  if (!owner) {
    return null;
  }
  return {
    scopeRoot: scope,
    queryRoot: scope,
  };
}

export function isAttributeUnique(
  node: Element,
  attribute: string,
  scope: Document | Element | null
): boolean {
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

function countAttributeMatchesFallback(
  scope: Document | Element,
  attribute: string,
  value: string
): number {
  const rootElement = scope instanceof Document ? scope.documentElement : scope;
  if (!rootElement) {
    return 0;
  }

  let count = 0;
  const stack: Element[] = [rootElement];
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
      stack.push(child as Element);
    }
  }
  return count;
}

export function buildAttributeSelector(attribute: string, value: string): string {
  return `//*[@${attribute}=${escapeXPathString(value)}]`;
}
