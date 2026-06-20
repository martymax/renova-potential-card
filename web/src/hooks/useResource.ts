import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

/** Načte GET zdroj s loading/error/refetch. Ignoruje opožděné odpovědi (race). */
export function useResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  const refetch = useCallback(() => {
    const id = ++reqId.current;
    if (!path) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get<T>(path)
      .then((d) => {
        if (id !== reqId.current) return; // přišla starší odpověď → zahoď
        setData(d);
        setError(null);
      })
      .catch((e) => {
        if (id !== reqId.current) return;
        setError(e instanceof Error ? e.message : "Načtení se nezdařilo.");
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
  }, [path]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch, setData };
}
