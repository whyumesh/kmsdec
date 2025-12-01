"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  user: any;
}

export function useAdminAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    isAdmin: false,
    user: null,
  });

  useEffect(() => {
    if (status === "loading") {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      return;
    }

    if (status === "unauthenticated" || !session) {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        isAdmin: false,
        user: null,
      });
      router.push("/admin/login");
      return;
    }

    if (session.user) {
      const isAdmin = (session.user as any).role === "ADMIN";
      
      if (!isAdmin) {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          isAdmin: false,
          user: null,
        });
        router.push("/admin/login");
        return;
      }

      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        isAdmin: true,
        user: session.user,
      });
    }
  }, [session, status, router]);

  return authState;
}
