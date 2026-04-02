export const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

export function getRadianAngle(degreeValue: number) {
    return (degreeValue * Math.PI) / 180;
}

export default async function getCroppedImg(
    imageSrc: string,
    pixelCrop: { x: number; y: number; width: number; height: number },
    rotation = 0
): Promise<Blob | null> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return null;
    }

    // Set canvas dimensions to the target size (e.g., maximum 500x500 for avatars to save space)
    const TARGET_SIZE = 500;
    canvas.width = TARGET_SIZE;
    canvas.height = TARGET_SIZE;

    // Draw the cropped image onto the canvas and scale it to the TARGET_SIZE
    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        TARGET_SIZE,
        TARGET_SIZE
    );

    // Compress the image when converting to a blob. 0.8 is standard good quality / small size.
    return new Promise((resolve) => {
        canvas.toBlob(
            (blob) => {
                resolve(blob);
            },
            'image/jpeg',
            0.8
        );
    });
}
