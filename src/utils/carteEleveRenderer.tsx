import { createRoot, type Root } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { CarteEleveCard, type CarteEleve } from '../components/CarteEleveCard';

/**
 * Attend que toutes les images d'un conteneur soient chargées (ou en erreur).
 * Nécessaire pour que html2canvas capture les photos/logos/QR correctement.
 */
function waitForImages(container: HTMLElement): Promise<void> {
  const imgs = Array.from(container.querySelectorAll('img'));
  if (imgs.length === 0) return Promise.resolve();
  return Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
          // Garde-fou : ne jamais bloquer plus de 3s par image
          setTimeout(resolve, 3000);
        })
    )
  ).then(() => undefined);
}

/**
 * Rend la carte hors-écran puis la capture en canvas via html2canvas.
 * C'est la source unique de vérité : le PNG et le PDF sont identiques.
 */
export async function renderCarteEleveToCanvas(
  eleve: CarteEleve,
  schoolName: string,
  logoUrl: string | null,
  qrDataUrl: string,
  scale = 3
): Promise<HTMLCanvasElement> {
  // Conteneur hors-écran
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.zIndex = '-1';
  document.body.appendChild(container);

  let root: Root | null = null;
  try {
    root = createRoot(container);
    root.render(
      <CarteEleveCard eleve={eleve} schoolName={schoolName} logoUrl={logoUrl} qrDataUrl={qrDataUrl} />
    );

    // Attendre le premier rendu React (microtask) puis les images
    await new Promise((r) => setTimeout(r, 0));
    await waitForImages(container);
    // Laisser React flusher les fallbacks (logo/photo en erreur) avant la capture
    await new Promise((r) => setTimeout(r, 60));

    const cardEl = container.firstElementChild as HTMLElement;
    if (!cardEl) throw new Error('Carte non rendue');

    const canvas = await html2canvas(cardEl, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#fcfbf8',
    });
    return canvas;
  } finally {
    if (root) {
      // Unmount propre (async, mais on ne peut pas await ici sans changer la signature)
      root.unmount();
    }
    container.remove();
  }
}
