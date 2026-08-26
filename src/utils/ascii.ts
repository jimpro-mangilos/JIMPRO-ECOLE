/**
 * Helpers pour la compatibilité avec les lecteurs de codes-barres 2D physiques.
 * Les scanners agissent comme un clavier : ils tapent le contenu du QR + Entrée.
 * Pour éviter les problèmes d'encodage (accents, préfixes/suffixes), on :
 *  · encode les QR en ASCII pur (asciiFold)
 *  · tolère le parsing du scan (parseScannedMatricule)
 */

/** Supprime les accents et ne garde que les caractères sûrs (ASCII). */
export function asciiFold(input: string | null | undefined): string {
  return (input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/œ/g, 'oe').replace(/Œ/g, 'OE')
    .replace(/æ/g, 'ae').replace(/Æ/g, 'AE')
    .replace(/[^A-Za-z0-9 \-_.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrait un matricule à partir d'un scan, de façon tolérante :
 *  · accepte le QR complet (« MATRICULE:XXX|NOM:... ») ou un matricule seul ;
 *  · ignore préfixes/suffixes du lecteur ;
 *  · met en majuscules et ne garde que lettres/chiffres/tirets.
 */
export function parseScannedMatricule(raw: string | null | undefined): string {
  if (!raw) return '';
  let s = String(raw).trim();
  const m = s.match(/MATRICULE:\s*([^|\r\n]+)/i);
  if (m) s = m[1];
  return s.toUpperCase().replace(/[^A-Z0-9\-]/g, '');
}
