import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import {
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
} from '../src/index';

describe('Element Helper Functions', () => {
  let dom: JSDOM;
  let document: Document;

  beforeEach(() => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="container" class="main-container">
            <h1 class="title">Welcome</h1>
            <p class="text">This is a paragraph</p>
            <button id="submit-btn" class="btn btn-primary" data-testid="submit">Submit</button>
            <label for="username">Username
              <input id="username" type="text" name="user" />
            </label>
            <label>Password
              <input id="password" type="password" name="pass" />
            </label>
            <div class="btn">Another button</div>
            <span role="alert">Error message</span>
            <ul id="items">
              <li class="item">First</li>
              <li class="item featured">Second</li>
              <li class="item">Third</li>
            </ul>
            <div class="cards">
              <article class="card" data-id="card-1">
                <span class="label">Alpha</span>
              </article>
              <article class="card" data-id="card-2">
                <span class="label">Beta</span>
              </article>
            </div>
            <a class="nav-link primary" href="/home">Home</a>
            <a class="nav-link secondary" data-tracking="hero" href="/learn">Learn More</a>
          </div>
        </body>
      </html>
    `);
    document = dom.window.document;
    (globalThis as typeof globalThis & { document: Document }).document = document;
  });

  describe('getElementByXPath', () => {
    it('should get element by XPath', () => {
      const element = getElementByXPath('/html/body/div');
      expect(element).not.toBeNull();
      expect(element?.id).toBe('container');
    });

    it('should return null for invalid XPath', () => {
      const element = getElementByXPath('/html/body/nonexistent');
      expect(element).toBeNull();
    });

    it('should work with context element', () => {
      const container = document.getElementById('container');
      const element = getElementByXPath('./h1', container!);
      expect(element).not.toBeNull();
      expect(element?.className).toBe('title');
    });
  });

  describe('getElementText', () => {
    it('should get trimmed text content', () => {
      const element = document.querySelector('.title');
      const text = getElementText(element!);
      expect(text).toBe('Welcome');
    });

    it('should get raw text when trim is false', () => {
      const element = document.querySelector('.text');
      const text = getElementText(element!, false);
      expect(text).toContain('This is a paragraph');
    });

    it('should return empty string for null element', () => {
      const text = getElementText(null as any);
      expect(text).toBe('');
    });
  });

  describe('getXPathById', () => {
    it('should get XPath for element by ID', () => {
      const xpath = getXPathById('submit-btn');
      expect(xpath).not.toBeNull();
      expect(typeof xpath).toBe('string');
      expect(xpath).toContain('button');
    });

    it('should return null for non-existent ID', () => {
      const xpath = getXPathById('nonexistent');
      expect(xpath).toBeNull();
    });
  });

  describe('getXPathByClass', () => {
    it('should get XPath for first element by class', () => {
      const xpath = getXPathByClass('btn');
      expect(xpath).not.toBeNull();
      expect(typeof xpath).toBe('string');
    });

    it('should get XPath for all elements by class', () => {
      const xpaths = getXPathByClass('btn', { multiple: 'all' });
      expect(Array.isArray(xpaths)).toBe(true);
      expect((xpaths as string[]).length).toBeGreaterThan(1);
    });

    it('should return null for non-existent class', () => {
      const xpath = getXPathByClass('nonexistent-class');
      expect(xpath).toBeNull();
    });
  });

  describe('getXPathByTag', () => {
    it('should get XPath for first element by tag', () => {
      const xpath = getXPathByTag('button');
      expect(xpath).not.toBeNull();
      expect(typeof xpath).toBe('string');
    });

    it('should get XPath for all elements by tag', () => {
      const xpaths = getXPathByTag('input', { multiple: 'all' });
      expect(Array.isArray(xpaths)).toBe(true);
      expect((xpaths as string[]).length).toBe(2);
    });

    it('should return null for non-existent tag', () => {
      const xpath = getXPathByTag('section');
      expect(xpath).toBeNull();
    });
  });

  describe('getXPathByLabel', () => {
    it('should get XPath for element associated with label', () => {
      const xpath = getXPathByLabel('Username');
      expect(xpath).not.toBeNull();
      expect(typeof xpath).toBe('string');
    });

    it('should get XPath for nested input in label', () => {
      const xpath = getXPathByLabel('Password');
      expect(xpath).not.toBeNull();
      expect(typeof xpath).toBe('string');
    });

    it('should return null for non-existent label', () => {
      const xpath = getXPathByLabel('Email');
      expect(xpath).toBeNull();
    });
  });

  describe('getXPathByAttribute', () => {
    it('should get XPath for element by attribute name and value', () => {
      const xpath = getXPathByAttribute('data-testid', 'submit');
      expect(xpath).not.toBeNull();
      expect(typeof xpath).toBe('string');
    });

    it('should get XPath for element by attribute name only', () => {
      const xpath = getXPathByAttribute('role');
      expect(xpath).not.toBeNull();
      expect(typeof xpath).toBe('string');
    });

    it('should get all elements by attribute', () => {
      const xpaths = getXPathByAttribute('type', undefined, { multiple: 'all' });
      expect(Array.isArray(xpaths)).toBe(true);
    });

    it('should return null for non-existent attribute', () => {
      const xpath = getXPathByAttribute('data-nonexistent', 'value');
      expect(xpath).toBeNull();
    });
  });

  describe('getXPathBySelector', () => {
    it('should get XPath for element by CSS selector', () => {
      const xpath = getXPathBySelector('.main-container > .title');
      expect(xpath).not.toBeNull();
      expect(typeof xpath).toBe('string');
    });

    it('should get all elements by CSS selector', () => {
      const xpaths = getXPathBySelector('input', { multiple: 'all' });
      expect(Array.isArray(xpaths)).toBe(true);
      expect((xpaths as string[]).length).toBe(2);
    });

    it('should return null for non-matching selector', () => {
      const xpath = getXPathBySelector('.nonexistent-selector');
      expect(xpath).toBeNull();
    });
  });

  describe('getXPathByText', () => {
    it('should get XPath for element by exact text', () => {
      const xpath = getXPathByText('Welcome');
      expect(xpath).not.toBeNull();
      expect(typeof xpath).toBe('string');
    });

    it('should get XPath for element by partial text', () => {
      const xpath = getXPathByText('paragraph', false);
      expect(xpath).not.toBeNull();
      expect(typeof xpath).toBe('string');
    });

    it('should get all elements by text', () => {
      const xpaths = getXPathByText('button', false, { multiple: 'all' });
      expect(Array.isArray(xpaths)).toBe(true);
    });

    it('should return null for non-matching text', () => {
      const xpath = getXPathByText('Nonexistent Text');
      expect(xpath).toBeNull();
    });
  });

  describe('select', () => {
    it('should return all matching nodes for expression', () => {
      const nodes = select('//button');
      expect(Array.isArray(nodes)).toBe(true);
      expect(nodes.length).toBe(1);
      expect((nodes[0] as Element).id).toBe('submit-btn');
    });

    it('should respect provided context node', () => {
      const container = document.getElementById('container');
      const nodes = select('.//div[@class="btn"]', container!);
      expect(nodes.length).toBe(1);
      expect((nodes[0] as Element).classList.contains('btn')).toBe(true);
    });

    it('should return empty array for invalid expressions', () => {
      const nodes = select('//nonexistent');
      expect(nodes).toEqual([]);
    });
  });

  describe('selectOne', () => {
    it('should return the first matching node', () => {
      const node = selectOne('//span');
      expect(node).not.toBeNull();
      expect((node as Element).getAttribute('role')).toBe('alert');
    });

    it('should return null when no matches found', () => {
      const node = selectOne('//section');
      expect(node).toBeNull();
    });
  });

  describe('getAttributeValue', () => {
    it('should return attribute value from expression', () => {
      const value = getAttributeValue('//button/@data-testid');
      expect(value).toBe('submit');
    });

    it('should respect context nodes', () => {
      const container = document.getElementById('container');
      const value = getAttributeValue('.//label/@for', container!);
      expect(value).toBe('username');
    });

    it('should return null when no attribute matches', () => {
      expect(getAttributeValue('//button/@disabled')).toBeNull();
    });
  });

  describe('getAttributeValues', () => {
    it('should return all attribute values from expression', () => {
      const values = getAttributeValues('//input/@name');
      expect(values).toEqual(['user', 'pass']);
    });

    it('should return empty array when no attributes match', () => {
      expect(getAttributeValues('//input/@placeholder')).toEqual([]);
    });
  });

  describe('advanced XPath navigation and filtering', () => {
    it('supports positional filtering predicates', () => {
      const laterItems = select('//ul[@id="items"]/li[position()>2]');
      expect(laterItems.length).toBe(1);
      expect(laterItems[0]?.textContent?.trim()).toBe('Third');

      const lastCard = selectOne('//article[@class="card"][last()]');
      expect((lastCard as Element)?.getAttribute('data-id')).toBe('card-2');
    });

    it('navigates using relationship axes', () => {
      const parentDiv = selectOne('//button/parent::div');
      expect((parentDiv as Element)?.id).toBe('container');

      const precedingSiblings = select('//button/preceding-sibling::*');
      expect(precedingSiblings.length).toBeGreaterThan(1);

      const followingSibling = selectOne('//h1/following-sibling::p[1]');
      expect((followingSibling as Element)?.classList.contains('text')).toBe(true);

      const ancestor = selectOne('//span[@role="alert"]/ancestor::div[@id="container"]');
      expect(ancestor).not.toBeNull();

      const descendant = select('//div[@id="container"]/descendant::span[@class="label"]');
      expect(descendant.length).toBe(2);
    });

    it('applies string matching helpers', () => {
      const containsClass = select('//button[contains(@class, "btn-primary")]');
      expect(containsClass.length).toBe(1);

      const startsWithText = select('//ul[@id="items"]/li[starts-with(text(), "Fir")]');
      expect(startsWithText.length).toBe(1);
      expect(startsWithText[0]?.textContent?.trim()).toBe('First');

      const pseudoEndsWith = select(
        '//a[substring(@href, string-length(@href) - string-length("learn") + 1) = "learn"]'
      );
      expect(pseudoEndsWith.length).toBe(1);
      expect((pseudoEndsWith[0] as Element)?.getAttribute('href')).toBe('/learn');
    });
  });

  describe('XPath validation helpers', () => {
    it('validates syntax correctly', () => {
      expect(isXPathSyntaxValid('//div')).toBe(true);
      expect(isXPathSyntaxValid('//div[')).toBe(false);
      expect(isXPathSyntaxValid('')).toBe(false);
    });

    it('checks whether expressions resolve to elements', () => {
      expect(doesXPathResolveToElement('//button')).toBe(true);
      expect(doesXPathResolveToElement('//section')).toBe(false);

      const container = document.getElementById('container');
      expect(doesXPathResolveToElement('.//li[@class="item"]', container!)).toBe(true);
    });
  });

  describe('selector conversions', () => {
    it('converts CSS to XPath', () => {
      const xpath = cssToXPath('div.container > ul li.active');
      expect(xpath).toBe("//div[contains(concat(' ', normalize-space(@class), ' '), ' container ')]/ul//li[contains(concat(' ', normalize-space(@class), ' '), ' active ')]");
    });

    it('converts multi-selectors', () => {
      const xpath = cssToXPath('#header, .item');
      expect(xpath.split('|').length).toBe(2);
    });

    it('best-effort converts XPath to CSS', () => {
      const css = xpathToCss("//div[@id=\"container\"]/ul//li[contains(concat(' ', normalize-space(@class), ' '), ' featured ')]");
      expect(css).toBe('div#container > ul li.featured');
    });
  });
});
