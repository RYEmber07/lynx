import {customAlphabet} from "nanoid";

// Base62 alphabet (A-Z, a-z, 0-9), completely URL safe
const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export const DEFAULT_CODE_LENGTH = 6;

export function generateShortCode(
  length: number = DEFAULT_CODE_LENGTH,
): string {
  const nanoid = customAlphabet(ALPHABET, length);
  return nanoid();
}
