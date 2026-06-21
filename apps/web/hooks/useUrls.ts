"use client";

import {useState, useEffect, useCallback} from "react";
import {fetchUrls, deleteUrl, toggleUrlActive, type ShortUrl} from "@/lib/urls";

function parseAxiosError(err: unknown): string {
  const e = err as {response?: {status?: number; data?: {error?: string}}};
  if (e.response?.status === 429) return "Too many requests. Please slow down.";
  return e.response?.data?.error ?? "Failed to load URLs";
}

export function useUrls() {
  const [urls, setUrls] = useState<ShortUrl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const loadUrls = useCallback(async (cursor?: string) => {
    try {
      const {urls: page, nextCursor: nc} = await fetchUrls(cursor);
      setUrls((prev) => cursor === undefined ? page : [...prev, ...page]);
      setNextCursor(nc);
      setHasMore(nc !== null);
      setError(null);
    } catch (err) {
      setError(parseAxiosError(err));
      setHasMore(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const result = await fetchUrls();
        if (!mounted) return;
        setUrls(result.urls);
        setNextCursor(result.nextCursor);
        setHasMore(result.nextCursor !== null);
      } catch (err) {
        if (!mounted) return;
        setError(parseAxiosError(err));
        setHasMore(false);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  const reload = useCallback(async () => {
    setIsLoading(true);
    await loadUrls();
    setIsLoading(false);
  }, [loadUrls]);

  const loadMore = useCallback(async () => {
    if (!hasMore || nextCursor === null) return;
    setIsLoadingMore(true);
    await loadUrls(nextCursor);
    setIsLoadingMore(false);
  }, [hasMore, nextCursor, loadUrls]);

  // ---------------------------------------------------------------------------
  // State mutations
  // ---------------------------------------------------------------------------

  /** 
   * Prepend a freshly created URL to the list. 
   * Note: The actual API request (createUrl) is handled by UrlModal.
   */
  const addUrl = useCallback((url: ShortUrl) => {
    setUrls((prev) => [url, ...prev]);
  }, []);

  /** 
   * Replace an updated URL in the list.
   * Note: The actual API request (updateUrl) is handled by UrlModal.
   */
  const replaceUrl = useCallback((url: ShortUrl) => {
    setUrls((prev) => prev.map((u) => (u.id === url.id ? url : u)));
  }, []);

  /** Delete a URL via API then remove it from the list. */
  const handleDelete = useCallback(async (id: string) => {
    await deleteUrl(id);
    setUrls((prev) => prev.filter((u) => u.id !== id));
  }, []);

  /** Toggle active state via API then update the list. */
  const handleToggleActive = useCallback(async (id: string, isActive: boolean) => {
    const updated = await toggleUrlActive(id, isActive);
    setUrls((prev) => prev.map((u) => (u.id === id ? updated : u)));
  }, []);

  return {
    urls,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    addUrl,
    replaceUrl,
    handleDelete,
    handleToggleActive,
    reload,
    loadMore,
  };
}
