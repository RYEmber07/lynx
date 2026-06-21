import api from "./api";

export interface ShortUrl {
  id: string;
  shortCode: string;
  originalUrl: string;
  customSlug: string | null;
  expiresAt: string | null;
  isPasswordProtected: boolean;
  isActive: boolean;
  createdAt: string;
}

/**
 * Fetches a page of URLs belonging to the authenticated user.
 * @param cursor - ID of the last seen item for pagination.
 * @param limit  - Number of records to fetch (default 10).
 * @returns Paginated result with urls array and nextCursor.
 */
export async function fetchUrls(
  cursor?: string,
  limit = 10,
): Promise<{urls: ShortUrl[]; nextCursor: string | null}> {
  const response = await api.get<{urls: ShortUrl[]; nextCursor: string | null}>(
    "/api/urls",
    {params: {limit, ...(cursor !== undefined && {cursor})}},
  );
  return response.data;
}

/**
 * Fetches a specific URL by ID.
 * @param id - The URL record ID.
 * @returns The requested ShortUrl.
 */
export async function getUrlById(id: string): Promise<ShortUrl> {
  const response = await api.get<ShortUrl>(`/api/urls/${id}`);
  return response.data;
}

/**
 * Creates a new shortened URL.
 * @param data - URL creation payload.
 * @returns The newly created ShortUrl.
 */
export async function createUrl(data: {
  originalUrl: string;
  customSlug?: string;
  expiresAt?: string;
  isPasswordProtected?: boolean;
  password?: string;
}): Promise<ShortUrl> {
  const response = await api.post<ShortUrl>("/api/urls", data);
  return response.data;
}

/**
 * Deletes a shortened URL by ID.
 * @param id - The URL record ID to delete.
 */
export async function deleteUrl(id: string): Promise<void> {
  await api.delete(`/api/urls/${id}`);
}

/**
 * Toggles the active state of a shortened URL.
 * @param id - The URL record ID.
 * @param isActive - The new active state.
 * @returns The updated ShortUrl.
 */
export async function toggleUrlActive(
  id: string,
  isActive: boolean,
): Promise<ShortUrl> {
  const response = await api.patch<ShortUrl>(`/api/urls/${id}`, { isActive });
  return response.data;
}

/**
 * Updates mutable fields of a shortened URL.
 * @param id   - The URL record ID.
 * @param data - Partial update payload (any combination of fields).
 * @returns The updated ShortUrl.
 */
export async function updateUrl(
  id: string,
  data: {
    originalUrl?: string;
    customSlug?: string | null;
    expiresAt?: string | null;
    isActive?: boolean;
    isPasswordProtected?: boolean;
    password?: string;
  },
): Promise<ShortUrl> {
  const response = await api.patch<ShortUrl>(`/api/urls/${id}`, data);
  return response.data;
}


/**
 * Copies the full short URL to the clipboard.
 * @param shortCode - The short code or custom slug.
 */
export async function copyToClipboard(shortCode: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error("API URL is not configured.");
  }
  if (!navigator.clipboard) {
    throw new Error("Clipboard not available in this browser context.");
  }
  await navigator.clipboard.writeText(`${baseUrl}/${shortCode}`);
}
