"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@onecli/ui/components/button";
import { useAuth } from "@/providers/auth-provider";
import { confirmCliSession } from "@/lib/actions/auth";
import { CheckCircle2, XCircle, Copy, Check, ArrowRight } from "lucide-react";
import { CopyCommand } from "@/app/_components/copy-command";

type Status =
  | "loading"
  | "confirming"
  | "success"
  | "expired"
  | "not_found"
  | "error"
  | "sign_in";

export default function CliAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background flex min-h-svh flex-col items-center justify-center px-6 pb-24">
          <Link href="/overview" className="mb-8">
            <Image
              src="/onecli-full-logo.png"
              alt="onecli"
              width={140}
              height={40}
              priority
              className="dark:hidden"
            />
            <Image
              src="/onecli-full-logo-dark.png"
              alt="onecli"
              width={140}
              height={40}
              priority
              className="hidden dark:block"
            />
          </Link>
          <div className="flex flex-col items-center gap-4 py-20">
            <div className="text-brand h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <p className="text-muted-foreground text-sm">Loading...</p>
          </div>
        </div>
      }
    >
      <CliAuthContent />
    </Suspense>
  );
}

function CliAuthContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const { isAuthenticated, isLoading, user, signIn } = useAuth();
  const [status, setStatus] = useState<Status>("loading");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const confirming = useRef(false);

  useEffect(() => {
    if (isLoading || !code) return;

    if (isAuthenticated && user) {
      // Guard against React strict mode double-invocation
      if (confirming.current) return;
      confirming.current = true;

      setStatus("confirming");
      confirmCliSession({
        code,
        authId: user.id,
        email: user.email,
        name: user.name,
      })
        .then((result) => {
          if (result.status === "ok") {
            setStatus("success");
            if (result.apiKey) setApiKey(result.apiKey);
          } else if (result.status === "expired") {
            setStatus("expired");
          } else if (result.status === "not_found") {
            setStatus("not_found");
          } else {
            console.error("CLI confirm returned:", result.status);
            setStatus("error");
          }
        })
        .catch((err) => {
          console.error("CLI confirm threw:", err);
          setStatus("error");
        });
    } else {
      // Store code and show sign-in button
      sessionStorage.setItem("cli_auth_code", code);
      setStatus("sign_in");
    }
  }, [isLoading, isAuthenticated, user, code]);

  if (!code) {
    return (
      <div className="bg-background flex min-h-svh flex-col items-center justify-center px-6 pb-24">
        <div className="mb-8">
          <Image
            src="/onecli-full-logo.png"
            alt="onecli"
            width={140}
            height={40}
            priority
            className="dark:hidden"
          />
          <Image
            src="/onecli-full-logo-dark.png"
            alt="onecli"
            width={140}
            height={40}
            priority
            className="hidden dark:block"
          />
        </div>
        <div className="mb-8 text-center">
          <h1 className="font-[family-name:var(--font-serif)] text-4xl font-semibold tracking-tight sm:text-5xl">
            Missing session code
          </h1>
          <p className="text-muted-foreground mt-3 flex items-center justify-center gap-1.5 text-lg">
            This page should be opened from the CLI via
            <CopyCommand command="oc auth login" />
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center px-6 pb-24">
      <Link href="/" className="mb-8 block">
        <Image
          src="/onecli-full-logo.png"
          alt="onecli"
          width={140}
          height={40}
          priority
          className="dark:hidden"
        />
        <Image
          src="/onecli-full-logo-dark.png"
          alt="onecli"
          width={140}
          height={40}
          priority
          className="hidden dark:block"
        />
      </Link>

      {status === "loading" || status === "confirming" ? (
        <div className="flex flex-col items-center gap-4 py-20">
          <div className="text-brand h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <p className="text-muted-foreground text-sm">
            {status === "confirming"
              ? "Confirming CLI session..."
              : "Loading..."}
          </p>
        </div>
      ) : status === "sign_in" ? (
        <>
          <div className="mb-8 text-center">
            <h1 className="font-[family-name:var(--font-serif)] text-4xl font-semibold tracking-tight sm:text-5xl">
              Authenticate CLI
            </h1>
            <p className="text-muted-foreground mt-3 text-lg">
              Sign in to connect your
              <br />
              terminal to OneCLI
            </p>
          </div>

          <div className="w-full max-w-sm rounded-2xl border border-border/50 bg-card p-8">
            <Button
              size="lg"
              variant="outline"
              className="w-full gap-2 text-base bg-white text-black hover:bg-gray-100 dark:bg-white dark:text-black dark:hover:bg-gray-100"
              onClick={() => signIn()}
            >
              <GoogleIcon />
              Continue with Google
            </Button>
            <p className="text-muted-foreground mt-4 text-center text-xs whitespace-nowrap">
              By continuing, you acknowledge OneCLI&apos;s{" "}
              <a
                href="https://onecli.sh/privacy"
                className="underline hover:text-foreground"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </>
      ) : status === "success" ? (
        <>
          <div className="mb-8 text-center">
            <CheckCircle2 className="text-brand mx-auto mb-4 h-10 w-10" />
            <h1 className="font-[family-name:var(--font-serif)] text-4xl font-semibold tracking-tight sm:text-5xl">
              CLI authenticated
            </h1>
            {apiKey ? (
              <p className="text-muted-foreground mt-3 text-lg">
                Your API key is ready
              </p>
            ) : (
              <p className="text-muted-foreground mt-3 text-lg">
                You can close this tab and
                <br />
                return to your terminal
              </p>
            )}
          </div>

          {apiKey && (
            <div className="w-full max-w-sm rounded-2xl border border-border/50 bg-card p-8">
              <div className="flex items-center gap-2 rounded-lg bg-background px-3 py-2">
                <code className="text-sm font-mono flex-1 truncate">
                  {apiKey}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(apiKey);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-muted-foreground mt-4 text-center text-xs">
                Paste this in your terminal or give it to your agent.
              </p>
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <Button asChild variant="outline" className="gap-2">
              <Link href="/overview">
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </>
      ) : status === "expired" ? (
        <>
          <div className="mb-8 text-center">
            <XCircle className="text-muted-foreground mx-auto mb-4 h-10 w-10" />
            <h1 className="font-[family-name:var(--font-serif)] text-4xl font-semibold tracking-tight sm:text-5xl">
              Session expired
            </h1>
            <p className="text-muted-foreground mt-3 flex items-center justify-center gap-1.5 text-lg">
              Run
              <CopyCommand command="oc auth login" />
              again to start a new session.
            </p>
          </div>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/overview">
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </>
      ) : status === "not_found" ? (
        <>
          <div className="mb-8 text-center">
            <XCircle className="text-muted-foreground mx-auto mb-4 h-10 w-10" />
            <h1 className="font-[family-name:var(--font-serif)] text-4xl font-semibold tracking-tight sm:text-5xl">
              Session not found
            </h1>
            <p className="text-muted-foreground mt-3 flex items-center justify-center gap-1.5 text-lg">
              Run
              <CopyCommand command="oc auth login" />
              to start a new session.
            </p>
          </div>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/overview">
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </>
      ) : (
        <>
          <div className="mb-8 text-center">
            <XCircle className="text-destructive mx-auto mb-4 h-10 w-10" />
            <h1 className="font-[family-name:var(--font-serif)] text-4xl font-semibold tracking-tight sm:text-5xl">
              Something went wrong
            </h1>
            <p className="text-muted-foreground mt-3 flex items-center justify-center gap-1.5 text-lg">
              Run
              <CopyCommand command="oc auth login" />
              again to try again.
            </p>
          </div>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/overview">
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </>
      )}
    </div>
  );
}

const GoogleIcon = () => (
  <svg
    className="h-4 w-4"
    viewBox="-3 0 262 262"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
      fill="#4285F4"
    />
    <path
      d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
      fill="#34A853"
    />
    <path
      d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
      fill="#FBBC05"
    />
    <path
      d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
      fill="#EB4335"
    />
  </svg>
);
