// What the screens say about images (feature 004). The numbers come from the API's answer (GET /trades/{id}/images), which
// is the one place the limits live; these are only the words and a fallback for a trade that is not saved yet.
import type { ImageLimits } from "./types";

export const DEFAULT_LIMITS: ImageLimits = { maxBytes: 5 * 1024 * 1024, maxCount: 10, maxNoteChars: 200 };

export const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

/** "7.4 MB" (binary megabytes, one decimal), the way the API words its own refusals. */
export const megabytes = (n: number) => `${(n / (1024 * 1024)).toFixed(1)} MB`;

export const msgNotAllowed = "Only PNG, JPEG and WebP images are allowed.";
export const msgTooBig = (size: number, limit: number) => `That image is ${megabytes(size)}. The limit is ${Math.round(limit / (1024 * 1024))} MB.`;
export const msgLimit = (count: number) => `This trade already has ${count} images. Remove one to add another.`;
export const msgNotAdded = (n: number) => (n === 1 ? "1 image was not added. Add it again here." : `${n} images were not added. Add them again here.`);
