"use client";

import {useState, useEffect, useCallback} from "react";
import {
  fetchUrls,
  createUrl,
  deleteUrl,
  toggleUrlActive,
  type ShortUrl,
} from "@/lib/urls";

export function useUrls() {
  const [urls, setUrls] = useState<ShortUrl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadUrls = useCallback(async (cursor?: string) => {
    try {
      const {urls: page, nextCursor: nc} = await fetchUrls(cursor);
      if (cursor === undefined) {
        setUrls(page);
      } else {
        setUrls((prev) => [...prev, ...page]);
      }
      setNextCursor(nc);
      setHasMore(nc !== null);
      setError(null);
    } catch (err: unknown) {
      const axiosErr = err as {response?: {data?: {error?: string}}};
      setError(axiosErr.response?.data?.error ?? "Failed to load URLs");
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initFetch = async () => {
      try {
        const result = await fetchUrls();
        if (!mounted) return;
        setUrls(result.urls);
        setNextCursor(result.nextCursor);
        setHasMore(result.nextCursor !== null);
      } catch (err: unknown) {
        if (!mounted) return;
        const axiosErr = err as {response?: {data?: {error?: string}}};
        setError(axiosErr.response?.data?.error ?? "Failed to load URLs");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void initFetch();

    return () => {
      mounted = false;
    };
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

  const handleCreate = useCallback(
    async (data: {
      originalUrl: string;
      customSlug?: string;
      expiresAt?: string;
      isPasswordProtected?: boolean;
      password?: string;
    }): Promise<ShortUrl> => {
      const created = await createUrl(data);
      setUrls((prev) => [created, ...prev]);
      return created;
    },
    [],
  );

  const handleDelete = useCallback(async (id: string): Promise<void> => {
    await deleteUrl(id);
    setUrls((prev) => prev.filter((url) => url.id !== id));
  }, []);

  const handleToggleActive = useCallback(
    async (id: string, isActive: boolean): Promise<void> => {
      const updated = await toggleUrlActive(id, isActive);
      setUrls((prev) => prev.map((url) => (url.id === id ? updated : url)));
    },
    [],
  );

  return {
    urls,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    nextCursor,
    handleCreate,
    handleDelete,
    handleToggleActive,
    reload,
    loadMore,
  };
}
