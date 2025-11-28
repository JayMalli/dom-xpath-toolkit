import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import {
  createNamespaceResolver,
  getContainingElement,
  cssEscape,
  escapeXPathString,
} from '../src/internal/dom';
import { isAttributeUnique, buildAttributeSelector } from '../src/internal/attributes';

describe('internal DOM utilities', () => {
  let testDocument: Document;
  let originalCSS: typeof CSS | undefined;
  const globalWithCSS = globalThis as typeof globalThis & { CSS?: typeof CSS };

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="unique" data-id="solo">Unique</div>
      <div id="dup-a" data-id="duplicate"></div>
      <div id="dup-b" data-id="duplicate"></div>
    `;
    testDocument = document;
    originalCSS = globalWithCSS.CSS;
  });

  afterEach(() => {
    if (originalCSS) {
      globalWithCSS.CSS = originalCSS;
    } else {
      Reflect.deleteProperty(globalWithCSS, 'CSS');
    }
  });

  describe('createNamespaceResolver', () => {
    it('returns resolver when document supports the API', () => {
      const fakeResolver = vi.fn(() => ({ lookupNamespaceURI: () => null }));
      const fakeDoc = {
        createNSResolver: fakeResolver,
      } as unknown as Document;

      const resolver = createNamespaceResolver(fakeDoc, testDocument);
      expect(resolver).not.toBeNull();
      expect(fakeResolver).toHaveBeenCalledWith(testDocument.documentElement);
    });

    it('returns null when createNSResolver is unavailable', () => {
      const stubDoc = {} as Document;
      expect(createNamespaceResolver(stubDoc, testDocument)).toBeNull();
    });
  });

  describe('getContainingElement', () => {
    it('returns documentElement for document inputs', () => {
      expect(getContainingElement(testDocument)).toBe(testDocument.documentElement);
    });

    it('returns first element child for document fragments', () => {
      const fragment = testDocument.createDocumentFragment();
      const child = testDocument.createElement('span');
      fragment.appendChild(child);
      expect(getContainingElement(fragment)).toBe(child);
    });

    it('falls back to parentElement for text nodes', () => {
      const container = testDocument.createElement('div');
      container.textContent = 'text';
      testDocument.body.appendChild(container);
      const textNode = container.firstChild;
      expect(getContainingElement(textNode)).toBe(container);
    });
  });

  describe('attribute helpers', () => {
    it('detects when attribute is unique inside the provided scope', () => {
      const node = testDocument.getElementById('unique')!;
      expect(isAttributeUnique(node, 'data-id', testDocument)).toBe(true);
    });

    it('returns false when scope is missing or attribute duplicated', () => {
      const duplicate = testDocument.getElementById('dup-a')!;
      expect(isAttributeUnique(duplicate, 'data-id', null)).toBe(false);
      expect(isAttributeUnique(duplicate, 'data-id', testDocument)).toBe(false);
    });

    it('uses fallback traversal when querySelectorAll throws', () => {
      const node = testDocument.getElementById('unique')!;
      const originalQuery = testDocument.querySelectorAll;
      const mutableDocument = testDocument as Document & {
        querySelectorAll: typeof originalQuery;
      };
      mutableDocument.querySelectorAll = (() => {
        throw new Error('selector not supported');
      }) as typeof originalQuery;

      expect(isAttributeUnique(node, 'data-id', testDocument)).toBe(true);

      mutableDocument.querySelectorAll = originalQuery;
    });

    it('builds attribute selectors with escaped values', () => {
      expect(buildAttributeSelector('data-id', `hero"quote'`)).toContain('concat(');
    });
  });

  describe('string escaping helpers', () => {
    it('escapes characters when CSS.escape is unavailable', () => {
      Reflect.deleteProperty(globalWithCSS, 'CSS');
      expect(cssEscape('label value:button')).toBe('label value\\:button');
    });

    it('produces concat expressions when both quote types are present', () => {
      const result = escapeXPathString(`He said "hi" and 'bye'`);
      expect(result.startsWith('concat(')).toBe(true);
      expect(result).toContain(`'"'`);
    });
  });
});
