// src/lib/safeUrl.ts
// Défense en profondeur : n'affiche un lien que s'il est en https://
// (bloque javascript:, data:, http:). La base impose déjà la même règle.
export function safeHttpsUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}
