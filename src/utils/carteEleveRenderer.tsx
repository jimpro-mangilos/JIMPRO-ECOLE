import { renderToString } from 'react-dom/server';
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

  try {
    // Rendu STATIQUE (react-dom/server) : AUCUN second root React sur le DOM —
    // évite la corruption "Failed to execute 'removeChild'" du root principal.
    const photoOk = await imageLoads(eleve.photo_url);
    const logoOk = await imageLoads(logoUrl);
    container.innerHTML = renderToString(
      <CarteEleveCard
        eleve={photoOk ? eleve : { ...eleve, photo_url: null }}
        schoolName={schoolName}
        logoUrl={logoOk ? logoUrl : null}
        qrDataUrl={qrDataUrl}
      />
    );

    // Attendre le chargement des images avant la capture
    await waitForImages(container);
    // Laisser les images se stabiliser avant la capture
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
    container.remove();
  }
}

/** Vérifie qu'une image se charge (sinon le composant affiche le fallback initiales). */
function imageLoads(url: string | null | undefined): Promise<boolean> {
  if (!url) return Promise.resolve(false);
  return new Promise<boolean>((resolve) => {
    const img = new Image();
    let done = false;
    const finish = (ok: boolean) => { if (!done) { done = true; clearTimeout(timer); resolve(ok); } };
    const timer = setTimeout(() => finish(img.complete && img.naturalWidth > 0), 3000);
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.src = url;
  });
}
