// Login state. The token is kept in the phone's secure storage (Keystore / Keychain).
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as backend from "@/api/backend";
import type { Surveyor } from "./types";

const KEY = "moversly-surveyor-auth";

const storage = {
  get: async () => (Platform.OS === "web" ? globalThis.localStorage?.getItem(KEY) ?? null : SecureStore.getItemAsync(KEY)),
  set: async (v: string) => (Platform.OS === "web" ? globalThis.localStorage?.setItem(KEY, v) : SecureStore.setItemAsync(KEY, v)),
  clear: async () => (Platform.OS === "web" ? globalThis.localStorage?.removeItem(KEY) : SecureStore.deleteItemAsync(KEY)),
};

interface Auth {
  loading: boolean;
  user: Surveyor | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<Surveyor | null>(null);

  const signOut = useCallback(async () => {
    backend.setToken(null);
    setUser(null);
    await storage.clear().catch(() => {});
  }, []);

  useEffect(() => {
    backend.setOnUnauthorized(() => void signOut());
    storage
      .get()
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as { token: string; user: Surveyor };
        backend.setToken(saved.token);
        setUser(saved.user);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => backend.setOnUnauthorized(null);
  }, [signOut]);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await backend.login(email.trim(), password);
    backend.setToken(res.token);
    await storage.set(JSON.stringify(res)).catch(() => {});
    setUser(res.user);
  }, []);

  const value = useMemo(() => ({ loading, user, signIn, signOut }), [loading, user, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
