/**
 * Utility to compress image files or base64 data URLs in the browser.
 * Ensures images uploaded by users (from smartphone cameras or PC files)
 * are resized and compressed to lightweight data (~30KB-90KB) so they sync
 * instantly to Firebase Realtime Database without exceeding quotas or payload limits.
 */
export async function compressImage(
  fileOrDataUrl: File | Blob | string,
  maxWidth = 1200,
  maxHeight = 800,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If it's a web URL (http / https), keep as is
    if (typeof fileOrDataUrl === 'string' && (fileOrDataUrl.startsWith('http://') || fileOrDataUrl.startsWith('https://'))) {
      return resolve(fileOrDataUrl);
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let { width, height } = img;

      // Scale down if larger than maximum bounds
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        if (typeof fileOrDataUrl === 'string') return resolve(fileOrDataUrl);
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(fileOrDataUrl);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Prefer WebP for high compression, fallback to JPEG
      try {
        const webp = canvas.toDataURL('image/webp', quality);
        if (webp && webp.startsWith('data:image/webp')) {
          return resolve(webp);
        }
      } catch {}

      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.onerror = () => {
      if (typeof fileOrDataUrl === 'string') resolve(fileOrDataUrl);
      else reject(new Error('Failed to load image for compression'));
    };

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}
