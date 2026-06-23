export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * The base URL used for displaying short links in the UI.
 * Strips the http/https protocol for a cleaner look.
 * Example: 'localhost:4000' or 'lynx.sh'
 */
export const DISPLAY_URL = API_URL.replace(/^https?:\/\//, "") || "localhost:4000";
