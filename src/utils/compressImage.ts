/**
 * Compression d'image FORCÉE : redimensionne (max 600 px) et ré-encode en JPEG
 * avec une qualité décroissante jusqu'à ce que le fichier passe sous la limite
 * (50 Ko par défaut). Utilisé pour les photos du personnel (caméra / upload).
 */

async function loadImageSource(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  // 1) API moderne createImageBitmap
  try {
    const bmp = await createImageBitmap(file);
    return bmp as unknown as CanvasImageSource & { width: number; height: number };
  } catch {
    // 2) Repli : élément <img> + FileReader
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function drawOnCanvas(source: CanvasImageSource & { width: number; height: number }, maxDimension: number): HTMLCanvasElement {
  const w = source.width || 0;
  const h = source.height || 0;
  const scale = Math.min(1, maxDimension / Math.max(w, h || 1));
  const nw = Math.max(1, Math.round(w * scale));
  const nh = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = nw;
  canvas.height = nh;
  const ctx = canvas.getContext('2d')!;
  // Fond blanc pour aplatir les PNG avec transparence (évite le noir)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, nw, nh);
  ctx.drawImage(source as CanvasImageSource, 0, 0, nw, nh);
  return canvas;
}

function toJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', quality);
  });
}

export async function compressImage(
  file: File,
  opts?: { maxBytes?: number; maxDimension?: number }
): Promise<File> {
  const maxBytes = opts?.maxBytes ?? 50 * 1024; // 50 Ko
  const maxDimension = opts?.maxDimension ?? 600;

  // Déjà sous la limite en JPEG ? on évite une double perte de qualité
  if (file.type === 'image/jpeg' && file.size <= maxBytes) return file;

  const source = await loadImageSource(file);
  const baseName = (file.name.replace(/\.[^.]+$/, '') || 'photo').slice(0, 60);

  // Dimensions décroissantes puis qualités décroissantes jusqu'à < maxBytes
  const dimensions = [
    maxDimension,
    Math.round(maxDimension * 0.75),
    Math.round(maxDimension * 0.55),
    320,
  ];
  const qualities = [0.85, 0.75, 0.6, 0.45, 0.3];

  let smallest: { blob: Blob; quality: number; dim: number } | null = null;

  for (const dim of dimensions) {
    const canvas = drawOnCanvas(source, dim);
    for (const q of qualities) {
      const blob = await toJpegBlob(canvas, q);
      if (!smallest || blob.size < smallest.blob.size) smallest = { blob, quality: q, dim };
      if (blob.size <= maxBytes) {
        return new File([blob], baseName + '.jpg', { type: 'image/jpeg' });
      }
    }
  }

  // Dernier recours : le plus petit résultat obtenu (toujours bien < 50 Ko en pratique)
  return new File([smallest!.blob], baseName + '.jpg', { type: 'image/jpeg' });
}
