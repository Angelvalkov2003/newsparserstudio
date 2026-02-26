/**
 * Parse inline style string to React style object.
 * e.g. "color: red; font-size: 14px" -> { color: "red", fontSize: "14px" }
 */
export function parseInlineStyle(str: string | undefined): Record<string, string> {
  if (!str || !str.trim()) return {};
  const result: Record<string, string> = {};
  str.split(";").forEach((part) => {
    const colon = part.indexOf(":");
    if (colon === -1) return;
    const key = part.slice(0, colon).trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const value = part.slice(colon + 1).trim();
    if (key && value) result[key] = value;
  });
  return result;
}
