import { IndexingStrategy, XPathOptions } from './types';

export interface NormalizedOptions {
  preferId: boolean;
  preferUniqueAttributes: string[];
  minIndex: IndexingStrategy;
  root?: Document | Element;
  namespaceResolver: XPathNSResolver | null;
}

const DEFAULT_UNIQUE_ATTRIBUTES = ['data-testid', 'data-test', 'aria-label', 'name', 'class'];

export const DEFAULT_OPTIONS: NormalizedOptions = {
  preferId: true,
  preferUniqueAttributes: DEFAULT_UNIQUE_ATTRIBUTES,
  minIndex: 'auto',
  namespaceResolver: null,
};

export function normalizeOptions(options?: XPathOptions): NormalizedOptions {
  return {
    preferId: options?.preferId ?? DEFAULT_OPTIONS.preferId,
    preferUniqueAttributes:
      options?.preferUniqueAttributes?.length
        ? [...options.preferUniqueAttributes]
        : [...DEFAULT_OPTIONS.preferUniqueAttributes],
    minIndex: options?.minIndex ?? DEFAULT_OPTIONS.minIndex,
    root: options?.root,
    namespaceResolver: options?.namespaceResolver ?? DEFAULT_OPTIONS.namespaceResolver,
  };
}
