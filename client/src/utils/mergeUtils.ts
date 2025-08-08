export function get(obj: any, path: string) {
  return path.split(".").reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
}
export function setPath(obj: any, path: string, val: any) {
  const parts = path.split(".");
  const last = parts.pop()!;
  const target = parts.reduce((acc, k) => (acc[k] = acc[k] || {}), obj);
  target[last] = val;
}
export function jsonEq(a: any, b: any) {
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return a === b; }
}
export function ensureArray<T = any>(v: any): T[] { return Array.isArray(v) ? v : []; }
export function toIssueLabel(v: any) {
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "string") return v;
  return "";
}
export function formatPhones(phs?: Array<{ number: string; label?: string; priority?: number }>) {
  if (!Array.isArray(phs)) return "";
  return phs.map(p => `${p.number}${p.label ? ` (${p.label})` : ""}${typeof p.priority === "number" ? ` · p${p.priority}` : ""}`).join(", ");
}
export function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}
