import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  findCommonAncestorXPath,
  getXPathForNode,
  getXPathForSelection,
  isXPathMatch,
  normalizeXPath,
  resolveXPath,
} from '../src/xpath';

const FIXTURE = `
  <div id="root">
    <main data-testid="main">
      <section class="content">
        <p data-testid="first">Hello <span class="highlight">world</span></p>
        <p>Another <span data-test="special">paragraph</span></p>
      </section>
      <footer>
        <button name="save">Save</button>
      </footer>
    </main>
  </div>
`;

describe('xpath toolkit', () => {
  beforeEach(() => {
    document.body.innerHTML = FIXTURE;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    const selection = window.getSelection();
    selection?.removeAllRanges();
  });

  describe('getXPathForNode', () => {
    it('prefers unique id when available', () => {
      const element = document.getElementById('root');
      expect(element).toBeTruthy();
      const xpath = getXPathForNode(element!);
      expect(xpath).toBe('//*[@id="root"]');
      expect(resolveXPath(xpath)).toBe(element);
    });

    it('falls back to preferred unique attributes', () => {
      const button = document.querySelector('button[name="save"]') as Element;
      const xpath = getXPathForNode(button);
      expect(xpath).toBe('//*[@name="save"]');
    });

    it('adds indexes when siblings share the same tag', () => {
      const paragraph = document.querySelectorAll('section.content > p')[1] as Element;
      const xpath = getXPathForNode(paragraph, { minIndex: 'auto' });
      expect(xpath).toContain('p[2]');
      expect(resolveXPath(xpath)).toBe(paragraph);
    });

    it('supports restricting the root element', () => {
      const section = document.querySelector('section.content') as Element;
      const span = section.querySelector('span.highlight') as Element;
      const xpath = getXPathForNode(span, { root: section, minIndex: 'auto' });
      expect(xpath.startsWith('/section')).toBe(true);
      expect(resolveXPath(xpath, section)).toBe(span);
    });

    it('throws when the node is outside the configured root', () => {
      const section = document.querySelector('section.content') as Element;
      const footer = document.querySelector('footer') as Element;
      expect(() => getXPathForNode(footer, { root: section })).toThrow();
    });
  });

  describe('resolveXPath', () => {
    it('returns null for invalid expressions', () => {
      expect(resolveXPath('!!!')).toBeNull();
    });

    it('resolves generated paths back to their elements', () => {
      const span = document.querySelector('span.highlight') as Element;
      const xpath = getXPathForNode(span);
      expect(resolveXPath(xpath)).toBe(span);
    });
  });

  describe('findCommonAncestorXPath', () => {
    it('returns the XPath of the shared ancestor', () => {
      const firstSpan = document.querySelector('p[data-testid="first"] span') as Element;
      const secondSpan = document.querySelector('p:nth-of-type(2) span') as Element;
      const ancestorXPath = findCommonAncestorXPath([firstSpan, secondSpan]);
      expect(ancestorXPath).toBeTruthy();
      const ancestor = resolveXPath(ancestorXPath!);
      expect(ancestor?.tagName.toLowerCase()).toBe('section');
    });
  });

  describe('getXPathForSelection', () => {
    it('returns selection metadata when a range exists', () => {
      const selection = window.getSelection();
      const range = document.createRange();
      const firstSpan = document.querySelector('p[data-testid="first"] span') as Element;
      range.selectNodeContents(firstSpan);
      selection?.removeAllRanges();
      selection?.addRange(range);

      const snapshot = getXPathForSelection(selection);
      expect(snapshot.text.trim()).toBe('world');
      expect(snapshot.range).toBeInstanceOf(Range);
      expect(snapshot.startXPath).toBeTruthy();
      expect(snapshot.endXPath).toBeTruthy();
      expect(snapshot.commonXPath).toBe(snapshot.startXPath);
    });

    it('returns empty values when no selection exists', () => {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      const snapshot = getXPathForSelection(selection);
      expect(snapshot.text).toBe('');
      expect(snapshot.startXPath).toBeNull();
      expect(snapshot.commonXPath).toBeNull();
    });
  });

  describe('normalizeXPath', () => {
    it('trims whitespace, trailing slashes, and excessive separators', () => {
      expect(normalizeXPath(' //div///span// ')).toBe('//div//span');
    });

    it('returns empty string for falsy input', () => {
      expect(normalizeXPath('')).toBe('');
    });
  });

  describe('isXPathMatch', () => {
    it('confirms when a node matches the XPath', () => {
      const span = document.querySelector('span.highlight') as Element;
      const xpath = getXPathForNode(span);
      expect(isXPathMatch(span, xpath)).toBe(true);
    });

    it('returns false when nodes do not align', () => {
      const span = document.querySelector('span.highlight') as Element;
      const button = document.querySelector('button[name="save"]') as Element;
      const xpath = getXPathForNode(span);
      expect(isXPathMatch(button, xpath)).toBe(false);
    });
  });
});
