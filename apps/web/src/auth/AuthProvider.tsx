import type { AuthUser, LoginResponse } from "@sialokasi/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { api } from "../lib/api";
import { beginLogout, endLogout } from "./logout-state";

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  applyLogin: (response: LoginResponse) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_QUERY_KEY = ["auth", "me"] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const me = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: api.me,
    staleTime: 30_000,
    retry: false,
  });

  const applyLogin = useCallback(
    (response: LoginResponse) => {
      endLogout();
      queryClient.setQueryData(["auth", "me"], { user: response.user });
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    beginLogout();
    try {
      await api.logout();
      queryClient.setQueryData(["auth", "me"], { user: null });
      queryClient.removeQueries({ queryKey: ["admin"] });
      queryClient.removeQueries({ queryKey: ["petugas"] });
      queryClient.removeQueries({ queryKey: ["pimpinan"] });
      queryClient.removeQueries({ queryKey: ["stock"] });
    } catch (error) {
      endLogout();
      throw error;
    }
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: me.data?.user ?? null,
      isLoading: me.isPending,
      isError: me.isError,
      refetch: () => void me.refetch(),
      applyLogin,
      logout,
    }),
    [me.data?.user, me.isPending, me.isError, me.refetch, applyLogin, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("AuthProvider belum dipasang di halaman ini.");
  }
  return context;
}
