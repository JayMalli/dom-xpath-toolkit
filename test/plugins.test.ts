import { describe, expect, it } from 'vitest';

import {
  createXPathGenerator,
  createHeuristicRegistry,
  DEFAULT_HEURISTICS,
} from '../src/xpath';
import type { XPathHeuristic } from '../src/plugins';

describe('XPath heuristics', () => {
  it('allows plugins to override selector generation', () => {
    document.body.innerHTML = `<div><p data-custom="hero">Hello</p></div>`;
    const node = document.querySelector('p') as Element;

    const customHeuristic: XPathHeuristic = {
      name: 'test:custom-selector',
      provideSelector({ node: current }) {
        if (current.hasAttribute('data-custom')) {
          return `//p[@data-custom='${current.getAttribute('data-custom')}']`;
        }
        return null;
      },
    };

    const generator = createXPathGenerator({ plugins: [customHeuristic] });
    const xpath = generator.getXPathForNode(node);
    expect(xpath).toBe("//p[@data-custom='hero']");
  });

  it('does not mutate the default heuristic registry', () => {
    const registry = createHeuristicRegistry();
    expect(registry.list().map((item) => item.name)).toEqual(
      DEFAULT_HEURISTICS.map((item) => item.name)
    );

    registry.register({ name: 'noop', provideSelector: () => null });

    const secondRegistry = createHeuristicRegistry();
    expect(secondRegistry.list().map((item) => item.name)).toEqual(
      DEFAULT_HEURISTICS.map((item) => item.name)
    );
  });
});
