"use client";

import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";

export interface ApiState<T> {
  data: T | undefined;
  error: Error | undefined;
  /** True while a request is in flight (previous `data` is kept to avoid flicker). */
  loading: boolean;
  reload: () => void;
}

/**
 * Run an api-client call when `deps` change; ignores stale responses.
 *   const { data, loading, error } = useApi(() => getForecast({ source, ...win }), [source, win.from]);
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: DependencyList): ApiState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetcherRef
      .current()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError(undefined);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, loading, reload };
}
