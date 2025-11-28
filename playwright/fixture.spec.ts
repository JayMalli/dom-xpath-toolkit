import { test, expect, Page } from '@playwright/test';

const FIXTURE_ROUTE = '/test/fixtures/all-elements.html';
const MODULE_ENTRY = '/dist/index.js';

type ToolkitWindow = typeof window & { domXPathToolkit?: Record<string, unknown> };

async function openFixtureWithToolkit(page: Page): Promise<void> {
  await page.goto(FIXTURE_ROUTE);
  await page.evaluate(async (modulePath) => {
    const globalWindow = window as ToolkitWindow;
    if (!globalWindow.domXPathToolkit) {
      globalWindow.domXPathToolkit = await import(modulePath);
    }
  }, MODULE_ENTRY);
  await page.waitForFunction(() => Boolean((window as ToolkitWindow).domXPathToolkit));
}

test.describe('fixture playground', () => {
  test.beforeEach(async ({ page }) => {
    await openFixtureWithToolkit(page);
  });

  test.describe('easy cases', () => {
    test('basic DOM helper coverage', async ({ page }) => {
      const result = await page.evaluate(() => {
        const toolkit = (window as ToolkitWindow).domXPathToolkit as any;

        const byId = toolkit.getXPathById('email');
        const byIdNode = byId ? toolkit.getElementByXPath(byId) : null;

        const labelXPath = toolkit.getXPathByLabel('Password');
        const labelTarget = labelXPath ? toolkit.getElementByXPath(labelXPath) : null;

        const attrXPath = toolkit.getXPathByAttribute('data-kind', 'success');
        const attrHeading = attrXPath
          ? toolkit.getElementByXPath(attrXPath)?.querySelector('h3')?.textContent ?? null
          : null;

        const selectorXPath = toolkit.getXPathBySelector('.pill[data-tag="gamma"]');
        const selectorText = selectorXPath
          ? toolkit.getElementText(toolkit.getElementByXPath(selectorXPath))
          : null;

        const textXPath = toolkit.getXPathByText('Success Card');
        const tagXPaths = toolkit.getXPathByTag('button', { multiple: 'all' }) ?? [];
        const classXPaths = toolkit.getXPathByClass('pill', { multiple: 'all' }) ?? [];

        return {
          byIdResolved: byIdNode?.id ?? null,
          labelTargetId: labelTarget?.id ?? null,
          attrHeading,
          selectorText,
          textXPath,
          tagCount: Array.isArray(tagXPaths) ? tagXPaths.length : 0,
          pillCount: Array.isArray(classXPaths) ? classXPaths.length : 0,
        };
      });

      expect(result.byIdResolved).toBe('email');
      expect(result.labelTargetId).toBe('password');
      expect(result.attrHeading).toBe('Success Card');
      expect(result.selectorText).toBe('Gamma');
      expect(result.textXPath).toBeTruthy();
      expect(result.tagCount).toBeGreaterThan(1);
      expect(result.pillCount).toBeGreaterThanOrEqual(4);
    });
  });

  test.describe('medium cases', () => {
    test('generator + validation utilities', async ({ page }) => {
      const medium = await page.evaluate(() => {
        const toolkit = (window as ToolkitWindow).domXPathToolkit as any;
        const email = document.querySelector('#email');
        const password = document.querySelector('#password');
        const paragraph = document.querySelector('#content-block p');
        if (!email || !password || !paragraph) {
          throw new Error('Fixture missing expected nodes');
        }

        const emailXPath = toolkit.getXPathForNode(email);
        const passwordShortest = toolkit.getShortestUniqueXPath(password);
        const ancestorXPath = toolkit.findCommonAncestorXPath([email, password]);
        const resolvedEmailId = toolkit.resolveXPath(emailXPath)?.id ?? null;
        const normalizedEmail = toolkit.normalizeXPath(' //input[@id="email"] ');
        const isMatch = toolkit.isXPathMatch(email, normalizedEmail);

        const selection = window.getSelection();
        const textNode = paragraph.firstChild;
        if (selection && textNode) {
          selection.removeAllRanges();
          const range = document.createRange();
          range.setStart(textNode, 0);
          range.setEnd(textNode, Math.min(15, textNode.textContent?.length ?? 0));
          selection.addRange(range);
        }
        const selectionResult = toolkit.getXPathForSelection(selection);
        selection?.removeAllRanges();

        const syntaxValid = toolkit.isXPathSyntaxValid(emailXPath);
        const resolvesToElement = toolkit.doesXPathResolveToElement(emailXPath);

        const singleAttribute = toolkit.getAttributeValue('//section[@data-kind="warning"]/@data-kind');
        const pillTags = toolkit.getAttributeValues('//span[@class="pill"]/@data-tag');

        const allInputs = toolkit.select('//section[@id="forms"]//input');
        const firstInput = toolkit.selectOne('//section[@id="forms"]//input');

        return {
          emailXPath,
          passwordShortest,
          ancestorXPath,
          resolvedEmailId,
          normalizedEmail,
          isMatch,
          selectionText: selectionResult.text,
          selectionStart: selectionResult.startXPath,
          syntaxValid,
          resolvesToElement,
          singleAttribute,
          pillTags,
          inputCount: allInputs.length,
          firstInputTag: firstInput?.nodeName ?? null,
        };
      });

      expect(medium.emailXPath).toContain('email');
      expect(medium.passwordShortest).toContain('password');
      expect(medium.ancestorXPath).toContain('form');
      expect(medium.resolvedEmailId).toBe('email');
      expect(medium.normalizedEmail).toContain('input');
      expect(medium.isMatch).toBe(true);
      expect(medium.selectionText).not.toHaveLength(0);
      expect(medium.selectionStart).toBeTruthy();
      expect(medium.syntaxValid).toBe(true);
      expect(medium.resolvesToElement).toBe(true);
      expect(medium.singleAttribute).toBe('warning');
      expect(medium.pillTags).toEqual(expect.arrayContaining(['alpha', 'beta', 'gamma', 'delta']));
      expect(medium.inputCount).toBeGreaterThanOrEqual(4);
      expect(medium.firstInputTag).toBe('INPUT');
    });
  });

  test.describe('complex cases', () => {
    test('custom heuristics, conversions, and dynamic DOM', async ({ page }) => {
      await page.click('#add-node');
      await page.click('#add-node');

      const complex = await page.evaluate(() => {
        const toolkit = (window as ToolkitWindow).domXPathToolkit as any;

        const registry = toolkit.createHeuristicRegistry(toolkit.DEFAULT_HEURISTICS);
        const beforeCount = registry.list().length;
        const dataSeqPlugin = {
          name: 'data-seq-shortcut',
          provideSelector(context: any) {
            const seq = context.node.getAttribute('data-seq');
            if (seq && context.node.matches('#dynamic-list li')) {
              return `//li[@data-seq='${seq}']`;
            }
            return null;
          },
        };
        registry.register(dataSeqPlugin);

        const generator = toolkit.createXPathGenerator({ plugins: [dataSeqPlugin] });
        const newestItem = document.querySelector('#dynamic-list li:last-child');
        const pluginXPath = newestItem ? generator.getXPathForNode(newestItem) : null;
        const pluginResolved = pluginXPath ? generator.resolveXPath(pluginXPath) : null;

        const cssSelector = 'section.card[data-kind="warning"] > h3';
        const convertedXPath = toolkit.cssToXPath(cssSelector);
        const roundTripCss = toolkit.xpathToCss(convertedXPath);
        const headingTexts = toolkit.select(convertedXPath).map((node: Element) => node.textContent?.trim());
        const confirmLabel = toolkit.selectOne('//dialog[@id="sample-dialog"]//button[@value="confirm"]')?.textContent?.trim() ?? null;

        return {
          beforeCount,
          afterCount: registry.list().length,
          pluginXPath,
          pluginResolvedSeq: pluginResolved?.getAttribute('data-seq') ?? null,
          convertedXPath,
          roundTripCss,
          headingTexts,
          confirmLabel,
        };
      });

      expect(complex.beforeCount).toBeLessThan(complex.afterCount);
      expect(complex.pluginXPath).toMatch(/li/);
      expect(complex.pluginResolvedSeq).toBeTruthy();
      expect(complex.convertedXPath).toContain('section');
      expect(complex.roundTripCss).toContain('section.card');
      expect(complex.headingTexts.filter(Boolean)).toContain('Warning Card');
      expect(complex.confirmLabel).toBe('Confirm');
    });
  });
});
