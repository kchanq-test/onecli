"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // After OAuth redirect, check if this was a CLI auth flow
    const cliCode = sessionStorage.getItem("cli_auth_code");
    if (cliCode) {
      sessionStorage.removeItem("cli_auth_code");
      router.replace(`/auth/cli?code=${encodeURIComponent(cliCode)}`);
      return;
    }

    if (isAuthenticated) {
      router.replace("/overview");
    } else {
      router.replace("/auth/login");
    }
  }, [isLoading, isAuthenticated, router]);

  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="text-muted-foreground">Loading...</div>
    </div>
  );
}
