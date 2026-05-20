export function parseStringListSetting(value: unknown): string[] {
  return parseStringListSettingValue(value, 0);
}

function parseStringListSettingValue(value: unknown, depth: number): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return [];
    }

    if (depth < 2 && looksLikeJsonContainer(trimmed)) {
      try {
        return parseStringListSettingValue(JSON.parse(trimmed), depth + 1);
      } catch {
        // Fall through to comma-splitting for plain strings that only resemble JSON.
      }
    }

    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return [];
}

function looksLikeJsonContainer(value: string): boolean {
  return (value.startsWith('[') && value.endsWith(']'))
    || (value.startsWith('"') && value.endsWith('"'));
}
