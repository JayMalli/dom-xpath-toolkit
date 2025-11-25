import { beforeEach, describe, expect, it } from 'vitest';
import {
  findCommonAncestorXPath,
  getXPathForNode,
  getXPathForSelection,
} from '../../src/xpath';

describe('XPath snapshots', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="root">
        <article data-testid="story">
          <h1 class="title">Snapshot Heading</h1>
          <section>
            <p class="copy">Lorem <span class="accent">ipsum</span></p>
            <p class="copy">Dolor <span class="accent">sit</span></p>
          </section>
        </article>
      </div>
    `;
  });

  it('captures the XPath for a highlighted element', () => {
    const accent = document.querySelector('p.copy:nth-of-type(2) span.accent') as Element;
    expect(getXPathForNode(accent)).toMatchInlineSnapshot(
      '"/html/body/div/article/section/p[2]/span"'
    );
  });

  it('captures the ancestor XPath for related nodes', () => {
    const accents = Array.from(document.querySelectorAll('span.accent')) as Element[];
    expect(findCommonAncestorXPath(accents)).toMatchInlineSnapshot('"/html/body/div/article/section"');
  });

  it('captures selection metadata snapshot', () => {
    const selection = window.getSelection();
    selection?.removeAllRanges();
    const range = document.createRange();
    const title = document.querySelector('h1.title') as Element;
    range.selectNodeContents(title);
    selection?.addRange(range);
    expect(getXPathForSelection(selection)).toMatchInlineSnapshot(`
      {
        "commonXPath": "//*[@class="title"]",
        "endXPath": "//*[@class="title"]",
        "range": Range {},
        "startXPath": "//*[@class="title"]",
        "text": "Snapshot Heading",
      }
    `);
  });
});
