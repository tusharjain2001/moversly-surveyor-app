import { useCallback, useEffect, useRef, useState } from "react";

interface AsyncState<T> {
  data?: T;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
}

/** Load data when the screen opens, with loading / error / reload (pull to refresh). */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<AsyncState<T>>({ error: null, loading: true, refreshing: false });
  const [nonce, setNonce] = useState(0);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let alive = true;
    loadRef.current().then(
      (data) => alive && setState({ data, error: null, loading: false, refreshing: false }),
      (e: any) => alive && setState((s) => ({ ...s, error: e?.message || "Something went wrong.", loading: false, refreshing: false })),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, ...deps]);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, refreshing: true }));
    setNonce((n) => n + 1);
  }, []);

  return { ...state, reload };
}
