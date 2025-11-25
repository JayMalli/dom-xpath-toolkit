import type { NormalizedOptions } from '../options';

export function isElement(node: any): node is Element {
  return (
    node != null &&
    typeof node === 'object' &&
    node.nodeType === Node.ELEMENT_NODE &&
    typeof node.tagName === 'string'
  );
}

export function getDocument(context: Document | Element): Document | null {
  if (context instanceof Document) {
    return context;
  }
  return context.ownerDocument ?? (typeof document !== 'undefined' ? document : null);
}

export function createNamespaceResolver(
  doc: Document,
  context: Document | Element
): XPathNSResolver | null {
  if (typeof doc.createNSResolver !== 'function') {
    return null;
  }
  const rootForResolver = context instanceof Document ? context.documentElement : context;
  return rootForResolver ? doc.createNSResolver(rootForResolver) : null;
}

export function getRootElement(
  node: Element,
  options: NormalizedOptions,
  doc: Document | null
): Element | null {
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

export function getContainingElement(node: Node | null): Element | null {
  if (!node) {
    return null;
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    return node as Element;
  }
  if (node.nodeType === Node.DOCUMENT_NODE) {
    return (node as Document).documentElement;
  }
  if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    return (node as DocumentFragment).firstElementChild;
  }
  return (node as ChildNode).parentElement;
}

export function hasSameTagSiblings(node: Element): boolean {
  const parent = node.parentElement;
  if (!parent) {
    return false;
  }
  const tag = node.tagName;
  for (const sibling of Array.from(parent.children)) {
    if (sibling === node) {
      continue;
    }
    if ((sibling as Element).tagName === tag) {
      return true;
    }
  }
  return false;
}

export function getElementIndex(node: Element): number {
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

export function findCommonAncestorElement(nodes: Element[]): Element | null {
  if (nodes.length === 0) {
    return null;
  }

  let candidate: Element | null = nodes[0];
  while (candidate) {
    const current: Element = candidate;
    const containsAll = nodes.every((node) => current === node || current.contains(node));
    if (containsAll) {
      return current;
    }
    candidate = current.parentElement;
  }
  return null;
}

export function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\0-\x1f\x7f-\x9f!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, (char) => `\\${char}`);
}

export function escapeXPathString(value: string): string {
  if (!value.includes('"')) {
    return `"${value}"`;
  }
  if (!value.includes("'")) {
    return `'${value}'`;
  }

  const parts = value.split('"');
  const concatParts: string[] = [];

  for (let i = 0; i < parts.length; i += 1) {
    const segment = parts[i];
    concatParts.push(segment ? `"${segment}"` : '""');
    if (i < parts.length - 1) {
      concatParts.push('\'"\'');
    }
  }

  return `concat(${concatParts.join(', ')})`;
}
