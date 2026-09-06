/**
 * Export PDF : téléchargement direct OU « Aperçu » dans un nouvel onglet via une
 * URL blob (origine http/https → le lecteur PDF de Chrome affiche correctement,
 * contrairement aux fichiers ouverts en file:// qui donnent des pages blanches).
 */
import type { jsPDF } from 'jspdf';

export type PdfMode = 'download' | 'apercu';

let _mode: PdfMode = 'download';

export function setPdfMode(m: PdfMode) { _mode = m; }
export function getPdfMode(): PdfMode { return _mode; }

/** Sauvegarde le PDF, ou l'ouvre en aperçu (nouvel onglet) selon le mode courant. */
export function exporterPdf(doc: jsPDF, nom: string): void {
  if (_mode === 'apercu') {
    const url = URL.createObjectURL(doc.output('blob'));
    const w = window.open(url, '_blank');
    if (!w) {
      // Popup bloquée → repli : téléchargement
      const a = document.createElement('a');
      a.href = url;
      a.download = nom;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    // Libère l'objet blob après affichage (le navigateur garde la page ouverte)
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  } else {
    doc.save(nom);
  }
}

/** Exécute fn en mode APERÇU puis restaure le mode précédent (boutons « Aperçu »). */
export async function enApercu<T>(fn: () => T | Promise<T>): Promise<T> {
  const prev = _mode;
  _mode = 'apercu';
  try {
    return await fn();
  } finally {
    _mode = prev;
  }
}
