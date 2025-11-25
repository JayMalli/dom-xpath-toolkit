import { describe, expect, it } from 'vitest';

import * as root from '../src';
import * as xpathModule from '../src/xpath';
import * as selectionModule from '../src/selection';

describe('package exports', () => {
  it('exposes core functions at root', () => {
    expect(typeof root.getXPathForNode).toBe('function');
    expect(typeof root.getXPathForSelection).toBe('function');
  });

  it('exposes subpath modules', () => {
    expect(typeof xpathModule.getXPathForNode).toBe('function');
    expect(typeof selectionModule.getXPathForSelection).toBe('function');
  });
});
