import { DEFAULT_HEURISTICS } from './default';
import type { XPathHeuristic, XPathHeuristicRegistry } from './types';

export { DEFAULT_HEURISTICS };
export type { XPathHeuristic, XPathHeuristicContext, XPathSegmentContext } from './types';

export function createHeuristicRegistry(initial: XPathHeuristic[] = DEFAULT_HEURISTICS): XPathHeuristicRegistry {
  const heuristics = [...initial];
  return {
    list(): XPathHeuristic[] {
      return [...heuristics];
    },
    register(...entries: XPathHeuristic[]): void {
      for (const entry of entries) {
        if (!heuristics.find((existing) => existing.name === entry.name)) {
          heuristics.push(entry);
        }
      }
    },
  };
}
