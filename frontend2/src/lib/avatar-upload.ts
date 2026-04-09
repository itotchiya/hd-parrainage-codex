const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ACCEPTED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const OUTPUT_SIZE = 512;
const OUTPUT_TYPE = 'image/webp';
const OUTPUT_QUALITY = 0.82;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('L image selectionnee est invalide.'));
    };

    image.src = objectUrl;
  });
}

export function validateAvatarFile(file: File) {
  if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
    throw new Error('Utilisez une image JPG, PNG ou WebP.');
  }

  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error('L image doit faire moins de 5 Mo.');
  }
}

export async function compressAvatarFile(file: File) {
  validateAvatarFile(file);

  const image = await loadImage(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (context === null) {
    throw new Error('La compression locale est indisponible dans ce navigateur.');
  }

  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = (image.naturalWidth - cropSize) / 2;
  const sourceY = (image.naturalHeight - cropSize) / 2;

  context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, OUTPUT_TYPE, OUTPUT_QUALITY);
  });

  if (blob === null) {
    throw new Error('La compression de l image a echoue.');
  }

  const fileName = file.name.replace(/\.[^.]+$/, '') || 'avatar';

  return new File([blob], `${fileName}.webp`, {
    type: OUTPUT_TYPE,
    lastModified: Date.now(),
  });
}
