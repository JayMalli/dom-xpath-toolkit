export function normalizeXPath(xpath: string): string {
  if (!xpath || typeof xpath !== 'string') {
    return '';
  }

  const trimmed = xpath.trim();
  if (!trimmed) {
    return '';
  }

  const withoutTrailing = trimmed.replace(/\/+$/g, '');
  return withoutTrailing.replace(/\/{3,}/g, '//');
}
