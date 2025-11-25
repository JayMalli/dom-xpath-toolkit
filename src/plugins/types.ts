import type { NormalizedOptions } from '../options';

export interface XPathHeuristicContext {
  node: Element;
  doc: Document;
  root: Element;
  options: NormalizedOptions;
  ancestors: Element[];
}

export interface XPathSegmentContext {
  node: Element;
  segment: string;
  indexStrategy: NormalizedOptions['minIndex'];
}

export interface XPathHeuristicResult {
  selector?: string | null;
  segment?: string | null;
}

export interface XPathHeuristic {
  name: string;
  beforeSegment?(context: XPathHeuristicContext): void;
  provideSelector?(context: XPathHeuristicContext): string | null;
  shouldUseAttribute?(
    context: XPathHeuristicContext,
    attribute: string,
    value: string
  ): boolean | null;
  decorateSegment?(context: XPathSegmentContext): string | null;
  afterGenerate?(context: XPathHeuristicContext, xpath: string): string | null;
}

export interface XPathHeuristicRegistry {
  list(): XPathHeuristic[];
  register(...heuristics: XPathHeuristic[]): void;
}
