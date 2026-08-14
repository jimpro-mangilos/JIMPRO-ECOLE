/**
 * Dérive les initiales d'un nom d'école.
 * Exemples :
 *   "C.S_GOLDEN_ACADEMY" → "GA"
 *   "C.S_EDEN_SKY"       → "ES"
 *   "Institut National"  → "IN"
 */
export function getSchoolInitials(name: string | null | undefined): string {
  if (!name) return 'JP';
  const words = name
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 'JP';

  // Ignorer les mots mono-caractère ("C", "S" du préfixe « Complexe Scolaire »)
  const significant = words.filter((w) => w.length > 1);
  const source = significant.length >= 2 ? significant : words;
  const initials = source.map((w) => w[0].toUpperCase()).join('');

  return initials.slice(0, 3) || 'JP';
}
