/**
 * Compresse une image via canvas pour obtenir un fichier < 80 KB.
 * Redimensionne à max 400px de large et ajuste la qualité JPEG.
 */
export async function compressPhoto(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const MAX_WIDTH = 400;
      const MAX_SIZE = 80 * 1024; // 80 KB

      let width = img.width;
      let height = img.height;

      // Redimensionner si trop large
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      // Essayer différentes qualités pour rester sous 80 KB
      const tryQuality = (q: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Compression échouée')); return; }
            if (blob.size <= MAX_SIZE || q <= 0.2) {
              resolve(blob);
            } else {
              tryQuality(q - 0.1);
            }
          },
          'image/jpeg',
          q
        );
      };

      tryQuality(0.8);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Impossible de charger l\'image'));
    };

    img.src = url;
  });
}
