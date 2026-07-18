import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

/**
 * Core authentication hook — single source of truth.
 *
 * Module-level singleton state: even if AuthProvider unmounts and remounts
 * (e.g. router restructure, hot reload), we keep the user/session/role in
 * module memory so the UI never flashes "Checking authentication…" after
 * the initial login.
 */

type Snapshot = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  session: Session | null;
  authError: string | null;
  userRole: string | null;
};

let SNAPSHOT: Snapshot = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  session: null,
  authError: null,
  userRole: null,
};

const listeners = new Set<(s: Snapshot) => void>();
let bootstrapped = false;
let supabaseSub: { unsubscribe: () => void } | null = null;

function emit(patch: Partial<Snapshot>) {
  SNAPSHOT = { ...SNAPSHOT, ...patch };
  listeners.forEach((l) => l(SNAPSHOT));
}

async function fetchRole(userId: string): Promise<string | null> {
  try {
    const { data: isAdmin, error: adminErr } = await supabase.rpc("is_admin");
    if (!adminErr && isAdmin) return "admin";

    const { data, error } = await supabase.rpc("get_current_user_role");
    if (!error && data) return data as string;

    const { data: rows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (rows?.some((r) => r.role === "admin")) return "admin";
    return rows?.[0]?.role ?? null;
  } catch (err) {
    console.error("useAuthCore: role lookup failed", err);
    return null;
  }
}

function applySession(newSession: Session | null) {
  if (newSession?.user) {
    emit({
      session: newSession,
      user: newSession.user,
      isAuthenticated: true,
      isLoading: false,
      authError: null,
    });
    // Only refetch role if we don't already have it (avoids flicker)
    if (!SNAPSHOT.userRole) {
      setTimeout(async () => {
        const role = await fetchRole(newSession.user.id);
        emit({ userRole: role });
      }, 0);
    }
  } else {
    emit({
      session: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      userRole: null,
      authError: null,
    });
  }
}

function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    applySession(session ?? null);
  });
  supabaseSub = data.subscription;

  supabase.auth
    .getSession()
    .then(({ data: { session }, error }) => {
      if (error) {
        emit({ isLoading: false, authError: error.message });
        return;
      }
      applySession(session ?? null);
    })
    .catch((err) => {
      emit({
        isLoading: false,
        authError: err instanceof Error ? err.message : "Authentication error",
      });
    });
}

export const useAuthCore = () => {
  bootstrap();
  const [snap, setSnap] = useState<Snapshot>(SNAPSHOT);

  useEffect(() => {
    listeners.add(setSnap);
    // sync immediately in case state changed between render and effect
    setSnap(SNAPSHOT);
    return () => {
      listeners.delete(setSnap);
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      emit({ isLoading: true });
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      emit({
        session: null,
        user: null,
        isAuthenticated: false,
        userRole: null,
        authError: null,
        isLoading: false,
      });
    } catch (error) {
      emit({
        isLoading: false,
        authError: error instanceof Error ? error.message : "Sign-out failed",
      });
    }
  }, []);

  const clearError = useCallback(() => emit({ authError: null }), []);

  return { ...snap, logout, clearError };
};
